import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getMessages, getConversationById } from '@/services/messagingService'
import { MessageThreadClient } from './MessageThreadClient'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ conversationId: string }> }

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [messages, conversation] = await Promise.all([
    getMessages(conversationId, session.user.id).catch(() => null),
    getConversationById(conversationId, session.user.id),
  ])

  if (!messages || !conversation) notFound()

  const otherParticipants = conversation.participants
    .filter((p) => p.userId !== session.user.id)
    .map((p) => p.user)

  return (
    <MessageThreadClient
      conversationId={conversationId}
      initialMessages={messages}
      currentUserId={session.user.id}
      otherParticipants={otherParticipants}
      tradeProposals={conversation.tradeProposals}
    />
  )
}
