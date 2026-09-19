import { NextFunction, Response } from "express"
import { AuthRequest } from "../middlewares/auth.middlewares";
import * as notificationService from "../services/notification.service";
import { notificationEmitter } from "../services/notification.emitter";

export async function streamNotifications(req: AuthRequest, res: Response) {
    const userId = req.user!.id;

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        // Sama dengan origin yang dipakai CORS global di app.ts, supaya tidak ada
        // dua sumber kebenaran yang bisa berbeda diam-diam.
        "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:3000",
        "Access-Control-Allow-Credentials": "true",
    });

    const heartbeat = setInterval(() => {
        res.write(": ping\n\n");
    }, 30000);

    const listener = (notification: any) => {
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
    };

    notificationEmitter.on(`user:${userId}`, listener);

    req.on("close", () => {
        clearInterval(heartbeat);
        notificationEmitter.off(`user:${userId}`, listener);
    });
}


//GET /api/v1/notifications/me
export async function getMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const unreadOnly = req.query.unreadOnly === "true";
        const { notifications, unreadNotifications: unreadNotificationCount } = await notificationService.getMyNotifications(req.user!.id, { unreadOnly });

        return res.status(200).json({
            success: true,
            message: "Notifications retrieved successfully",
            data: { notifications, unreadNotificationCount }
        });
    } catch (error) {
        next(error);
    }
}

//POST /api/v1/notifications/:id/read
export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const notifId = Number(req.params.id)
        await notificationService.markAsReadNotificiation(notifId, req.user!.id);

        return res.status(200).json({
            success: true,
            message: "Notification marked as read successfully",
        });
    } catch (error) {
        next(error);
    }
}

//POST /api/v1/notifications/read-all
export async function markAsReadAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {

        const updatedCount = await notificationService.markAsReadAllNotifications(req.user!.id);

        const message = updatedCount > 0
            ? `Successfully marked ${updatedCount} notifications as read`
            : "All notifications are already read";

        return res.status(200).json({
            success: true,
            message: message,
            data: {
                updatedCount
            }
        });
    } catch (error) {
        next(error);
    }
}

//DELETE /api/v1/notifications/:id
export async function deleteNotificationById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const notifId = Number(req.params.id)
        await notificationService.deleteNotificationById(notifId, req.user!.id)
        res.status(204).send()
    } catch (error) {
        next(error);
    }
}