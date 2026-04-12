import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/auth'
import { getPublicProfile, getPublicInventory } from '@/services/userProfileService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { MessageCircle, MapPin, Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ username: string }> }

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params
  const session = await auth()

  const profile = await getPublicProfile(username)
  if (!profile) notFound()

  const isOwner = session?.user?.id === profile.id
  const isPrivate = (profile as { hidden?: boolean }).hidden && !isOwner

  const inventory = isPrivate ? [] : await getPublicInventory(profile.id, session?.user?.id)

  return (
    <div className="max-w-4xl space-y-6">
      {/* Profile header */}
      <div className="rounded-xl border border-zinc-800 p-5 flex items-start gap-4">
        {profile.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt={profile.displayName ?? username}
            width={64} height={64}
            className="rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-brand-600/30 border border-brand-600/50 flex items-center justify-center text-brand-400 font-bold text-xl">
            {(profile.displayName ?? username)[0]?.toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-100">
              {profile.displayName ?? username}
            </h1>
            <span className="text-zinc-500 text-sm">@{username}</span>
            {isPrivate && <Badge variant="default">Private profile</Badge>}
          </div>
          {profile.bio && (
            <p className="text-sm text-zinc-400 mt-1.5 max-w-lg">{profile.bio}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-600">
            {profile.locationCountry && (
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {profile.locationCountry}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {!isOwner && session?.user && profile.allowTradeMessages && (
          <MessageConversationButton recipientId={profile.id} />
        )}
        {isOwner && (
          <Link href="/profile">
            <Button variant="secondary" size="sm">Edit profile</Button>
          </Link>
        )}
      </div>

      {/* Inventory */}
      {!isPrivate && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            {isOwner ? 'Your Inventory' : `${profile.displayName ?? username}'s Cards`}
            <span className="ml-2 text-zinc-600 font-normal normal-case">({inventory.length})</span>
          </h2>

          {inventory.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 text-sm rounded-xl border border-zinc-800">
              No public cards yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="w-full aspect-[2.5/3.5] relative mb-2 rounded overflow-hidden bg-zinc-800">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.cardName} fill className="object-contain" sizes="150px" unoptimized />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs text-center px-2">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    {item.playerName ?? item.cardName}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{item.setName}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {item.rookie && <Badge variant="warning" className="text-xs">RC</Badge>}
                    {item.autograph && <Badge variant="purple" className="text-xs">AUTO</Badge>}
                    {item.isTradeable && <Badge variant="success" className="text-xs">Trade</Badge>}
                  </div>
                  {item.latestMarketPrice && (
                    <p className="text-xs font-mono text-zinc-400 mt-1">
                      {formatCurrency(item.latestMarketPrice)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function MessageConversationButton({ recipientId }: { recipientId: string }) {
  return (
    <form action={async () => {
      'use server'
      // Handled client-side via redirect — see MessagingClient
    }}>
      <Link href={`/messages?newWith=${recipientId}`}>
        <Button size="sm" variant="secondary">
          <MessageCircle size={14} className="mr-1.5" />
          Message
        </Button>
      </Link>
    </form>
  )
}
