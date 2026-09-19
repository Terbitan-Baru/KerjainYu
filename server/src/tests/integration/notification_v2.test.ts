import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { db } from '../../database/db';
import { cleanDatabase, closeDb } from '../helpers/testDb';
import { registerAndLogin } from '../helpers/auth';

async function createProject(cookie: string) {
    const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', cookie)
        .send({ project: { title: 'Website Redesign' }, links: [] });
    return res.body.data.id as number;
}

// Cara paling sederhana buat generate notifikasi nyata untuk testing:
// pakai efek samping dari invite member, yang udah kita pastikan
// memicu notifyUser() di test sebelumnya.
async function triggerNotificationForUser(leaderCookie: string, projectId: number, targetUserId: number) {
    return request(app)
        .post(`/api/v1/projects/${projectId}/invitations`)
        .set('Cookie', leaderCookie)
        .send({ userId: targetUserId });
}

afterAll(async () => {
    await closeDb();
});

describe('GET /api/v1/notifications/me', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    it('should return an empty list and zero unread count when there are no notifications', async () => {
        const { cookie } = await registerAndLogin("budiman");

        const res = await request(app).get('/api/v1/notifications/me').set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({
            notifications: [],
            unreadNotificationCount: 0
        });

        expect(res.body.data.unreadNotificationCount).toBe(0);
    });

    it('should return notifications belonging to the current user with correct unread count', async () => {
        const leader = await registerAndLogin("budiman");
        const projectId = await createProject(leader.cookie);
        const invitee = await registerAndLogin("sari");

        await triggerNotificationForUser(leader.cookie, projectId, invitee.userId);

        const res = await request(app).get('/api/v1/notifications/me').set('Cookie', invitee.cookie);
        expect(res.status).toBe(200);
        expect(res.body.data.notifications.length).toBe(1);
        expect(res.body.data.notifications[0].type).toBe('member_invited');
        expect(res.body.data.notifications[0].isRead).toBe(false);
        expect(res.body.data.unreadNotificationCount).toBe(1);
    });

    it('should not show notifications belonging to a different user', async () => {
        const leader = await registerAndLogin("budiman");
        const projectId = await createProject(leader.cookie);
        const invitee = await registerAndLogin("sari");
        await triggerNotificationForUser(leader.cookie, projectId, invitee.userId);

        const { cookie: unrelatedCookie } = await registerAndLogin("citra");
        const res = await request(app).get('/api/v1/notifications/me').set('Cookie', unrelatedCookie);

        expect(res.status).toBe(200);
        expect(res.body.data.notifications.length).toBe(0);
    });

    it('should reject request without authentication', async () => {
        const res = await request(app).get('/api/v1/notifications/me');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/v1/notifications/:id/read', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    it('should mark a notification as read', async () => {
        const leader = await registerAndLogin("budiman");
        const projectId = await createProject(leader.cookie);
        const invitee = await registerAndLogin("sari");
        await triggerNotificationForUser(leader.cookie, projectId, invitee.userId);

        const listRes = await request(app).get('/api/v1/notifications/me').set('Cookie', invitee.cookie);
        const notificationId = listRes.body.data.notifications[0].id;
        const res = await request(app)
            .post(`/api/v1/notifications/${notificationId}/read`)
            .set('Cookie', invitee.cookie);

        expect(res.status).toBe(200);

        const row = await db('notifications').where({ id: notificationId }).first();
        expect(row.isRead).toBe(true);
    });

    it('should be idempotent — marking an already-read notification returns 200, not an error', async () => {
        const leader = await registerAndLogin("budiman");
        const projectId = await createProject(leader.cookie);
        const invitee = await registerAndLogin("sari");
        await triggerNotificationForUser(leader.cookie, projectId, invitee.userId);

        const listRes = await request(app).get('/api/v1/notifications/me').set('Cookie', invitee.cookie);
        const notificationId = listRes.body.data.notifications[0].id;

        await request(app).post(`/api/v1/notifications/${notificationId}/read`).set('Cookie', invitee.cookie);

        const secondAttempt = await request(app)
            .post(`/api/v1/notifications/${notificationId}/read`)
            .set('Cookie', invitee.cookie);

        expect(secondAttempt.status).toBe(200);
    });

    it('should reject marking a notification belonging to a different user', async () => {
        const leader = await registerAndLogin("budiman");
        const projectId = await createProject(leader.cookie);
        const invitee = await registerAndLogin("sari");
        await triggerNotificationForUser(leader.cookie, projectId, invitee.userId);

        const listRes = await request(app).get('/api/v1/notifications/me').set('Cookie', invitee.cookie);
        const notificationId = listRes.body.data.notifications[0].id;

        const { cookie: strangerCookie } = await registerAndLogin("citra");
        const res = await request(app)
            .post(`/api/v1/notifications/${notificationId}/read`)
            .set('Cookie', strangerCookie);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return not found for a non-existent notification', async () => {
        const { cookie } = await registerAndLogin("budiman");

        const res = await request(app)
            .post('/api/v1/notifications/999999/read')
            .set('Cookie', cookie);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject an invalid (non-numeric) notification id', async () => {
        const { cookie } = await registerAndLogin("budiman");

        const res = await request(app)
            .post('/api/v1/notifications/abc/read')
            .set('Cookie', cookie);

        expect(res.status).toBe(400);
    });

    it('should reject request without authentication', async () => {
        const res = await request(app).post('/api/v1/notifications/1/read');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/v1/notifications/read-all', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    it('should mark all unread notifications as read and return the count', async () => {
        const leader = await registerAndLogin("budiman");
        const invitee = await registerAndLogin("sari");

        // trigger 3 notifikasi sekaligus lewat 3 project berbeda
        for (let i = 0; i < 3; i++) {
            const projectId = await createProject(leader.cookie);
            await triggerNotificationForUser(leader.cookie, projectId, invitee.userId);
        }

        const res = await request(app).post('/api/v1/notifications/read-all').set('Cookie', invitee.cookie);
        expect(res.status).toBe(200);
        expect(res.body.data.updatedCount).toBe(3);

        const unreadRows = await db('notifications').where({ userId: invitee.userId, isRead: false });
        expect(unreadRows.length).toBe(0);
    });

    it('should return updatedCount 0 when there is nothing to mark', async () => {
        const { cookie } = await registerAndLogin("budiman");

        const res = await request(app).post('/api/v1/notifications/read-all').set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.data.updatedCount).toBe(0);
    });

    it('should not affect another user\'s notifications', async () => {
        const leader = await registerAndLogin("budiman");
        const projectId = await createProject(leader.cookie);
        const invitee = await registerAndLogin("sari");
        await triggerNotificationForUser(leader.cookie, projectId, invitee.userId);

        const { cookie: unrelatedCookie } = await registerAndLogin("citra");
        await request(app).post('/api/v1/notifications/read-all').set('Cookie', unrelatedCookie);

        const inviteeNotif = await db('notifications').where({ userId: invitee.userId }).first();
        expect(inviteeNotif.isRead).toBe(false); // tidak ikut ke-mark oleh user lain
    });

    it('should reject request without authentication', async () => {
        const res = await request(app).post('/api/v1/notifications/read-all');
        expect(res.status).toBe(401);
    });
});

describe('DELETE /api/v1/notifications/:id', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    it('should delete a notification successfully', async () => {
        const leader = await registerAndLogin("budiman");
        const projectId = await createProject(leader.cookie);
        const invitee = await registerAndLogin("sari");
        await triggerNotificationForUser(leader.cookie, projectId, invitee.userId);

        const listRes = await request(app).get('/api/v1/notifications/me').set('Cookie', invitee.cookie);
        const notificationId = listRes.body.data.notifications[0].id;
        const res = await request(app)
            .delete(`/api/v1/notifications/${notificationId}`)
            .set('Cookie', invitee.cookie);

        expect(res.status).toBe(204);

        const row = await db('notifications').where({ id: notificationId }).first();
        expect(row).toBeUndefined();
    });

    it('should reject deleting a notification belonging to a different user', async () => {
        const leader = await registerAndLogin("budiman");
        const projectId = await createProject(leader.cookie);
        const invitee = await registerAndLogin("sari");
        await triggerNotificationForUser(leader.cookie, projectId, invitee.userId);

        const listRes = await request(app).get('/api/v1/notifications/me').set('Cookie', invitee.cookie);
        const notificationId = listRes.body.data.notifications[0].id;

        const { cookie: strangerCookie } = await registerAndLogin("citra");
        const res = await request(app)
            .delete(`/api/v1/notifications/${notificationId}`)
            .set('Cookie', strangerCookie);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');

        // pastikan notifikasi TIDAK ikut kehapus meski request-nya ditolak
        const row = await db('notifications').where({ id: notificationId }).first();
        expect(row).toBeDefined();
    });

    it('should return not found for a non-existent notification', async () => {
        const { cookie } = await registerAndLogin("budiman");

        const res = await request(app)
            .delete('/api/v1/notifications/999999')
            .set('Cookie', cookie);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject request without authentication', async () => {
        const res = await request(app).delete('/api/v1/notifications/1');
        expect(res.status).toBe(401);
    });
});