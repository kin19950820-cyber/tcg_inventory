import { auth, signOut } from '@/auth'
import { getUnreadCount } from '@/services/notificationService'
import { Sidebar } from './Sidebar'

async function handleSignOut() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const userId = session?.user?.id

  const unreadCount = userId ? await getUnreadCount(userId).catch(() => 0) : 0

  const user = userId
    ? { displayName: session.user.displayName ?? null, username: session.user.username }
    : null

  return (
    <div className="min-h-screen bg-surface text-zinc-100">
      <Sidebar user={user} unreadCount={unreadCount} signOutAction={handleSignOut} />
      <main className="ml-56 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
