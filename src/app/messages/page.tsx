import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getConversations } from '@/services/messagingService'
import { ConversationList } from '@/components/messages/ConversationList'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const conversations = await getConversations(session.user.id)

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-zinc-100 mb-4">Messages</h1>
      <ConversationList
        conversations={conversations}
        currentUserId={session.user.id}
      />
    </div>
  )
}
