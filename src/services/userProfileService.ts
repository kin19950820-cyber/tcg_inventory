import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const UpdateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  locationCountry: z.string().max(60).optional(),
  favoriteCategories: z.array(z.string()).optional(),
  profileVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  inventoryVisibility: z.enum(['PRIVATE', 'PUBLIC', 'TRADEABLE_ONLY']).optional(),
  allowTradeMessages: z.boolean().optional(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const data = UpdateProfileSchema.parse(input)
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      favoriteCategories: data.favoriteCategories
        ? JSON.stringify(data.favoriteCategories)
        : undefined,
    },
    select: {
      id: true, username: true, email: true, displayName: true,
      avatarUrl: true, bio: true, locationCountry: true,
      profileVisibility: true, inventoryVisibility: true,
      allowTradeMessages: true,
    },
  })
}

export async function getPublicProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, displayName: true, avatarUrl: true,
      bio: true, locationCountry: true, profileVisibility: true,
      inventoryVisibility: true, allowTradeMessages: true, createdAt: true,
    },
  })
  if (!user) return null
  if (user.profileVisibility === 'PRIVATE') return { ...user, hidden: true }
  return user
}

export async function getPublicInventory(userId: string, viewerUserId?: string) {
  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { inventoryVisibility: true },
  })
  if (!owner) return []

  const isOwner = viewerUserId === userId
  if (!isOwner && owner.inventoryVisibility === 'PRIVATE') return []

  const where =
    isOwner
      ? { userId }
      : owner.inventoryVisibility === 'TRADEABLE_ONLY'
        ? { userId, isTradeable: true, quantity: { gt: 0 } }
        : { userId, isPublic: true, quantity: { gt: 0 } }

  return prisma.inventoryItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, cardName: true, setName: true, cardNumber: true,
      category: true, game: true, playerName: true, brand: true,
      parallel: true, gradingCompany: true, grade: true, conditionRaw: true,
      imageUrl: true, latestMarketPrice: true, quantity: true,
      isTradeable: true, isPublic: true, rookie: true, autograph: true,
    },
  })
}
