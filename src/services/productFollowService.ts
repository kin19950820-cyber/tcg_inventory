import { prisma } from '@/lib/prisma'

export interface FollowPreferences {
  remindAnnouncement?: boolean
  remindPreorder?: boolean
  remindRelease?: boolean
  remindDaysBefore?: number
}

export async function followProduct(
  userId: string,
  productReleaseId: string,
  prefs: FollowPreferences = {},
) {
  return prisma.userProductFollow.upsert({
    where: { userId_productReleaseId: { userId, productReleaseId } },
    update: { isFollowing: true, ...prefs },
    create: {
      userId,
      productReleaseId,
      isFollowing: true,
      remindPreorder: prefs.remindPreorder ?? true,
      remindRelease: prefs.remindRelease ?? true,
      remindAnnouncement: prefs.remindAnnouncement ?? false,
      remindDaysBefore: prefs.remindDaysBefore ?? 1,
    },
  })
}

export async function unfollowProduct(userId: string, productReleaseId: string) {
  return prisma.userProductFollow.updateMany({
    where: { userId, productReleaseId },
    data: { isFollowing: false },
  })
}

export async function getFollowedProducts(userId: string) {
  return prisma.userProductFollow.findMany({
    where: { userId, isFollowing: true },
    include: { productRelease: true },
    orderBy: { productRelease: { releaseDate: 'asc' } },
  })
}

export async function getFollowStatus(userId: string, productReleaseId: string) {
  return prisma.userProductFollow.findUnique({
    where: { userId_productReleaseId: { userId, productReleaseId } },
  })
}

export async function getUpcomingReleases(days = 60) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)
  return prisma.productRelease.findMany({
    where: {
      OR: [
        { releaseDate: { gte: new Date(), lte: cutoff } },
        { preorderDate: { gte: new Date(), lte: cutoff } },
        { productStatus: { in: ['ANNOUNCED', 'PREORDER'] } },
      ],
    },
    orderBy: [{ releaseDate: 'asc' }, { preorderDate: 'asc' }],
  })
}

export async function getAllProducts(status?: string) {
  return prisma.productRelease.findMany({
    where: status ? { productStatus: status } : undefined,
    orderBy: [{ productStatus: 'asc' }, { releaseDate: 'asc' }],
  })
}
