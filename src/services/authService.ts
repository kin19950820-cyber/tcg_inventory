import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, _ and -'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'),
  displayName: z.string().max(50).optional(),
})

export type RegisterInput = z.infer<typeof RegisterSchema>

export async function registerUser(input: RegisterInput) {
  const parsed = RegisterSchema.parse(input)

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.email }, select: { id: true } }),
    prisma.user.findUnique({ where: { username: parsed.username }, select: { id: true } }),
  ])

  if (existingEmail) throw new Error('An account with this email already exists')
  if (existingUsername) throw new Error('This username is already taken')

  const passwordHash = await bcrypt.hash(parsed.password, 12)

  return prisma.user.create({
    data: {
      username: parsed.username,
      email: parsed.email,
      passwordHash,
      displayName: parsed.displayName ?? parsed.username,
    },
    select: { id: true, username: true, email: true, displayName: true, createdAt: true },
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, email: true, displayName: true,
      avatarUrl: true, bio: true, favoriteCategories: true,
      locationCountry: true, profileVisibility: true,
      inventoryVisibility: true, allowTradeMessages: true,
      createdAt: true, updatedAt: true,
    },
  })
}

export async function getUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, displayName: true,
      avatarUrl: true, bio: true, locationCountry: true,
      profileVisibility: true, inventoryVisibility: true,
      allowTradeMessages: true, createdAt: true,
    },
  })
}
