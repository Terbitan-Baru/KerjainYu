import { registry } from './components';
import { z } from '../lib/zod-extended';
import { idParams } from '../schemas/id.schema';

const notificationSchema = z.object({
    id: z.number(),
    userId: z.number(),
    type: z.string().openapi({ example: "member_invited" }),
    referenceType: z.string().nullable().openapi({ example: "project" }),
    referenceId: z.number().nullable().openapi({ example: 5 }),
    message: z.string().openapi({ example: "Kamu diundang bergabung ke project \"Website Redesign\"" }),
    isRead: z.boolean(),
    createdAt: z.string(),
}).openapi("NotificationResponse");

registry.registerPath({
    method: "get",
    path: "/api/v1/notifications/stream",
    tags: ["Notifications"],
    summary: "Subscribe to real-time notifications via Server-Sent Events (SSE)",
    description: "Keeps the HTTP connection open and pushes new notifications as `data: {...}\\n\\n` events as they happen. Client should use the browser `EventSource` API with `withCredentials: true`. Connection automatically closes when the accessToken (15 min) expires — client is responsible for reconnecting after refresh.",
    security: [{ cookieAuth: [] }],
    responses: {
        200: { description: "SSE stream opened. Not a typical JSON response — see description." },
        401: { description: "Not authenticated" },
    },
});

registry.registerPath({
    method: "get",
    path: "/api/v1/notifications/me",
    tags: ["Notifications"],
    summary: "Get current user's notifications",
    description: "Returns the latest 50 notifications, newest first. Pass `unreadOnly=true` to only return unread ones; omitting it (or any other value) returns all types mixed, unfiltered, same as before this param existed.",
    security: [{ cookieAuth: [] }],
    request: {
        query: z.object({
            unreadOnly: z.string().optional().openapi({ example: "true", description: "Set to \"true\" to only return unread notifications." }),
        }),
    },
    responses: {
        200: {
            description: "List of notifications with unread count",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean(),
                        message: z.string(),
                        data: z.array(notificationSchema),
                        unreadNotificationCount: z.number(),
                    }),
                },
            },
        },
        401: { description: "Not authenticated" },
    },
});

registry.registerPath({
    method: "post",
    path: "/api/v1/notifications/{id}/read",
    tags: ["Notifications"],
    summary: "Mark a notification as read",
    description: "Idempotent — calling this on an already-read notification returns 200 with the notification unchanged, not an error.",
    security: [{ cookieAuth: [] }],
    request: { params: idParams },
    responses: {
        200: { description: "Notification marked as read (or was already read)" },
        401: { description: "Not authenticated" },
        403: { description: "This notification does not belong to you" },
        404: { description: "Notification not found" },
    },
});

registry.registerPath({
    method: "post",
    path: "/api/v1/notifications/read-all",
    tags: ["Notifications"],
    summary: "Mark all of the current user's unread notifications as read",
    security: [{ cookieAuth: [] }],
    responses: {
        200: {
            description: "All unread notifications marked as read",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean(),
                        message: z.string(),
                        data: z.object({ updatedCount: z.number() }),
                    }),
                },
            },
        },
        401: { description: "Not authenticated" },
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/v1/notifications/{id}",
    tags: ["Notifications"],
    summary: "Delete a notification",
    security: [{ cookieAuth: [] }],
    request: { params: idParams },
    responses: {
        204: { description: "Notification deleted successfully" },
        401: { description: "Not authenticated" },
        403: { description: "This notification does not belong to you" },
        404: { description: "Notification not found" },
    },
});