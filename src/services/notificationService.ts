import { prisma } from '@/lib/prisma'

export type NotificationType =
  | 'NEW_MESSAGE'
  | 'NEW_TRADE_PROPOSAL'
  | 'TRADE_ACCEPTED'
  | 'TRADE_REJECTED'
  | 'TRADE_COUNTERED'
  | 'TRADE_CANCELLED'
  | 'RELEASE_REMINDER'
  | 'PREORDER_REMINDER'
  | 'ANNOUNCEMENT'
  | 'PRODUCT_RELEASED'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body?: string
  relatedId?: string
  relatedType?: 'CONVERSATION' | 'TRADE_PROPOSAL' | 'PRODUCT_RELEASE'
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: input })
}

export async function getNotifications(userId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } })
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  })
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
}
