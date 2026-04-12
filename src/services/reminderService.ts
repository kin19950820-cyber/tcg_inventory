/**
 * Reminder service — processes product release reminders.
 *
 * Call processReminders() from a scheduled job (cron, Vercel Cron, etc.)
 * or trigger it manually via POST /api/admin/reminders.
 *
 * Reminder timing types supported:
 *   ANNOUNCEMENT        — product just announced
 *   PREORDER_OPEN       — preorder window opens today
 *   PREORDER_REMINDER   — N days before preorder date
 *   RELEASE_DATE        — release day
 *   RELEASE_REMINDER    — N days before release date
 *   RELEASED_TODAY      — product just released (same as RELEASE_DATE)
 */
import { prisma } from '@/lib/prisma'
import { createNotification } from './notificationService'

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export async function processReminders(): Promise<{ created: number; skipped: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const follows = await prisma.userProductFollow.findMany({
    where: { isFollowing: true },
    include: { productRelease: true, user: { select: { id: true } } },
  })

  let created = 0
  let skipped = 0

  for (const follow of follows) {
    const product = follow.productRelease
    if (!product.reminderEligible) continue

    const remindersToCreate: Array<{
      type: string; title: string; body: string; daysOut: number
    }> = []

    // Preorder reminders
    if (follow.remindPreorder && product.preorderDate) {
      const daysUntilPreorder = daysBetween(today, product.preorderDate)
      if (daysUntilPreorder === 0) {
        remindersToCreate.push({
          type: 'PREORDER_REMINDER',
          title: `Preorder opens today: ${product.name}`,
          body: `${product.manufacturer ?? ''} ${product.brand ?? ''} is available to preorder now.`,
          daysOut: 0,
        })
      } else if (daysUntilPreorder === follow.remindDaysBefore) {
        remindersToCreate.push({
          type: 'PREORDER_REMINDER',
          title: `Preorder opens in ${daysUntilPreorder} day${daysUntilPreorder > 1 ? 's' : ''}: ${product.name}`,
          body: `Don't miss the preorder window.`,
          daysOut: daysUntilPreorder,
        })
      }
    }

    // Release reminders
    if (follow.remindRelease && product.releaseDate) {
      const daysUntilRelease = daysBetween(today, product.releaseDate)
      if (daysUntilRelease === 0) {
        remindersToCreate.push({
          type: 'PRODUCT_RELEASED',
          title: `${product.name} releases today!`,
          body: `${product.manufacturer ?? ''} ${product.brand ?? ''} is out now.`,
          daysOut: 0,
        })
      } else if (daysUntilRelease === follow.remindDaysBefore) {
        remindersToCreate.push({
          type: 'RELEASE_REMINDER',
          title: `Releasing in ${daysUntilRelease} day${daysUntilRelease > 1 ? 's' : ''}: ${product.name}`,
          body: `Mark your calendar — ${product.name} drops soon.`,
          daysOut: daysUntilRelease,
        })
      }
    }

    for (const r of remindersToCreate) {
      // Dedup: skip if we already sent this exact notification today
      const exists = await prisma.notification.findFirst({
        where: {
          userId: follow.userId,
          type: r.type,
          relatedId: product.id,
          createdAt: { gte: today, lt: tomorrow },
        },
      })
      if (exists) { skipped++; continue }

      await createNotification({
        userId: follow.userId,
        type: r.type as Parameters<typeof createNotification>[0]['type'],
        title: r.title,
        body: r.body,
        relatedId: product.id,
        relatedType: 'PRODUCT_RELEASE',
      })
      created++
    }
  }

  return { created, skipped }
}

export async function getDashboardReminderData(userId: string) {
  const follows = await prisma.userProductFollow.findMany({
    where: { userId, isFollowing: true },
    include: { productRelease: true },
  })

  const now = new Date()

  const upcoming = follows
    .map((f) => f.productRelease)
    .filter((p) => p.releaseDate && p.releaseDate >= now)
    .sort((a, b) => (a.releaseDate?.getTime() ?? 0) - (b.releaseDate?.getTime() ?? 0))
    .slice(0, 6)

  const preorderSoon = follows
    .map((f) => f.productRelease)
    .filter((p) => p.preorderDate && p.preorderDate >= now)
    .sort((a, b) => (a.preorderDate?.getTime() ?? 0) - (b.preorderDate?.getTime() ?? 0))
    .slice(0, 4)

  const announced = await prisma.productRelease.findMany({
    where: { productStatus: 'ANNOUNCED', reminderEligible: true },
    orderBy: { announcementDate: 'desc' },
    take: 4,
  })

  return { upcoming, preorderSoon, announced, followed: follows }
}
