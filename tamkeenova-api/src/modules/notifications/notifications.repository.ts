import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}


  // Handle create notification
  async createNotification(data: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    reference_id?: string;
    reference_type?: string;
  }) {
    return this.prisma.notifications.create({
      data: {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type || null,
        reference_id: data.reference_id || null,
        reference_type: data.reference_type || null,
        is_read: false,
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        reference_id: true,
        reference_type: true,
        is_read: true,
        created_at: true,
      },
    });
  }


  // Handle get user notifications
  async getUserNotifications(userId: string) {
    return this.prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        reference_id: true,
        reference_type: true,
        is_read: true,
        created_at: true,
      },
    });
  }


  // Handle get notification by id
  async getNotificationById(notificationId: string, userId: string) {
    return this.prisma.notifications.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });
  }


  // Handle mark as read
  async markAsRead(notificationId: string) {
    return this.prisma.notifications.update({
      where: { id: notificationId },
      data: { is_read: true },
      select: {
        id: true,
        is_read: true,
      },
    });
  }


  // Handle mark all as read
  async markAllAsRead(userId: string) {
    return this.prisma.notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });
  }


  // Handle get unread count
  async getUnreadCount(userId: string) {
    return this.prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }


  // Handle get admin users
  async getAdminUsers(): Promise<{ id: string; email: string }[]> {
    const admins = await this.prisma.users.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        is_active: true,
      },
      select: { id: true, email: true },
      orderBy: { created_at: 'asc' },
    });
    return admins;
  }
}
