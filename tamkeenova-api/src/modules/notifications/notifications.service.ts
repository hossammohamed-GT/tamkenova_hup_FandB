import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {

  // Initialize instance
  constructor(private readonly notificationsRepo: NotificationsRepository) {}


  // Handle get my notifications
  async getMyNotifications(userId: string) {
    const notifications = await this.notificationsRepo.getUserNotifications(userId);
    const unreadCount = await this.notificationsRepo.getUnreadCount(userId);

    return {
      data: notifications,
      total: notifications.length,
      unread_count: unreadCount,
    };
  }


  // Handle mark as read
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationsRepo.getNotificationById(
      notificationId,
      userId,
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.notificationsRepo.markAsRead(notificationId);
  }


  // Handle mark all as read
  async markAllAsRead(userId: string) {
    const result = await this.notificationsRepo.markAllAsRead(userId);
    return {
      message: 'All notifications marked as read',
      updated_count: result.count,
    };
  }


  // Handle get unread count
  async getUnreadCount(userId: string) {
    const count = await this.notificationsRepo.getUnreadCount(userId);
    return { unread_count: count };
  }




  // Handle create notification
  async createNotification(data: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    reference_id?: string;
    reference_type?: string;
  }) {
    return this.notificationsRepo.createNotification(data);
  }


  // Handle create bulk notifications
  async createBulkNotifications(
    userIds: string[],
    data: {
      title: string;
      message: string;
      type?: string;
      reference_id?: string;
      reference_type?: string;
    },
  ) {
    const results = [];
    for (const userId of userIds) {
      const notification = await this.notificationsRepo.createNotification({
        user_id: userId,
        ...data,
      });
      results.push(notification);
    }
    return results;
  }


  // Handle get admin users
  async getAdminUsers() {
    return this.notificationsRepo.getAdminUsers();
  }
}
