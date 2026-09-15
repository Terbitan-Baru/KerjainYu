import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
    vi
} from "vitest";
import request from "supertest";

import app from "../../app";
import { db } from "../../database/db";

import {
    registerAndLogin,
} from "../helpers/auth";

import {
    createProject,
    inviteAndAccept,
} from "../helpers/project";

import {
    createTask,
    assignTask,
} from "../helpers/task";

import {
    createSubmission,
    reviewSubmission,
} from "../helpers/submission";

import {
    cleanDatabase,
    closeDb,
} from "../helpers/testDb";

import {
    GetObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";

import {
    s3,
    STORAGE_BUCKET,
} from "../../config/storage";
import {
    updateAttachment,
    MAX_ATTACHMENTS_PER_SUBMISSION,
} from "../../services/submission.service";

// ============================================================
// HELPERS
// ============================================================

async function createTaskWithSubmission() {
    const leader = await registerAndLogin(
        `attachment_leader_${Date.now()}`,
    );

    const project = await createProject(
        leader.cookie,
    );

    const projectId =
        project.projectResult.body.data.id;

    const member = await inviteAndAccept(
        leader.cookie,
        projectId,
        `attachment_member_${Date.now()}`,
    );

    const taskRes = await createTask(
        leader.cookie,
        projectId,
        {
            title: "Attachment Submission Task",
            isClaimable: false,
        },
    );

    const taskId =
        taskRes.body.data.id;

    await assignTask(
        leader.cookie,
        taskId,
        member.userId,
    );

    await db("tasks")
        .where({ id: taskId })
        .update({
            status: "ongoing",
        });

    const submissionRes =
        await createSubmission(
            member.cookie,
            taskId,
            {
                note: "Submission for attachment testing.",
            },
        );

    expect(submissionRes.status).toBe(201);

    return {
        leader,
        member,
        projectId,
        taskId,
        submissionId:
            Number(submissionRes.body.data.id),
    };
}

// ============================================================
// REQUEST PRESIGNED UPLOAD URL
// ============================================================

async function requestUploadUrl(
    cookie: string,
    submissionId: number,
    file: {
        type: "file" | "image";
        fileName: string;
        mimeType: string;
        fileSize: number;
    },
) {
    return request(app)
        .post(
            `/api/v1/submissions/${submissionId}/attachments/upload-url`,
        )
        .set("Cookie", cookie)
        .send(file);
}

// ============================================================
// REGISTER FILE ATTACHMENT
// ============================================================

async function registerFileAttachment(
    cookie: string,
    submissionId: number,
    attachment: {
        type: "file" | "image";
        objectKey: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
    },
) {
    return request(app)
        .post(
            `/api/v1/submissions/${submissionId}/attachments`,
        )
        .set("Cookie", cookie)
        .send({
            content: null,
            file: attachment,
        });
}

// ============================================================
// REGISTER CONTENT ATTACHMENT
// ============================================================

async function registerContentAttachment(
    cookie: string,
    submissionId: number,
    content: {
        type: "text" | "link";
        content: string;
    },
) {
    return request(app)
        .post(
            `/api/v1/submissions/${submissionId}/attachments`,
        )
        .set("Cookie", cookie)
        .send({
            content,
            file: null,
        });
}

// ============================================================
// UPLOAD REAL FILE TO OBJECT STORAGE (used to satisfy B2's
// storage-verification step before registering metadata)
// ============================================================

async function uploadRealFile(
    uploadUrl: string,
    sizeInBytes: number,
    contentType = "application/pdf",
) {
    const body = Buffer.alloc(sizeInBytes, "a");
    const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body,
    });
    if (!res.ok) {
        throw new Error(`Upload gagal saat setup test: ${res.status}`);
    }
}

// ============================================================
// TEST SUITE
// ============================================================

afterAll(async () => {
    await closeDb();
});
describe(
    "Submission Attachment Integration",
    () => {
        beforeEach(async () => {
            await cleanDatabase();
        });


        // ====================================================
        // POST /attachments
        // CONTENT ATTACHMENT
        // ====================================================

        describe(
            "POST /api/v1/submissions/:id/attachments - Content",
            () => {
                it(
                    "should create a text content attachment",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await registerContentAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "text",
                                    content:
                                        "This is my submission.",
                                },
                            );

                        expect(res.status).toBe(201);

                        expect(
                            res.body.success,
                        ).toBe(true);

                        expect(
                            res.body.data.contentAttachment,
                        ).toEqual(
                            expect.objectContaining({
                                submissionId,
                                type: "text",
                                content:
                                    "This is my submission.",
                            }),
                        );

                        expect(
                            res.body.data.fileAttachment,
                        ).toBeNull();

                        const attachments =
                            await db(
                                "submission_attachments",
                            ).where({
                                submissionId,
                            });

                        expect(
                            attachments,
                        ).toHaveLength(1);

                        expect(
                            attachments[0],
                        ).toEqual(
                            expect.objectContaining({
                                submissionId:
                                    String(
                                        submissionId,
                                    ),
                                type: "text",
                                content:
                                    "This is my submission.",
                            }),
                        );
                    },
                );

                it(
                    "should create a link content attachment",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await registerContentAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "link",
                                    content:
                                        "https://figma.com/design/test",
                                },
                            );

                        expect(res.status).toBe(201);

                        expect(
                            res.body.success,
                        ).toBe(true);

                        expect(
                            res.body.data.contentAttachment,
                        ).toEqual(
                            expect.objectContaining({
                                submissionId,
                                type: "link",
                                content:
                                    "https://figma.com/design/test",
                            }),
                        );

                        expect(
                            res.body.data.fileAttachment,
                        ).toBeNull();
                    },
                );

                it(
                    "should reject empty content",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await registerContentAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "text",
                                    content: "",
                                },
                            );

                        expect(res.status).toBe(400);

                        expect(
                            res.body.error.code,
                        ).toBe(
                            "VALIDATION_ERROR",
                        );
                    },
                );
            },
        );

        // ====================================================
        // POST /attachments
        // FILE ATTACHMENT
        // ====================================================

        describe(
            "POST /api/v1/submissions/:id/attachments - File",
            () => {
                it(
                    "should register uploaded file metadata",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        // ------------------------------------
                        // 1. Request presigned URL
                        // ------------------------------------

                        const uploadRes =
                            await requestUploadUrl(
                                member.cookie,
                                submissionId,
                                {
                                    type: "file",
                                    fileName:
                                        "report.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize:
                                        2458123,
                                },
                            );

                        expect(
                            uploadRes.status,
                        ).toBe(200);

                        expect(
                            uploadRes.body.success,
                        ).toBe(true);

                        const {
                            uploadUrl,
                            objectKey,
                        } =
                            uploadRes.body.data;

                        expect(
                            uploadUrl,
                        ).toEqual(
                            expect.any(String),
                        );

                        expect(
                            objectKey,
                        ).toMatch(
                            new RegExp(
                                `^submissions/${submissionId}/`,
                            ),
                        );

                        // ------------------------------------
                        // 2. Upload the real file (required
                        //    since createAttachment now verifies
                        //    the object actually exists in storage)
                        // ------------------------------------

                        await uploadRealFile(
                            uploadUrl,
                            2458123,
                            "application/pdf",
                        );

                        // ------------------------------------
                        // 3. Register metadata
                        // ------------------------------------

                        const attachmentRes =
                            await registerFileAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "file",
                                    objectKey,
                                    fileName:
                                        "report.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize:
                                        2458123,
                                },
                            );

                        expect(
                            attachmentRes.status,
                        ).toBe(201);

                        expect(
                            attachmentRes.body.success,
                        ).toBe(true);

                        expect(
                            attachmentRes.body.data
                                .contentAttachment,
                        ).toBeNull();

                        expect(
                            attachmentRes.body.data
                                .fileAttachment,
                        ).toEqual(
                            expect.objectContaining({
                                submissionId,
                                type: "file",
                                objectKey,
                                fileName:
                                    "report.pdf",
                                mimeType:
                                    "application/pdf",
                                fileSize:
                                    2458123,
                            }),
                        );
                    },
                );

                it(
                    "should reject object key belonging to another submission",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await registerFileAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "file",
                                    objectKey:
                                        "submissions/999999/fake.pdf",
                                    fileName:
                                        "fake.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize: 1000,
                                },
                            );

                        expect(res.status).toBe(403);

                        expect(
                            res.body.error.code,
                        ).toBe("FORBIDDEN");
                    },
                );

                it(
                    "should reject attachment from non-assignee",
                    async () => {
                        const {
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const stranger =
                            await registerAndLogin(
                                `attachment_stranger_${Date.now()}`,
                            );

                        const res =
                            await registerFileAttachment(
                                stranger.cookie,
                                submissionId,
                                {
                                    type: "file",
                                    objectKey:
                                        `submissions/${submissionId}/fake.pdf`,
                                    fileName:
                                        "fake.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize: 1000,
                                },
                            );

                        expect(res.status).toBe(403);

                        expect(
                            res.body.error.code,
                        ).toBe("FORBIDDEN");
                    },
                );

                it(
                    "should reject attachment on approved submission",
                    async () => {
                        const {
                            leader,
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const reviewRes =
                            await request(app)
                                .patch(
                                    `/api/v1/submissions/${submissionId}/review`,
                                )
                                .set(
                                    "Cookie",
                                    leader.cookie,
                                )
                                .send({
                                    reviewStatus:
                                        "approved",
                                });

                        expect(
                            reviewRes.status,
                        ).toBe(200);

                        const res =
                            await registerFileAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "file",
                                    objectKey:
                                        `submissions/${submissionId}/fake.pdf`,
                                    fileName:
                                        "fake.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize: 1000,
                                },
                            );

                        expect(res.status).toBe(409);

                        expect(
                            res.body.error.code,
                        ).toBe("CONFLICT");
                    },
                );
            },
        );

        // ====================================================
        // VALIDATION
        // ====================================================

        describe(
            "POST /api/v1/submissions/:id/attachments - Validation",
            () => {
                it(
                    "should reject when both content and file are null",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await request(app)
                                .post(
                                    `/api/v1/submissions/${submissionId}/attachments`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                )
                                .send({
                                    content: null,
                                    file: null,
                                });

                        expect(res.status).toBe(400);

                        expect(
                            res.body.error.code,
                        ).toBe(
                            "VALIDATION_ERROR",
                        );
                    },
                );

                it(
                    "should reject request without content and file",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await request(app)
                                .post(
                                    `/api/v1/submissions/${submissionId}/attachments`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                )
                                .send({});

                        expect(res.status).toBe(400);

                        expect(
                            res.body.error.code,
                        ).toBe(
                            "VALIDATION_ERROR",
                        );
                    },
                );
            },
        );

        // ====================================================
        // MULTIPLE ATTACHMENTS
        // ====================================================

        describe(
            "Multiple attachments",
            () => {
                it(
                    "should allow multiple attachments on one submission",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const textRes =
                            await registerContentAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "text",
                                    content:
                                        "My submission text.",
                                },
                            );

                        expect(
                            textRes.status,
                        ).toBe(201);

                        const linkRes =
                            await registerContentAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "link",
                                    content:
                                        "https://figma.com/design/test",
                                },
                            );

                        expect(
                            linkRes.status,
                        ).toBe(201);

                        const uploadRes =
                            await requestUploadUrl(
                                member.cookie,
                                submissionId,
                                {
                                    type: "file",
                                    fileName:
                                        "report.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize: 1000,
                                },
                            );

                        expect(
                            uploadRes.status,
                        ).toBe(200);

                        const {
                            uploadUrl,
                            objectKey,
                        } =
                            uploadRes.body.data;

                        await uploadRealFile(
                            uploadUrl,
                            1000,
                            "application/pdf",
                        );

                        const fileRes =
                            await registerFileAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "file",
                                    objectKey,
                                    fileName:
                                        "report.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize: 1000,
                                },
                            );

                        expect(
                            fileRes.status,
                        ).toBe(201);

                        const attachments =
                            await db(
                                "submission_attachments",
                            ).where({
                                submissionId,
                            });

                        expect(
                            attachments,
                        ).toHaveLength(3);

                        expect(
                            attachments.map(
                                (attachment) =>
                                    attachment.type,
                            ),
                        ).toEqual(
                            expect.arrayContaining([
                                "text",
                                "link",
                                "file",
                            ]),
                        );
                    },
                );
            },
        );

        // ====================================================
        // GET /attachments
        // ====================================================

        describe(
            "GET /api/v1/submissions/:id/attachments",
            () => {
                it(
                    "should return all attachments for a submission",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        // Text
                        const textRes =
                            await registerContentAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "text",
                                    content:
                                        "This is my submission",
                                },
                            );

                        expect(
                            textRes.status,
                        ).toBe(201);

                        // Link
                        const linkRes =
                            await registerContentAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "link",
                                    content:
                                        "https://figma.com/design/test",
                                },
                            );

                        expect(
                            linkRes.status,
                        ).toBe(201);

                        const res =
                            await request(app)
                                .get(
                                    `/api/v1/submissions/${submissionId}/attachments`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                );

                        expect(
                            res.status,
                        ).toBe(200);

                        expect(
                            res.body.success,
                        ).toBe(true);

                        expect(
                            res.body.data,
                        ).toHaveLength(2);

                        expect(
                            res.body.data,
                        ).toEqual(
                            expect.arrayContaining([
                                expect.objectContaining({
                                    submissionId,
                                    type: "text",
                                    content:
                                        "This is my submission",
                                }),

                                expect.objectContaining({
                                    submissionId,
                                    type: "link",
                                    content:
                                        "https://figma.com/design/test",
                                }),
                            ]),
                        );
                    },
                );

                it(
                    "should return empty array when submission has no attachments",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await request(app)
                                .get(
                                    `/api/v1/submissions/${submissionId}/attachments`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                );

                        expect(
                            res.status,
                        ).toBe(200);

                        expect(
                            res.body.success,
                        ).toBe(true);

                        expect(
                            res.body.data,
                        ).toEqual([]);
                    },
                );

                it(
                    "should reject unauthenticated request",
                    async () => {
                        const {
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await request(app).get(
                                `/api/v1/submissions/${submissionId}/attachments`,
                            );

                        expect(
                            res.status,
                        ).toBe(401);
                    },
                );

                it(
                    "should reject non-existent submission",
                    async () => {
                        const {
                            member,
                        } =
                            await createTaskWithSubmission();
                        const submissionId = Number(9999999)
                        const res =
                            await request(app)
                                .get(
                                    `/api/v1/submissions/${submissionId}/attachments`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                );

                        expect(
                            res.status,
                        ).toBe(404);
                    },
                );
            },
        );

        // ====================================================
        // DELETE /attachments/:attachmentId
        // ====================================================

        describe(
            "DELETE /api/v1/submissions/:id/attachments/:attachmentId",
            () => {
                it(
                    "should delete text attachment",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const createRes =
                            await registerContentAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "text",
                                    content:
                                        "Delete me",
                                },
                            );

                        expect(
                            createRes.status,
                        ).toBe(201);

                        const attachmentId =
                            createRes.body.data
                                .contentAttachment.id;

                        const deleteRes =
                            await request(app)
                                .delete(
                                    `/api/v1/submissions/${submissionId}/attachments/${attachmentId}`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                );

                        expect(
                            deleteRes.status,
                        ).toBe(204);

                        const afterDelete =
                            await request(app)
                                .get(
                                    `/api/v1/submissions/${submissionId}/attachments`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                );

                        expect(
                            afterDelete.status,
                        ).toBe(200);

                        expect(
                            afterDelete.body.data,
                        ).toEqual([]);
                    },
                );

                it(
                    "should delete file attachment",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const uploadRes =
                            await requestUploadUrl(
                                member.cookie,
                                submissionId,
                                {
                                    type: "file",
                                    fileName:
                                        "delete-me.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize: 1000,
                                },
                            );

                        expect(
                            uploadRes.status,
                        ).toBe(200);

                        const {
                            uploadUrl,
                            objectKey,
                        } =
                            uploadRes.body.data;

                        await uploadRealFile(
                            uploadUrl,
                            1000,
                            "application/pdf",
                        );

                        const createRes =
                            await registerFileAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "file",
                                    objectKey,
                                    fileName:
                                        "delete-me.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize: 1000,
                                },
                            );

                        expect(
                            createRes.status,
                        ).toBe(201);

                        const attachmentId =
                            createRes.body.data
                                .fileAttachment.id;

                        const deleteRes =
                            await request(app)
                                .delete(
                                    `/api/v1/submissions/${submissionId}/attachments/${attachmentId}`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                );

                        expect(
                            deleteRes.status,
                        ).toBe(204);

                        const afterDelete =
                            await request(app)
                                .get(
                                    `/api/v1/submissions/${submissionId}/attachments`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                );

                        expect(
                            afterDelete.body.data,
                        ).toEqual([]);
                    },
                );

                it(
                    "should reject deleting attachment belonging to another submission",
                    async () => {
                        const first =
                            await createTaskWithSubmission();

                        const second =
                            await createTaskWithSubmission();

                        const createRes =
                            await registerContentAttachment(
                                first.member.cookie,
                                first.submissionId,
                                {
                                    type: "text",
                                    content:
                                        "Private attachment",
                                },
                            );

                        expect(
                            createRes.status,
                        ).toBe(201);

                        const attachmentId =
                            createRes.body.data
                                .contentAttachment.id;

                        const deleteRes =
                            await request(app)
                                .delete(
                                    `/api/v1/submissions/${second.submissionId}/attachments/${attachmentId}`,
                                )
                                .set(
                                    "Cookie",
                                    second.member.cookie,
                                );

                        expect(
                            deleteRes.status,
                        ).toBe(404);
                    },
                );

                it(
                    "should reject deleting attachment from unauthorized member",
                    async () => {
                        const {
                            leader,
                            member,
                            projectId,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const unauthorizedMember =
                            await inviteAndAccept(
                                leader.cookie,
                                projectId,
                                `unauthorized_${Date.now()}`,
                            );

                        const createRes =
                            await registerContentAttachment(
                                member.cookie,
                                submissionId,
                                {
                                    type: "text",
                                    content:
                                        "Private attachment",
                                },
                            );

                        expect(
                            createRes.status,
                        ).toBe(201);

                        const attachmentId =
                            createRes.body.data
                                .contentAttachment.id;

                        const deleteRes =
                            await request(app)
                                .delete(
                                    `/api/v1/submissions/${submissionId}/attachments/${attachmentId}`,
                                )
                                .set(
                                    "Cookie",
                                    unauthorizedMember.cookie,
                                );

                        expect(
                            deleteRes.status,
                        ).toBe(403);
                    },
                );
                it("should delete file attachment from both database and object storage", async () => {
                    const {
                        member,
                        submissionId,
                    } = await createTaskWithSubmission();

                    const fileContent = Buffer.from(
                        "File to be deleted",
                        "utf-8",
                    );

                    const fileName = "delete-me.txt";
                    const mimeType = "text/plain";

                    // 1. Get presigned URL
                    const uploadUrlRes = await requestUploadUrl(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            fileName,
                            mimeType,
                            fileSize: fileContent.length,
                        },
                    );

                    expect(uploadUrlRes.status).toBe(200);

                    const {
                        uploadUrl,
                        objectKey,
                    } = uploadUrlRes.body.data;

                    // 2. Upload actual file
                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: {
                            "Content-Type": mimeType,
                        },
                        body: fileContent,
                    });

                    expect(uploadRes.ok).toBe(true);

                    // 3. Verify object exists
                    const headBeforeDelete =
                        await s3.send(
                            new HeadObjectCommand({
                                Bucket: STORAGE_BUCKET,
                                Key: objectKey,
                            }),
                        );

                    expect(headBeforeDelete.ContentLength).toBe(
                        fileContent.length,
                    );

                    // 4. Register metadata
                    const attachmentRes =
                        await registerFileAttachment(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                objectKey,
                                fileName,
                                mimeType,
                                fileSize: fileContent.length,
                            },
                        );
                    expect(attachmentRes.status).toBe(201);

                    const attachmentId =
                        attachmentRes.body.data.fileAttachment.id;
                    // 5. Delete attachment
                    const deleteRes =
                        await request(app)
                            .delete(
                                `/api/v1/submissions/${submissionId}/attachments/${attachmentId}`,
                            )
                            .set(
                                "Cookie",
                                member.cookie,
                            );
                    expect(deleteRes.status).toBe(204);

                    // 6. Verify DB metadata is gone
                    const dbAttachment =
                        await db("submission_attachments")
                            .where({ id: attachmentId })
                            .first();

                    expect(dbAttachment).toBeUndefined();

                    // 7. Verify object is gone
                    await expect(
                        s3.send(
                            new HeadObjectCommand({
                                Bucket: STORAGE_BUCKET,
                                Key: objectKey,
                            }),
                        ),
                    ).rejects.toThrow();
                });
                it(
                    "should reject unauthenticated delete",
                    async () => {
                        const {
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await request(app)
                                .delete(
                                    `/api/v1/submissions/${submissionId}/attachments/1`,
                                );

                        expect(
                            res.status,
                        ).toBe(401);
                    },
                );

                it(
                    "should reject non-existent attachment",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const res =
                            await request(app)
                                .delete(
                                    `/api/v1/submissions/${submissionId}/attachments/999999`,
                                )
                                .set(
                                    "Cookie",
                                    member.cookie,
                                );

                        expect(
                            res.status,
                        ).toBe(404);
                    },
                );

                it(
                    "should return 404 (not 403) for a non-existent attachment even when requester has no leader/assignee authorization",
                    async () => {
                        const {
                            projectId,
                            leader,
                            submissionId,
                        } =
                            await createTaskWithSubmission();

                        const stranger =
                            await inviteAndAccept(
                                leader.cookie,
                                projectId,
                                `attachment_del_stranger_${Date.now()}`,
                            );

                        // Stranger is a project member but neither the
                        // assignee of the task nor the project leader —
                        // if authorization ran before the existence check,
                        // this could surface as 403 instead of 404.
                        const res =
                            await request(app)
                                .delete(
                                    `/api/v1/submissions/${submissionId}/attachments/999999`,
                                )
                                .set(
                                    "Cookie",
                                    stranger.cookie,
                                );

                        expect(res.status).toBe(404);
                    },
                );

                it(
                    "should reject deleting an attachment that belongs to a different submission with 404",
                    async () => {
                        const first =
                            await createTaskWithSubmission();
                        const second =
                            await createTaskWithSubmission();

                        const createRes =
                            await registerContentAttachment(
                                first.member.cookie,
                                first.submissionId,
                                {
                                    type: "text",
                                    content:
                                        "Belongs to submission #1",
                                },
                            );

                        expect(createRes.status).toBe(201);

                        const attachmentId =
                            createRes.body.data
                                .contentAttachment.id;

                        const res =
                            await request(app)
                                .delete(
                                    `/api/v1/submissions/${second.submissionId}/attachments/${attachmentId}`,
                                )
                                .set(
                                    "Cookie",
                                    second.member.cookie,
                                );

                        expect(res.status).toBe(404);
                    },
                );
            },

        );


        // ====================================================
        // AUTHENTICATION
        // ====================================================

        describe(
            "Authentication",
            () => {
                it(
                    "should reject unauthenticated upload URL request",
                    async () => {
                        const res =
                            await request(app)
                                .post(
                                    "/api/v1/submissions/1/attachments/upload-url",
                                )
                                .send({
                                    type: "file",
                                    fileName:
                                        "report.pdf",
                                    mimeType:
                                        "application/pdf",
                                    fileSize: 1000,
                                });

                        expect(
                            res.status,
                        ).toBe(401);
                    },
                );

                it(
                    "should reject unauthenticated attachment registration",
                    async () => {
                        const res =
                            await request(app)
                                .post(
                                    "/api/v1/submissions/1/attachments",
                                )
                                .send({
                                    content: {
                                        type: "text",
                                        content:
                                            "Unauthenticated",
                                    },
                                    file: null,
                                });

                        expect(
                            res.status,
                        ).toBe(401);
                    },
                );
            },
        );

        // ====================================================
        // B1 — CONTENT-LENGTH ENFORCEMENT ON PRESIGNED UPLOAD URL
        // ====================================================

        describe(
            "POST /api/v1/submissions/:id/attachments/upload-url — Content-Length enforcement",
            () => {
                it(
                    "should accept a real PUT whose body size matches the signed fileSize",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } = await createTaskWithSubmission();

                        const uploadRes = await requestUploadUrl(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                fileName: "matching-size.txt",
                                mimeType: "text/plain",
                                fileSize: 1000,
                            },
                        );

                        expect(uploadRes.status).toBe(200);

                        const { uploadUrl } = uploadRes.body.data;

                        const putRes = await fetch(uploadUrl, {
                            method: "PUT",
                            headers: { "Content-Type": "text/plain" },
                            body: Buffer.alloc(1000, "a"),
                        });

                        expect(putRes.ok).toBe(true);
                    },
                );

                it(
                    "should reject a real PUT whose body size differs from the signed fileSize",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } = await createTaskWithSubmission();

                        const uploadRes = await requestUploadUrl(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                fileName: "mismatched-size.txt",
                                mimeType: "text/plain",
                                fileSize: 1000,
                            },
                        );

                        expect(uploadRes.status).toBe(200);

                        const { uploadUrl } = uploadRes.body.data;

                        // Body is a different size than what was signed
                        // (Content-Length mismatch) — MinIO/S3 must reject
                        // this at the protocol level.
                        const putRes = await fetch(uploadUrl, {
                            method: "PUT",
                            headers: { "Content-Type": "text/plain" },
                            body: Buffer.alloc(5000, "x"),
                        });

                        expect(putRes.ok).toBe(false);
                    },
                );
            },
        );

        // ====================================================
        // B2 — STORAGE VERIFICATION BEFORE SAVING METADATA
        // ====================================================

        describe(
            "POST /api/v1/submissions/:id/attachments — storage verification",
            () => {
                it(
                    "should reject registering metadata when the object was never uploaded",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } = await createTaskWithSubmission();

                        const uploadRes = await requestUploadUrl(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                fileName: "never-uploaded.pdf",
                                mimeType: "application/pdf",
                                fileSize: 1234,
                            },
                        );

                        expect(uploadRes.status).toBe(200);

                        const { objectKey } = uploadRes.body.data;

                        // Deliberately skip the PUT to object storage.
                        const registerRes = await registerFileAttachment(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                objectKey,
                                fileName: "never-uploaded.pdf",
                                mimeType: "application/pdf",
                                fileSize: 1234,
                            },
                        );

                        expect(registerRes.status).toBe(409);
                        expect(registerRes.body.error.code).toBe("CONFLICT");
                    },
                );

                it(
                    "should reject registering metadata when claimed fileSize does not match the uploaded object's actual size",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } = await createTaskWithSubmission();

                        const uploadRes = await requestUploadUrl(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                fileName: "size-mismatch.pdf",
                                mimeType: "application/pdf",
                                fileSize: 5000,
                            },
                        );

                        expect(uploadRes.status).toBe(200);

                        const { uploadUrl, objectKey } = uploadRes.body.data;

                        await uploadRealFile(uploadUrl, 5000, "application/pdf");

                        // Claim a different size than what was actually
                        // uploaded to storage.
                        const registerRes = await registerFileAttachment(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                objectKey,
                                fileName: "size-mismatch.pdf",
                                mimeType: "application/pdf",
                                fileSize: 100,
                            },
                        );

                        expect(registerRes.status).toBe(409);
                        expect(registerRes.body.error.code).toBe("CONFLICT");
                    },
                );

                it(
                    "should succeed when the uploaded object exists and its size matches the claim (happy path regression)",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } = await createTaskWithSubmission();

                        const uploadRes = await requestUploadUrl(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                fileName: "size-match.pdf",
                                mimeType: "application/pdf",
                                fileSize: 3000,
                            },
                        );

                        expect(uploadRes.status).toBe(200);

                        const { uploadUrl, objectKey } = uploadRes.body.data;

                        await uploadRealFile(uploadUrl, 3000, "application/pdf");

                        const registerRes = await registerFileAttachment(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                objectKey,
                                fileName: "size-match.pdf",
                                mimeType: "application/pdf",
                                fileSize: 3000,
                            },
                        );

                        expect(registerRes.status).toBe(201);
                        expect(registerRes.body.success).toBe(true);
                    },
                );

                it(
                    "should reject updating an attachment's file when the new object was never uploaded",
                    async () => {
                        const {
                            member,
                            submissionId,
                        } = await createTaskWithSubmission();

                        // Create a valid file attachment first.
                        const initialUploadRes = await requestUploadUrl(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                fileName: "initial.pdf",
                                mimeType: "application/pdf",
                                fileSize: 500,
                            },
                        );
                        expect(initialUploadRes.status).toBe(200);
                        const {
                            uploadUrl: initialUploadUrl,
                            objectKey: initialObjectKey,
                        } = initialUploadRes.body.data;
                        await uploadRealFile(initialUploadUrl, 500, "application/pdf");

                        const createRes = await registerFileAttachment(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                objectKey: initialObjectKey,
                                fileName: "initial.pdf",
                                mimeType: "application/pdf",
                                fileSize: 500,
                            },
                        );
                        expect(createRes.status).toBe(201);

                        const attachmentId =
                            createRes.body.data.fileAttachment.id;

                        // Request a new presigned URL but never upload to it.
                        const newUploadRes = await requestUploadUrl(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                fileName: "replacement.pdf",
                                mimeType: "application/pdf",
                                fileSize: 700,
                            },
                        );
                        expect(newUploadRes.status).toBe(200);
                        const { objectKey: newObjectKey } = newUploadRes.body.data;

                        const updateRes = await request(app)
                            .patch(
                                `/api/v1/submissions/${submissionId}/attachments/${attachmentId}`,
                            )
                            .set("Cookie", member.cookie)
                            .send({
                                file: {
                                    type: "file",
                                    objectKey: newObjectKey,
                                    fileName: "replacement.pdf",
                                    mimeType: "application/pdf",
                                    fileSize: 700,
                                },
                            });

                        expect(updateRes.status).toBe(409);
                        expect(updateRes.body.error.code).toBe("CONFLICT");
                    },
                );
            },
        );
    },
);

// ============================================================
// B3 — TYPE vs MIMETYPE CONSISTENCY
// ============================================================

describe(
    "type/mimeType consistency validation (B3)",
    () => {
        describe("POST /api/v1/submissions/:id/attachments/upload-url", () => {
            it(
                "should reject type 'image' with a non-image mimeType",
                async () => {
                    const { member, submissionId } =
                        await createTaskWithSubmission();

                    const res = await requestUploadUrl(
                        member.cookie,
                        submissionId,
                        {
                            type: "image",
                            fileName: "disguised.pdf",
                            mimeType: "application/pdf",
                            fileSize: 1000,
                        },
                    );

                    expect(res.status).toBe(400);
                },
            );

            it(
                "should reject type 'file' with an image mimeType",
                async () => {
                    const { member, submissionId } =
                        await createTaskWithSubmission();

                    const res = await requestUploadUrl(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            fileName: "disguised.png",
                            mimeType: "image/png",
                            fileSize: 1000,
                        },
                    );

                    expect(res.status).toBe(400);
                },
            );

            it(
                "should accept type 'image' with a matching image mimeType",
                async () => {
                    const { member, submissionId } =
                        await createTaskWithSubmission();

                    const res = await requestUploadUrl(
                        member.cookie,
                        submissionId,
                        {
                            type: "image",
                            fileName: "screenshot.png",
                            mimeType: "image/png",
                            fileSize: 1000,
                        },
                    );

                    expect(res.status).toBe(200);
                },
            );
        });

        describe("POST /api/v1/submissions/:id/attachments", () => {
            it(
                "should reject registering type 'image' with a non-image mimeType",
                async () => {
                    const { member, submissionId } =
                        await createTaskWithSubmission();

                    const uploadRes = await requestUploadUrl(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            fileName: "actually-a-pdf.pdf",
                            mimeType: "application/pdf",
                            fileSize: 500,
                        },
                    );
                    expect(uploadRes.status).toBe(200);
                    const { uploadUrl, objectKey } = uploadRes.body.data;
                    await uploadRealFile(uploadUrl, 500, "application/pdf");

                    // Claim `type: "image"` at registration time even
                    // though the uploaded content is a PDF.
                    const registerRes = await registerFileAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "image",
                            objectKey,
                            fileName: "actually-a-pdf.pdf",
                            mimeType: "application/pdf",
                            fileSize: 500,
                        },
                    );

                    expect(registerRes.status).toBe(400);
                },
            );

            it(
                "should successfully register a real image with type 'image' and a matching mimeType",
                async () => {
                    const { member, submissionId } =
                        await createTaskWithSubmission();

                    const uploadRes = await requestUploadUrl(
                        member.cookie,
                        submissionId,
                        {
                            type: "image",
                            fileName: "screenshot.png",
                            mimeType: "image/png",
                            fileSize: 800,
                        },
                    );
                    expect(uploadRes.status).toBe(200);
                    const { uploadUrl, objectKey } = uploadRes.body.data;
                    await uploadRealFile(uploadUrl, 800, "image/png");

                    const registerRes = await registerFileAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "image",
                            objectKey,
                            fileName: "screenshot.png",
                            mimeType: "image/png",
                            fileSize: 800,
                        },
                    );

                    expect(registerRes.status).toBe(201);
                    expect(
                        registerRes.body.data.fileAttachment.type,
                    ).toBe("image");
                },
            );
        });

        describe(
            "PATCH /api/v1/submissions/:id/attachments/:attachmentId",
            () => {
                it(
                    "should reject updating a file attachment with mismatched type/mimeType",
                    async () => {
                        const { member, submissionId } =
                            await createTaskWithSubmission();

                        const initialUploadRes = await requestUploadUrl(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                fileName: "initial.pdf",
                                mimeType: "application/pdf",
                                fileSize: 500,
                            },
                        );
                        expect(initialUploadRes.status).toBe(200);
                        const {
                            uploadUrl: initialUploadUrl,
                            objectKey: initialObjectKey,
                        } = initialUploadRes.body.data;
                        await uploadRealFile(
                            initialUploadUrl,
                            500,
                            "application/pdf",
                        );

                        const createRes = await registerFileAttachment(
                            member.cookie,
                            submissionId,
                            {
                                type: "file",
                                objectKey: initialObjectKey,
                                fileName: "initial.pdf",
                                mimeType: "application/pdf",
                                fileSize: 500,
                            },
                        );
                        expect(createRes.status).toBe(201);

                        const attachmentId =
                            createRes.body.data.fileAttachment.id;

                        const updateRes = await request(app)
                            .patch(
                                `/api/v1/submissions/${submissionId}/attachments/${attachmentId}`,
                            )
                            .set("Cookie", member.cookie)
                            .send({
                                file: {
                                    type: "image",
                                    objectKey: initialObjectKey,
                                    fileName: "initial.pdf",
                                    mimeType: "application/pdf",
                                    fileSize: 500,
                                },
                            });

                        expect(updateRes.status).toBe(400);
                    },
                );
            },
        );
    },
);

// ============================================================
// B4 — MAX ATTACHMENTS PER SUBMISSION
// ============================================================

describe(
    "POST /api/v1/submissions/:id/attachments — max attachment limit (B4)",
    () => {
        it(
            "should allow attachments up to the configured maximum",
            async () => {
                const {
                    member,
                    submissionId,
                } = await createTaskWithSubmission();

                for (let i = 0; i < MAX_ATTACHMENTS_PER_SUBMISSION; i++) {
                    const res = await registerContentAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "text",
                            content: `Attachment number ${i}`,
                        },
                    );
                    expect(res.status).toBe(201);
                }
            },
        );

        it(
            "should reject creating an attachment once the maximum is reached",
            async () => {
                const {
                    member,
                    submissionId,
                } = await createTaskWithSubmission();

                for (let i = 0; i < MAX_ATTACHMENTS_PER_SUBMISSION; i++) {
                    const res = await registerContentAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "text",
                            content: `Attachment number ${i}`,
                        },
                    );
                    expect(res.status).toBe(201);
                }

                const overflowRes = await registerContentAttachment(
                    member.cookie,
                    submissionId,
                    {
                        type: "text",
                        content: "This one should be rejected",
                    },
                );

                expect(overflowRes.status).toBe(409);
                expect(overflowRes.body.error.code).toBe("CONFLICT");

                // Pastikan attachment yang sudah ada sebelumnya tidak ikut
                // bertambah gara-gara request yang ditolak.
                const attachmentsRes = await request(app)
                    .get(`/api/v1/submissions/${submissionId}/attachments`)
                    .set("Cookie", member.cookie);
                expect(attachmentsRes.body.data.length).toBe(
                    MAX_ATTACHMENTS_PER_SUBMISSION,
                );
            },
        );

        it(
            "should count a single request with both content and file as two attachments toward the limit",
            async () => {
                const {
                    member,
                    submissionId,
                } = await createTaskWithSubmission();

                // Fill up to exactly one slot away from the maximum.
                for (
                    let i = 0;
                    i < MAX_ATTACHMENTS_PER_SUBMISSION - 1;
                    i++
                ) {
                    const res = await registerContentAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "text",
                            content: `Attachment number ${i}`,
                        },
                    );
                    expect(res.status).toBe(201);
                }

                // Only 1 slot remains, but this request tries to add 2
                // (content + file) in one call — it must be rejected
                // entirely (no partial insert), not just capped.
                const uploadRes = await requestUploadUrl(
                    member.cookie,
                    submissionId,
                    {
                        type: "file",
                        fileName: "overflow.pdf",
                        mimeType: "application/pdf",
                        fileSize: 100,
                    },
                );
                expect(uploadRes.status).toBe(200);
                const { uploadUrl, objectKey } = uploadRes.body.data;
                await uploadRealFile(uploadUrl, 100, "application/pdf");

                const combinedRes = await request(app)
                    .post(
                        `/api/v1/submissions/${submissionId}/attachments`,
                    )
                    .set("Cookie", member.cookie)
                    .send({
                        content: {
                            type: "text",
                            content: "The last text slot",
                        },
                        file: {
                            type: "file",
                            objectKey,
                            fileName: "overflow.pdf",
                            mimeType: "application/pdf",
                            fileSize: 100,
                        },
                    });

                expect(combinedRes.status).toBe(409);
                expect(combinedRes.body.error.code).toBe("CONFLICT");

                const attachmentsRes = await request(app)
                    .get(`/api/v1/submissions/${submissionId}/attachments`)
                    .set("Cookie", member.cookie);
                expect(attachmentsRes.body.data.length).toBe(
                    MAX_ATTACHMENTS_PER_SUBMISSION - 1,
                );
            },
        );
    },
);

// ============================================================
// END-TO-END FILE UPLOAD
//
// Presigned URL
//      ↓
// Object Storage
//      ↓
// Register Metadata
// ============================================================

describe(
    "Submission File Upload End-to-End Integration",
    () => {
        beforeEach(async () => {
            await cleanDatabase();
        });

        it(
            "should upload the actual file to object storage and register its metadata",
            async () => {
                const {
                    member,
                    submissionId,
                } =
                    await createTaskWithSubmission();

                // ------------------------------------------------
                // Fake file content
                // ------------------------------------------------
                const fileContent = Buffer.from(
                    "Hello from KerjainYu integration test!",
                    "utf-8",
                );

                const fileName = "report.txt";
                const mimeType = "text/plain";

                // ------------------------------------------------
                // 1. Request presigned upload URL
                // ------------------------------------------------

                const uploadUrlRes =
                    await requestUploadUrl(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            fileName,
                            mimeType,
                            fileSize:
                                fileContent.length,
                        },
                    );

                expect(
                    uploadUrlRes.status,
                ).toBe(200);

                expect(
                    uploadUrlRes.body.success,
                ).toBe(true);

                const {
                    uploadUrl,
                    objectKey,
                } =
                    uploadUrlRes.body.data;

                expect(
                    uploadUrl,
                ).toEqual(
                    expect.any(String),
                );

                expect(
                    objectKey,
                ).toEqual(
                    expect.stringContaining(
                        `submissions/${submissionId}/`,
                    ),
                );

                // ------------------------------------------------
                // 2. Upload actual binary
                // ------------------------------------------------

                const storageUploadRes =
                    await fetch(uploadUrl, {
                        method: "PUT",
                        headers: {
                            "Content-Type":
                                mimeType,
                        },
                        body: fileContent,
                    });

                expect(
                    storageUploadRes.ok,
                ).toBe(true);

                // ------------------------------------------------
                // 3. Verify object exists
                // ------------------------------------------------

                const headObject =
                    await s3.send(
                        new HeadObjectCommand({
                            Bucket:
                                STORAGE_BUCKET,
                            Key: objectKey,
                        }),
                    );

                expect(
                    headObject.ContentLength,
                ).toBe(
                    fileContent.length,
                );

                expect(
                    headObject.ContentType,
                ).toBe(mimeType);

                // ------------------------------------------------
                // 4. Register metadata
                // ------------------------------------------------

                const attachmentRes =
                    await registerFileAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            objectKey,
                            fileName,
                            mimeType,
                            fileSize:
                                fileContent.length,
                        },
                    );

                expect(
                    attachmentRes.status,
                ).toBe(201);

                expect(
                    attachmentRes.body.success,
                ).toBe(true);

                expect(
                    attachmentRes.body.data
                        .contentAttachment,
                ).toBeNull();

                expect(
                    attachmentRes.body.data
                        .fileAttachment,
                ).toEqual(
                    expect.objectContaining({
                        submissionId,
                        type: "file",
                        objectKey,
                        fileName,
                        mimeType,
                        fileSize:
                            fileContent.length,
                    }),
                );

                // ------------------------------------------------
                // 5. Verify database
                // ------------------------------------------------

                const attachment =
                    await db(
                        "submission_attachments",
                    )
                        .where({
                            id: Number(
                                attachmentRes.body
                                    .data
                                    .fileAttachment
                                    .id,
                            ),
                        })
                        .first();

                expect(
                    attachment,
                ).toEqual(
                    expect.objectContaining({
                        submissionId:
                            String(
                                submissionId,
                            ),
                        type: "file",
                        objectKey,
                        fileName,
                        mimeType,
                        fileSize:
                            String(
                                fileContent.length,
                            ),
                    }),
                );
            },
        );
    },
);

describe(
    "PATCH /api/v1/submissions/:id/attachments/:attachmentId",
    () => {
        let leader: any;
        let member: any;
        let projectId: number;
        let taskId: number;
        let submissionId: number;

        beforeEach(async () => {
            const setup =
                await createTaskWithSubmission();

            leader = setup.leader;
            member = setup.member;
            projectId = setup.projectId;
            taskId = setup.taskId;
            submissionId = setup.submissionId;
        });

        // =====================================================
        // CONTENT
        // =====================================================

        it("should update text attachment successfully", async () => {
            const createRes =
                await registerContentAttachment(
                    member.cookie,
                    submissionId,
                    {
                        type: "text",
                        content: "Original content",
                    },
                );

            expect(createRes.status).toBe(201);

            const attachment =
                createRes.body.data.contentAttachment;

            const updateRes =
                await request(app)
                    .patch(
                        `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                    )
                    .set("Cookie", member.cookie)
                    .send({
                        content: {
                            type: "text",
                            content: "Updated content",
                        },
                    });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.success).toBe(true);

            expect(updateRes.body.data).toMatchObject({
                id: String(attachment.id),
                submissionId: String(submissionId),
                type: "text",
                content: "Updated content",
            });
        });

        it("should update link attachment successfully", async () => {
            const createRes =
                await registerContentAttachment(
                    member.cookie,
                    submissionId,
                    {
                        type: "link",
                        content:
                            "https://figma.com/old-design",
                    },
                );

            expect(createRes.status).toBe(201);

            const attachment =
                createRes.body.data.contentAttachment;

            const updateRes =
                await request(app)
                    .patch(
                        `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                    )
                    .set("Cookie", member.cookie)
                    .send({
                        content: {
                            type: "link",
                            content:
                                "https://figma.com/new-design",
                        },
                    });

            expect(updateRes.status).toBe(200);

            expect(updateRes.body.data).toMatchObject({
                id: String(attachment.id),
                submissionId: String(submissionId),
                type: "link",
                content:
                    "https://figma.com/new-design",
            });
        });

        // =====================================================
        // FILE
        // =====================================================

        it("should update file attachment successfully", async () => {
            const oldUploadRes = await requestUploadUrl(
                member.cookie,
                submissionId,
                {
                    type: "file",
                    fileName: "old-file.pdf",
                    mimeType: "application/pdf",
                    fileSize: 1000,
                },
            );
            expect(oldUploadRes.status).toBe(200);
            const { uploadUrl: oldUploadUrl, objectKey: oldObjectKey } =
                oldUploadRes.body.data;
            await uploadRealFile(oldUploadUrl, 1000, "application/pdf");

            const createRes =
                await registerFileAttachment(
                    member.cookie,
                    submissionId,
                    {
                        type: "file",
                        objectKey: oldObjectKey,
                        fileName: "old-file.pdf",
                        mimeType: "application/pdf",
                        fileSize: 1000,
                    },
                );

            expect(createRes.status).toBe(201);

            const attachment =
                createRes.body.data.fileAttachment;

            const newUploadRes = await requestUploadUrl(
                member.cookie,
                submissionId,
                {
                    type: "file",
                    fileName: "new-file.pdf",
                    mimeType: "application/pdf",
                    fileSize: 2000,
                },
            );
            expect(newUploadRes.status).toBe(200);
            const { uploadUrl: newUploadUrl, objectKey: newObjectKey } =
                newUploadRes.body.data;
            await uploadRealFile(newUploadUrl, 2000, "application/pdf");

            const updateRes =
                await request(app)
                    .patch(
                        `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                    )
                    .set("Cookie", member.cookie)
                    .send({
                        file: {
                            type: "file",
                            objectKey: newObjectKey,
                            fileName: "new-file.pdf",
                            mimeType: "application/pdf",
                            fileSize: 2000,
                        },
                    });
            expect(updateRes.status).toBe(200);
            expect(updateRes.body.success).toBe(true);

            expect(updateRes.body.data).toMatchObject({
                id: Number(attachment.id),
                submissionId: Number(submissionId),
                type: "file",
                objectKey: newObjectKey,
                fileName: "new-file.pdf",
                mimeType: "application/pdf",
                fileSize: 2000,
            });
        });


        it(
            "should update file attachment end-to-end",
            async () => {
                // ============================================================
                // SETUP
                // ============================================================

                const {
                    member,
                    submissionId,
                } = await createTaskWithSubmission();

                // ============================================================
                // 1. UPLOAD OLD FILE
                // ============================================================

                const oldFileContent = Buffer.from(
                    "This is the OLD file content.",
                    "utf-8",
                );

                const oldFileName = "old-file.txt";
                const oldMimeType = "text/plain";

                const oldUploadRes =
                    await requestUploadUrl(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            fileName: oldFileName,
                            mimeType: oldMimeType,
                            fileSize: oldFileContent.length,
                        },
                    );

                expect(oldUploadRes.status).toBe(200);

                const {
                    uploadUrl: oldUploadUrl,
                    objectKey: oldObjectKey,
                } = oldUploadRes.body.data;

                // Upload OLD file
                const oldStorageRes = await fetch(
                    oldUploadUrl,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": oldMimeType,
                        },
                        body: oldFileContent,
                    },
                );

                expect(oldStorageRes.ok).toBe(true);

                // ============================================================
                // 2. REGISTER OLD FILE METADATA
                // ============================================================

                const createRes =
                    await registerFileAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            objectKey: oldObjectKey,
                            fileName: oldFileName,
                            mimeType: oldMimeType,
                            fileSize:
                                oldFileContent.length,
                        },
                    );

                expect(createRes.status).toBe(201);

                const attachment =
                    createRes.body.data.fileAttachment;

                const attachmentId =
                    Number(attachment.id);

                // ============================================================
                // 3. VERIFY OLD OBJECT REALLY EXISTS
                // ============================================================

                const oldObjectBeforeUpdate =
                    await s3.send(
                        new HeadObjectCommand({
                            Bucket: STORAGE_BUCKET,
                            Key: oldObjectKey,
                        }),
                    );

                expect(
                    oldObjectBeforeUpdate.ContentLength,
                ).toBe(oldFileContent.length);

                expect(
                    oldObjectBeforeUpdate.ContentType,
                ).toBe(oldMimeType);

                // ============================================================
                // 4. UPLOAD NEW FILE
                // ============================================================

                const newFileContent = Buffer.from(
                    "This is the NEW updated file content.",
                    "utf-8",
                );

                const newFileName = "new-file.txt";
                const newMimeType = "text/plain";

                const newUploadRes =
                    await requestUploadUrl(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            fileName: newFileName,
                            mimeType: newMimeType,
                            fileSize: newFileContent.length,
                        },
                    );

                expect(newUploadRes.status).toBe(200);

                const {
                    uploadUrl: newUploadUrl,
                    objectKey: newObjectKey,
                } = newUploadRes.body.data;

                // Upload NEW file
                const newStorageRes = await fetch(
                    newUploadUrl,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": newMimeType,
                        },
                        body: newFileContent,
                    },
                );

                expect(newStorageRes.ok).toBe(true);

                // ============================================================
                // 5. PATCH ATTACHMENT
                // ============================================================

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachmentId}`,
                        )
                        .set(
                            "Cookie",
                            member.cookie,
                        )
                        .send({
                            file: {
                                type: "file",
                                objectKey: newObjectKey,
                                fileName: newFileName,
                                mimeType: newMimeType,
                                fileSize:
                                    newFileContent.length,
                            },
                        });

                expect(updateRes.status).toBe(200);

                expect(
                    updateRes.body.success,
                ).toBe(true);
                const updatedAttachment2 = await db("submission_attachments")
                    .where({ id: attachmentId })
                    .first();

                expect({
                    ...updatedAttachment2,
                    id: Number(updatedAttachment2.id),
                    submissionId: Number(updatedAttachment2.submissionId),
                    fileSize: Number(updatedAttachment2.fileSize),
                }).toEqual(
                    expect.objectContaining({
                        id: attachmentId,
                        submissionId: Number(submissionId),
                        fileName: "new-file.txt",
                        fileSize: 37,
                        mimeType: "text/plain",
                        objectKey: expect.stringContaining("new-file.txt"),
                        type: "file",
                    }),
                );

                // ============================================================
                // 6. VERIFY DATABASE WAS UPDATED
                // ============================================================

                const updatedAttachment =
                    await db(
                        "submission_attachments",
                    )
                        .where({
                            id: attachmentId,
                        })
                        .first();

                expect({
                    ...updatedAttachment,
                    id: Number(updatedAttachment.id),
                    submissionId: Number(updatedAttachment.submissionId),
                    fileSize: Number(updatedAttachment.fileSize)
                },).toEqual(
                    expect.objectContaining({
                        id: attachmentId,
                        submissionId,
                        type: "file",
                        objectKey: newObjectKey,
                        fileName: newFileName,
                        mimeType: newMimeType,
                        fileSize:
                            newFileContent.length,
                    }),
                );

                // Make sure OLD metadata is no longer present
                expect(
                    updatedAttachment.objectKey,
                ).not.toBe(oldObjectKey);

                expect(
                    updatedAttachment.fileName,
                ).not.toBe(oldFileName);

                // ============================================================
                // 7. VERIFY NEW OBJECT EXISTS IN OBJECT STORAGE
                // ============================================================

                const newObject =
                    await s3.send(
                        new HeadObjectCommand({
                            Bucket: STORAGE_BUCKET,
                            Key: newObjectKey,
                        }),
                    );

                expect(
                    newObject.ContentLength,
                ).toBe(newFileContent.length);

                expect(
                    newObject.ContentType,
                ).toBe(newMimeType);

                // ============================================================
                // 8. VERIFY ACTUAL CONTENT OF NEW OBJECT
                // ============================================================

                const downloadedNewObject =
                    await s3.send(
                        new GetObjectCommand({
                            Bucket: STORAGE_BUCKET,
                            Key: newObjectKey,
                        }),
                    );

                const downloadedNewFile =
                    Buffer.from(
                        await downloadedNewObject
                            .Body!
                            .transformToByteArray(),
                    );

                expect(downloadedNewFile).toEqual(
                    newFileContent,
                );

                // ============================================================
                // 9. VERIFY OLD OBJECT IS GONE
                // ============================================================

                await expect(
                    s3.send(
                        new HeadObjectCommand({
                            Bucket: STORAGE_BUCKET,
                            Key: oldObjectKey,
                        }),
                    ),
                ).rejects.toThrow();
            },
        );
        // =====================================================
        // TYPE CONVERSION
        // =====================================================

        it(
            "should reject changing file attachment into content attachment",
            async () => {
                const uploadRes = await requestUploadUrl(
                    member.cookie,
                    submissionId,
                    {
                        type: "file",
                        fileName: "file.pdf",
                        mimeType: "application/pdf",
                        fileSize: 1000,
                    },
                );
                expect(uploadRes.status).toBe(200);
                const { uploadUrl, objectKey } = uploadRes.body.data;
                await uploadRealFile(uploadUrl, 1000, "application/pdf");

                const createRes =
                    await registerFileAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            objectKey,
                            fileName: "file.pdf",
                            mimeType: "application/pdf",
                            fileSize: 1000,
                        },
                    );

                expect(createRes.status).toBe(201);

                const attachment =
                    createRes.body.data.fileAttachment;

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                        )
                        .set("Cookie", member.cookie)
                        .send({
                            content: {
                                type: "text",
                                content:
                                    "This should not be allowed",
                            },
                        });

                expect(updateRes.status).toBe(409);
            },
        );

        it(
            "should reject changing content attachment into file attachment",
            async () => {
                const createRes =
                    await registerContentAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "text",
                            content: "Original content",
                        },
                    );

                expect(createRes.status).toBe(201);

                const attachment =
                    createRes.body.data.contentAttachment;

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                        )
                        .set("Cookie", member.cookie)
                        .send({
                            file: {
                                type: "file",
                                objectKey:
                                    `submissions/${submissionId}/new.pdf`,
                                fileName: "new.pdf",
                                mimeType: "application/pdf",
                                fileSize: 1000,
                            },
                        });

                expect(updateRes.status).toBe(409);
            },
        );

        // =====================================================
        // OBJECT KEY VALIDATION
        // =====================================================

        it(
            "should reject object key belonging to another submission",
            async () => {
                const uploadRes = await requestUploadUrl(
                    member.cookie,
                    submissionId,
                    {
                        type: "file",
                        fileName: "old.pdf",
                        mimeType: "application/pdf",
                        fileSize: 1000,
                    },
                );
                expect(uploadRes.status).toBe(200);
                const { uploadUrl, objectKey } = uploadRes.body.data;
                await uploadRealFile(uploadUrl, 1000, "application/pdf");

                const createRes =
                    await registerFileAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "file",
                            objectKey,
                            fileName: "old.pdf",
                            mimeType: "application/pdf",
                            fileSize: 1000,
                        },
                    );

                expect(createRes.status).toBe(201);

                const attachment =
                    createRes.body.data.fileAttachment;

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                        )
                        .set("Cookie", member.cookie)
                        .send({
                            file: {
                                type: "file",
                                objectKey:
                                    "submissions/999999/new.pdf",
                                fileName: "new.pdf",
                                mimeType: "application/pdf",
                                fileSize: 1000,
                            },
                        });

                expect(updateRes.status).toBe(403);
            },
        );

        // =====================================================
        // AUTHORIZATION
        // =====================================================

        it(
            "should allow project leader to update attachment",
            async () => {
                const createRes =
                    await registerContentAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "text",
                            content: "Original",
                        },
                    );

                expect(createRes.status).toBe(201);

                const attachment =
                    createRes.body.data.contentAttachment;

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                        )
                        .set("Cookie", leader.cookie)
                        .send({
                            content: {
                                type: "text",
                                content:
                                    "Updated by leader",
                            },
                        });

                expect(updateRes.status).toBe(200);
            },
        );

        it(
            "should reject update from unauthorized project member",
            async () => {
                const createRes =
                    await registerContentAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "text",
                            content: "Original",
                        },
                    );

                expect(createRes.status).toBe(201);

                const attachment =
                    createRes.body.data.contentAttachment;

                const unauthorizedUser =
                    await registerAndLogin(
                        `attachment_unauthorized_${Date.now()}`,
                    );

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                        )
                        .set(
                            "Cookie",
                            unauthorizedUser.cookie,
                        )
                        .send({
                            content: {
                                type: "text",
                                content:
                                    "Unauthorized",
                            },
                        });

                expect(updateRes.status).toBe(403);
            },
        );

        // =====================================================
        // SUBMISSION STATUS
        // =====================================================

        it(
            "should reject update on approved submission",
            async () => {
                const createRes =
                    await registerContentAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "text",
                            content: "Original",
                        },
                    );

                expect(createRes.status).toBe(201);

                const attachment =
                    createRes.body.data.contentAttachment;

                const reviewRes =
                    await reviewSubmission(
                        leader.cookie,
                        submissionId,
                        {
                            reviewStatus: "approved",
                        },
                    );

                expect(reviewRes.status).toBe(200);

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                        )
                        .set("Cookie", member.cookie)
                        .send({
                            content: {
                                type: "text",
                                content:
                                    "Should fail",
                            },
                        });

                expect(updateRes.status).toBe(409);
            },
        );

        // =====================================================
        // NOT FOUND
        // =====================================================

        it(
            "should reject non-existent submission",
            async () => {
                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/999999/attachments/1`,
                        )
                        .set("Cookie", member.cookie)
                        .send({
                            content: {
                                type: "text",
                                content: "Updated",
                            },
                        });

                expect(updateRes.status).toBe(404);
            },
        );

        it(
            "should reject non-existent attachment",
            async () => {
                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/999999`,
                        )
                        .set("Cookie", member.cookie)
                        .send({
                            content: {
                                type: "text",
                                content: "Updated",
                            },
                        });

                expect(updateRes.status).toBe(404);
            },
        );

        it(
            "should reject attachment belonging to another submission",
            async () => {
                // ---------------------------------------------
                // Create second task
                // ---------------------------------------------

                const task2Res =
                    await createTask(
                        leader.cookie,
                        projectId,
                        {
                            title:
                                "Second Attachment Task",
                            isClaimable: false,
                        },
                    );

                expect(task2Res.status).toBe(201);

                const task2Id =
                    task2Res.body.data.id;

                // ---------------------------------------------
                // Assign second task to same member
                // ---------------------------------------------

                await assignTask(
                    leader.cookie,
                    task2Id,
                    member.userId,
                );

                await db("tasks")
                    .where({ id: task2Id })
                    .update({
                        status: "ongoing",
                    });

                // ---------------------------------------------
                // Create second submission
                // ---------------------------------------------

                const submission2Res =
                    await createSubmission(
                        member.cookie,
                        task2Id,
                        {
                            note: "Second submission",
                        },
                    );

                expect(
                    submission2Res.status,
                ).toBe(201);

                const submission2Id =
                    submission2Res.body.data.id;

                // ---------------------------------------------
                // Create attachment on submission #2
                // ---------------------------------------------

                const attachmentRes =
                    await registerContentAttachment(
                        member.cookie,
                        submission2Id,
                        {
                            type: "text",
                            content:
                                "Second attachment",
                        },
                    );

                expect(
                    attachmentRes.status,
                ).toBe(201);

                const attachment =
                    attachmentRes.body.data
                        .contentAttachment;

                // ---------------------------------------------
                // Try updating attachment using submission #1
                // ---------------------------------------------

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachment.id}`,
                        )
                        .set("Cookie", member.cookie)
                        .send({
                            content: {
                                type: "text",
                                content:
                                    "Should fail",
                            },
                        });

                expect(updateRes.status).toBe(404);
            },
        );

        // =====================================================
        // VALIDATION
        // =====================================================

        it(
            "should reject when both content and file are provided",
            async () => {
                // ============================================
                // 1. Create existing attachment
                // ============================================

                const createRes =
                    await registerContentAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "text",
                            content: "Original content",
                        },
                    );

                expect(createRes.status).toBe(201);

                const attachment =
                    createRes.body.data.contentAttachment;

                const attachmentId = attachment.id;

                // ============================================
                // 2. Try to update with BOTH content and file
                // ============================================

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachmentId}`,
                        )
                        .set("Cookie", member.cookie)
                        .send({
                            content: {
                                type: "text",
                                content: "Updated content",
                            },
                            file: {
                                type: "file",
                                objectKey:
                                    `submissions/${submissionId}/file.pdf`,
                                fileName: "file.pdf",
                                mimeType: "application/pdf",
                                fileSize: 1000,
                            },
                        });


                expect(updateRes.status).toBe(400);
            },
        );

        it(
            "should reject when neither content nor file is provided",
            async () => {
                // ============================================
                // 1. Create existing attachment
                // ============================================

                const createRes =
                    await registerContentAttachment(
                        member.cookie,
                        submissionId,
                        {
                            type: "text",
                            content: "Original content",
                        },
                    );

                expect(createRes.status).toBe(201);

                const attachment =
                    createRes.body.data.contentAttachment;

                const attachmentId = attachment.id;

                // ============================================
                // 2. Try to update without content or file
                // ============================================

                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/${attachmentId}`,
                        )
                        .set("Cookie", member.cookie)
                        .send({});


                expect(updateRes.status).toBe(400);
            },
        );
        // =====================================================
        // AUTHENTICATION
        // =====================================================

        it(
            "should reject unauthenticated update",
            async () => {
                const updateRes =
                    await request(app)
                        .patch(
                            `/api/v1/submissions/${submissionId}/attachments/1`,
                        )
                        .send({
                            content: {
                                type: "text",
                                content: "Updated",
                            },
                        });

                expect(updateRes.status).toBe(401);
            },
        );
    },

);


//DOWNLOA