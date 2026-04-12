'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function MarkAllReadButton() {
  const router = useRouter()

  const handleClick = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick}>
      Mark all read
    </Button>
  )
}
