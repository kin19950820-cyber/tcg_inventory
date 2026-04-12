import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getUserById } from '@/services/authService'
import { ProfileForm } from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await getUserById(session.user.id)
  if (!user) redirect('/login')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Profile</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Manage your account and visibility settings.
        </p>
      </div>

      <ProfileForm user={user} />
    </div>
  )
}
