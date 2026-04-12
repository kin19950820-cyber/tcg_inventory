import { prisma } from '@/lib/prisma'
import { createNotification } from './notificationService'
import { sendMessage } from './messagingService'

export interface TradeItemInput {
  inventoryItemId: string
  ownerUserId: string
  quantity: number
}

export interface CreateTradeProposalInput {
  conversationId: string
  proposerUserId: string
  recipientUserId: string
  offeredItems: TradeItemInput[]    // items proposer is giving
  requestedItems: TradeItemInput[]  // items proposer wants from recipient
  cashAdjustmentAmount?: number
  note?: string
}

export async function createTradeProposal(input: CreateTradeProposalInput) {
  const {
    conversationId, proposerUserId, recipientUserId,
    offeredItems, requestedItems, cashAdjustmentAmount = 0, note,
  } = input

  const allItems = [...offeredItems, ...requestedItems]

  // Validate ownership and quantity for each item
  for (const item of allItems) {
    const inv = await prisma.inventoryItem.findUnique({
      where: { id: item.inventoryItemId },
      select: { userId: true, quantity: true, isTradeable: true, cardName: true,
                latestMarketPrice: true, playerName: true },
    })
    if (!inv) throw new Error(`Item ${item.inventoryItemId} not found`)
    if (inv.userId !== item.ownerUserId)
      throw new Error(`Item does not belong to specified owner`)
    if (item.quantity > inv.quantity)
      throw new Error(`Requested quantity exceeds available stock for ${inv.cardName}`)
    if (!inv.isTradeable)
      throw new Error(`Item "${inv.cardName}" is not marked as tradeable`)
  }

  // Snapshot item details at proposal time
  const buildItems = async (items: TradeItemInput[]) =>
    Promise.all(
      items.map(async (item) => {
        const inv = await prisma.inventoryItem.findUniqueOrThrow({
          where: { id: item.inventoryItemId },
          select: { cardName: true, playerName: true, latestMarketPrice: true },
        })
        return {
          inventoryItemId: item.inventoryItemId,
          ownerUserId: item.ownerUserId,
          quantity: item.quantity,
          snapshotName: inv.playerName ?? inv.cardName,
          snapshotValue: inv.latestMarketPrice,
        }
      }),
    )

  const [offered, requested] = await Promise.all([
    buildItems(offeredItems),
    buildItems(requestedItems),
  ])

  const proposal = await prisma.tradeProposal.create({
    data: {
      conversationId,
      proposerUserId,
      recipientUserId,
      cashAdjustmentAmount,
      note,
      items: { create: [...offered, ...requested] },
    },
    include: { items: { include: { inventoryItem: true } } },
  })

  // Post a system message summarising the proposal
  const offeredNames = offered.map((i) => i.snapshotName).join(', ')
  const requestedNames = requested.map((i) => i.snapshotName).join(', ')
  await sendMessage({
    conversationId,
    senderUserId: proposerUserId,
    body: `📦 Trade proposal: offering [${offeredNames}] for [${requestedNames}]${cashAdjustmentAmount ? ` + $${cashAdjustmentAmount.toFixed(2)} cash` : ''}.`,
    messageType: 'SYSTEM',
  })

  // Notify recipient
  const proposer = await prisma.user.findUnique({
    where: { id: proposerUserId },
    select: { displayName: true, username: true },
  })
  await createNotification({
    userId: recipientUserId,
    type: 'NEW_TRADE_PROPOSAL',
    title: `Trade proposal from ${proposer?.displayName ?? proposer?.username}`,
    body: note ?? `Offering ${offeredNames} for ${requestedNames}`,
    relatedId: proposal.id,
    relatedType: 'TRADE_PROPOSAL',
  })

  return proposal
}

export async function updateProposalStatus(
  proposalId: string,
  status: 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'CANCELLED',
  actorUserId: string,
) {
  const proposal = await prisma.tradeProposal.findUniqueOrThrow({
    where: { id: proposalId },
    select: { proposerUserId: true, recipientUserId: true, status: true, conversationId: true },
  })

  if (proposal.status !== 'PENDING' && proposal.status !== 'COUNTERED')
    throw new Error('Proposal is no longer open')

  const canAct =
    (status === 'CANCELLED' && actorUserId === proposal.proposerUserId) ||
    (['ACCEPTED', 'REJECTED', 'COUNTERED'].includes(status) && actorUserId === proposal.recipientUserId)

  if (!canAct) throw new Error('Not authorised to perform this action on the proposal')

  const updated = await prisma.tradeProposal.update({
    where: { id: proposalId },
    data: { status },
  })

  // Post system message
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { displayName: true, username: true },
  })
  const label: Record<string, string> = {
    ACCEPTED: '✅ Trade accepted', REJECTED: '❌ Trade rejected',
    COUNTERED: '↩️ Trade countered', CANCELLED: '🚫 Trade cancelled',
  }
  await sendMessage({
    conversationId: proposal.conversationId,
    senderUserId: actorUserId,
    body: `${label[status]} by ${actor?.displayName ?? actor?.username}.`,
    messageType: 'SYSTEM',
  })

  // Notify the other party
  const notifyUserId =
    actorUserId === proposal.proposerUserId ? proposal.recipientUserId : proposal.proposerUserId
  const notifType: Record<string, 'TRADE_ACCEPTED' | 'TRADE_REJECTED' | 'TRADE_COUNTERED' | 'TRADE_CANCELLED'> = {
    ACCEPTED: 'TRADE_ACCEPTED', REJECTED: 'TRADE_REJECTED',
    COUNTERED: 'TRADE_COUNTERED', CANCELLED: 'TRADE_CANCELLED',
  }
  await createNotification({
    userId: notifyUserId,
    type: notifType[status],
    title: `Trade ${status.toLowerCase()} by ${actor?.displayName ?? actor?.username}`,
    relatedId: proposalId,
    relatedType: 'TRADE_PROPOSAL',
  })

  return updated
}

export async function getProposal(proposalId: string) {
  return prisma.tradeProposal.findUnique({
    where: { id: proposalId },
    include: {
      proposer: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      recipient: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      items: {
        include: {
          inventoryItem: {
            select: {
              id: true, cardName: true, playerName: true, setName: true,
              imageUrl: true, latestMarketPrice: true, category: true,
            },
          },
          owner: { select: { id: true, username: true, displayName: true } },
        },
      },
    },
  })
}
