import { Knex } from "knex";
import * as notificationRepo from "../database/repositories/notification.repository"
import { notificationEmitter } from "./notification.emitter";
import { ForbiddenError, NotFoundError } from "../errors/AppError";


export async function notifyUser(data: {
    userId: number,
    type: string,
    referenceType?: string,
    referenceId?: number,
    message: string;
}, trx?: Knex.Transaction) {
    const notification = await notificationRepo.createNotification(data, trx)
    notificationEmitter.emit(`user:${data.userId}`, notification);
    return notification
}

//GET /api/v1/notifications/me 
export async function getMyNotifications(userId: number, options?: { unreadOnly?: boolean }) {
    const notifications = await notificationRepo.getNotificationsByUser(userId, { unreadOnly: options?.unreadOnly })
    const unreadNotifications = await notificationRepo.getUnreadCount(userId)
    return { notifications, unreadNotifications }
}

//POST /api/v1/notifications/:id/read
export async function markAsReadNotificiation(notifId: number, userId: number) {
    const notification = await notificationRepo.getNotificationById(notifId)
    if (!notification) {
        throw new NotFoundError("Notification is not found")
    }
    if (notification.userId != userId) {
        throw new ForbiddenError("This notification is not belong to you")
    }
    if (notification.isRead == true) {
        return notification
    }
    return await notificationRepo.markAsRead(notifId)
}

//POST /api/v1/notifications/read-all
export async function markAsReadAllNotifications(userId: number) {
    return await notificationRepo.markAllAsRead(userId)
}

//DELETE /api/v1/notifications/:id
export async function deleteNotificationById(notifId: number, userId: number) {
    const notification = await notificationRepo.getNotificationById(notifId)
    if (!notification) {
        throw new NotFoundError("Notification is not found")
    }
    if (notification.userId != userId) {
        throw new ForbiddenError("This notification does not belong to you")
    }
    return await notificationRepo.deleteNotification(notifId)
}
