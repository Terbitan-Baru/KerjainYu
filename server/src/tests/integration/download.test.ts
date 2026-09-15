import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { cleanDatabase, closeDb } from '../helpers/testDb';
import { registerAndLogin } from '../helpers/auth';

const mockCreateDownloadUrl = vi.fn();

vi.mock('../../services/storage.service', () => ({
    createDownloadUrl: (...args: any[]) => mockCreateDownloadUrl(...args),
    createSubmissionUploadUrl: vi.fn(),
    createUploadUrl: vi.fn(),
    deleteObject: vi.fn(),
    generateObject: vi.fn(),
    verifyUploadedObject: vi.fn().mockResolvedValue({
        exists: true,
        sizeMatches: true,
        actualSize: 123456,
    }),
}));

async function createProject(cookie: string) {
    const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', cookie)
        .send({ project: { title: 'Website Redesign' }, links: [] });
    return res.body.data.id as number;
}

async function inviteAndAccept(leaderCookie: string, projectId: number, username: string) {
    const invitee = await registerAndLogin(username);
    await request(app)
        .post(`/api/v1/projects/${projectId}/invitations`)
        .set('Cookie', leaderCookie)
        .send({ userId: invitee.userId });

    const invitationsRes = await request(app).get('/api/v1/invitations').set('Cookie', invitee.cookie);
    const invitationId = invitationsRes.body.data[0].id;
    await request(app)
        .patch(`/api/v1/invitations/${invitationId}`)
        .set('Cookie', invitee.cookie)
        .send({ status: 'accept' });

    return invitee;
}

async function createTaskAssignedTo(leaderCookie: string, projectId: number, assigneeCookie: string, assigneeId: number) {
    const taskRes = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', leaderCookie)
        .send({ title: 'Setup CI/CD pipeline', isClaimable: true });
    const taskId = taskRes.body.data.id;

    await request(app).patch(`/api/v1/tasks/${taskId}/claim`).set('Cookie', assigneeCookie);
    await request(app).patch(`/api/v1/tasks/${taskId}/ongoing`).set('Cookie', assigneeCookie);

    return taskId;
}

async function createSubmission(assigneeCookie: string, taskId: number) {
    const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/submissions`)
        .set('Cookie', assigneeCookie)
        .send({ note: 'Sudah selesai', contents: [] });
    return res.body.data.id as number;
}

async function createFileAttachment(assigneeCookie: string, submissionId: number) {
    const res = await request(app)
        .post(`/api/v1/submissions/${submissionId}/attachments`)
        .set('Cookie', assigneeCookie)
        .send({
            content: null,
            file: {
                type: 'file',
                objectKey: `submissions/${submissionId}/fake-uuid-report.pdf`,
                fileName: 'report.pdf',
                mimeType: 'application/pdf',
                fileSize: 123456,
            },
        });
    return res.body.data.fileAttachment.id as number;
}

async function createLinkAttachment(assigneeCookie: string, submissionId: number) {
    const res = await request(app)
        .post(`/api/v1/submissions/${submissionId}/attachments`)
        .set('Cookie', assigneeCookie)
        .send({
            content: { type: 'link', content: 'https://figma.com/file/abc' },
            file: null,
        });
    return res.body.data.contentAttachment.id as number;
}

afterAll(async () => {
    await closeDb();
});

describe('GET /api/v1/submissions/:id/attachments/:attachmentId/download-url', () => {
    beforeEach(async () => {
        await cleanDatabase();
        mockCreateDownloadUrl.mockReset();
        mockCreateDownloadUrl.mockResolvedValue('https://fake-bucket.s3.amazonaws.com/signed-download-url');
    });

    it('should return a download URL for a file attachment (assignee)', async () => {
        const leader = await registerAndLogin('budiman');
        const projectId = await createProject(leader.cookie);
        const member = await inviteAndAccept(leader.cookie, projectId, 'sari');
        const taskId = await createTaskAssignedTo(leader.cookie, projectId, member.cookie, member.userId);
        const submissionId = await createSubmission(member.cookie, taskId);
        const attachmentId = await createFileAttachment(member.cookie, submissionId);

        const res = await request(app)
            .get(`/api/v1/submissions/${submissionId}/attachments/${attachmentId}/download-url`)
            .set('Cookie', member.cookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.downloadUrl).toBe('https://fake-bucket.s3.amazonaws.com/signed-download-url');
        expect(res.body.data.fileName).toBe('report.pdf');
        expect(res.body.data.mimeType).toBe('application/pdf');

        // pastikan storage service dipanggil dengan objectKey yang benar
        expect(mockCreateDownloadUrl).toHaveBeenCalledWith(
            expect.stringContaining(`submissions/${submissionId}/`)
        );
    });

    it('should allow other project members (not just the assignee) to get the download URL', async () => {
        const leader = await registerAndLogin('budiman');
        const projectId = await createProject(leader.cookie);
        const member = await inviteAndAccept(leader.cookie, projectId, 'sari');
        const taskId = await createTaskAssignedTo(leader.cookie, projectId, member.cookie, member.userId);
        const submissionId = await createSubmission(member.cookie, taskId);
        const attachmentId = await createFileAttachment(member.cookie, submissionId);

        // leader (bukan assignee) tetap bisa akses karena dia member project yang sama
        const res = await request(app)
            .get(`/api/v1/submissions/${submissionId}/attachments/${attachmentId}/download-url`)
            .set('Cookie', leader.cookie);

        expect(res.status).toBe(200);
        expect(res.body.data.downloadUrl).toBeDefined();
    });

    it('should reject a user who is not a member of the project', async () => {
        const leader = await registerAndLogin('budiman');
        const projectId = await createProject(leader.cookie);
        const member = await inviteAndAccept(leader.cookie, projectId, 'sari');
        const taskId = await createTaskAssignedTo(leader.cookie, projectId, member.cookie, member.userId);
        const submissionId = await createSubmission(member.cookie, taskId);
        const attachmentId = await createFileAttachment(member.cookie, submissionId);

        const { cookie: strangerCookie } = await registerAndLogin('bukan_member');

        const res = await request(app)
            .get(`/api/v1/submissions/${submissionId}/attachments/${attachmentId}/download-url`)
            .set('Cookie', strangerCookie);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
        expect(mockCreateDownloadUrl).not.toHaveBeenCalled();
    });

    it('should reject when the attachment is a link/text type (no downloadable file)', async () => {
        const leader = await registerAndLogin('budiman');
        const projectId = await createProject(leader.cookie);
        const member = await inviteAndAccept(leader.cookie, projectId, 'sari');
        const taskId = await createTaskAssignedTo(leader.cookie, projectId, member.cookie, member.userId);
        const submissionId = await createSubmission(member.cookie, taskId);
        const attachmentId = await createLinkAttachment(member.cookie, submissionId);

        const res = await request(app)
            .get(`/api/v1/submissions/${submissionId}/attachments/${attachmentId}/download-url`)
            .set('Cookie', member.cookie);

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
        expect(mockCreateDownloadUrl).not.toHaveBeenCalled();
    });

    it('should return not found for a non-existent submission', async () => {
        const { cookie } = await registerAndLogin('budiman');

        const res = await request(app)
            .get('/api/v1/submissions/999999/attachments/1/download-url')
            .set('Cookie', cookie);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return not found for a non-existent attachment', async () => {
        const leader = await registerAndLogin('budiman');
        const projectId = await createProject(leader.cookie);
        const member = await inviteAndAccept(leader.cookie, projectId, 'sari');
        const taskId = await createTaskAssignedTo(leader.cookie, projectId, member.cookie, member.userId);
        const submissionId = await createSubmission(member.cookie, taskId);

        const res = await request(app)
            .get(`/api/v1/submissions/${submissionId}/attachments/999999/download-url`)
            .set('Cookie', member.cookie);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return not found when attachment belongs to a different submission', async () => {
        const leader = await registerAndLogin('budiman');
        const projectId = await createProject(leader.cookie);
        const member = await inviteAndAccept(leader.cookie, projectId, 'sari');

        const taskId1 = await createTaskAssignedTo(leader.cookie, projectId, member.cookie, member.userId);
        const submissionId1 = await createSubmission(member.cookie, taskId1);
        const attachmentId1 = await createFileAttachment(member.cookie, submissionId1);

        const taskId2 = await createTaskAssignedTo(leader.cookie, projectId, member.cookie, member.userId);
        const submissionId2 = await createSubmission(member.cookie, taskId2);

        // pakai attachmentId dari submission 1, tapi URL nunjuk ke submission 2
        const res = await request(app)
            .get(`/api/v1/submissions/${submissionId2}/attachments/${attachmentId1}/download-url`)
            .set('Cookie', member.cookie);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject request without authentication', async () => {
        const res = await request(app).get('/api/v1/submissions/1/attachments/1/download-url');

        expect(res.status).toBe(401);
    });

    it('should reject a non-numeric submission id', async () => {
        const { cookie } = await registerAndLogin('budiman');

        const res = await request(app)
            .get('/api/v1/submissions/abc/attachments/1/download-url')
            .set('Cookie', cookie);

        expect(res.status).toBe(400);
    });
});