'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SellModal } from '@/components/inventory/SellModal'
import type { InventoryItemWithStats } from '@/types'

export function SellButtonClient({ item }: { item: InventoryItemWithStats }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        Sell
      </Button>
      <SellModal
        item={item}
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => { setOpen(false); router.refresh() }}
      />
    </>
  )
}
