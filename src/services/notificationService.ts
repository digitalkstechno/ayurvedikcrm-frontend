import { apiGet, apiPut, endPointApi } from './api';

export interface NotificationSender {
  _id: string;
  name?: string;
  email?: string;
}

export interface NotificationItem {
  _id: string;
  recipient?: string;
  sender?: NotificationSender;
  title: string;
  message: string;
  module?: string;
  category?: string;
  type?: string;
  entityId?: string;
  actorName?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationResponse {
  data: NotificationItem[];
  unreadCount: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasMore?: boolean;
}

export const fetchNotifications = async (page = 1, limit = 20): Promise<NotificationResponse> => {
  const { data } = await apiGet(endPointApi.notifications, { page, limit });
  return data;
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await apiPut(endPointApi.notifications, `${id}/read`, {});
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await apiPut(endPointApi.notificationReadAll, '', {});
};
