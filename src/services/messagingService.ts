import { prisma } from '@/lib/prisma'
import { createNotification } from './notificationService'

export async function getOrCreateConversation(userIdA: string, userIdB: string) {
  // Look for an existing 1:1 conversation between the two users
  const existing = await prisma.conversation.findFirst({
    where: {
      participants: { every: { userId: { in: [userIdA, userIdB] } } },
    },
    include: {
      participants: { select: { userId: true } },
    },
  })

  if (existing && existing.participants.length === 2) return existing

  // Create new conversation
  return prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: userIdA }, { userId: userIdB }],
      },
    },
    include: {
      participants: { select: { userId: true } },
    },
  })
}

export async function getConversations(userId: string) {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, username: true, displayName: true, avatarUrl: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: 'desc' } },
  })

  return participations.map((p) => ({
    ...p.conversation,
    otherParticipants: p.conversation.participants
      .filter((pt) => pt.userId !== userId)
      .map((pt) => pt.user),
    lastMessage: p.conversation.messages[0] ?? null,
    unreadCount: 0, // TODO: track per-user read state
  }))
}

export async function getMessages(conversationId: string, userId: string) {
  // Verify participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
  if (!participant) throw new Error('Not a participant in this conversation')

  return prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function sendMessage(input: {
  conversationId: string
  senderUserId: string
  body: string
  messageType?: 'TEXT' | 'SYSTEM'
}) {
  const { conversationId, senderUserId, body, messageType = 'TEXT' } = input

  // Verify sender is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderUserId } },
  })
  if (!participant) throw new Error('Not a participant in this conversation')

  const [message] = await Promise.all([
    prisma.message.create({
      data: { conversationId, senderUserId, body, messageType },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ])

  // Notify other participants
  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: senderUserId } },
    include: { user: { select: { id: true, displayName: true } } },
  })

  const sender = await prisma.user.findUnique({
    where: { id: senderUserId },
    select: { displayName: true, username: true },
  })

  await Promise.all(
    others.map((p) =>
      createNotification({
        userId: p.userId,
        type: 'NEW_MESSAGE',
        title: `New message from ${sender?.displayName ?? sender?.username ?? 'Someone'}`,
        body: body.slice(0, 100),
        relatedId: conversationId,
        relatedType: 'CONVERSATION',
      }),
    ),
  )

  return message
}

export async function getConversationById(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
  if (!participant) return null

  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      },
      tradeProposals: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              inventoryItem: true,
              owner: { select: { id: true, username: true, displayName: true } },
            },
          },
        },
      },
    },
  })
}
