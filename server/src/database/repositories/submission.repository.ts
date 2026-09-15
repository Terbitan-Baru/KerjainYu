import { db } from "../db";
import { Knex } from "knex";

type AttachmentType = "text" | "image" | "file" | "link";

// ─────────────────────────────────────────────
// task_submissions
// ─────────────────────────────────────────────

export async function createSubmission(
    data: {
        taskId: number;
        submittedBy: number;
        note?: string;
    },
    trx?: Knex.Transaction,
) {
    const executor = trx || db;

    const [submission] = await executor("task_submissions")
        .insert(data)
        .returning("*");

    return submission;
}

// ─────────────────────────────────────────────
// submission_attachments - content
// ─────────────────────────────────────────────

export async function createContentAttachments(
    submissionId: number,
    contents: Array<{
        type: "text" | "link";
        content: string;
    }>,
    trx?: Knex.Transaction,
) {
    const executor = trx || db;

    return executor("submission_attachments")
        .insert(
            contents.map((content) => ({
                submissionId,
                type: content.type,
                content: content.content,
            })),
        )
        .returning("*");
}
export async function createContentAttachment(
    submissionId: number,
    content: {
        type: "text" | "link";
        content: string;
    },
    trx?: Knex.Transaction,
) {
    const executor = trx || db;

    const [created] = await executor(
        "submission_attachments",
    )
        .insert({
            submissionId,
            type: content.type,
            content: content.content,
        })
        .returning([
            "id",
            "submissionId",
            "type",
            "content",
            "createdAt",
        ]);

    return {
        ...created,
        id: Number(created.id),
        submissionId: Number(created.submissionId),
    };
}
export async function createFileAttachment(
    attachment: {
        submissionId: number;
        type: "file" | "image";
        objectKey: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
    },
    trx?: Knex.Transaction,
) {
    const executor = trx || db;

    const [created] = await executor(
        "submission_attachments",
    )
        .insert(attachment)
        .returning([
            "id",
            "submissionId",
            "type",
            "objectKey",
            "fileName",
            "mimeType",
            "fileSize",
            "createdAt",
        ]);

    return {
        ...created,
        id: Number(created.id),
        submissionId: Number(created.submissionId),
        fileSize: Number(created.fileSize),
    };
}

export async function getSubmissionById(id: number) {
    return db("task_submissions")
        .where({ id })
        .first();
}

export async function getSubmissionsByTask(taskId: number) {
    return db("task_submissions")
        .where({ taskId })
        .orderBy("submitted_at", "desc");
}

export async function getPendingSubmissionsByProject(
    projectId: number,
) {
    return db("task_submissions")
        .join(
            "tasks",
            "tasks.id",
            "task_submissions.task_id",
        )
        .where("tasks.project_id", projectId)
        .where(
            "task_submissions.review_status",
            "pending",
        )
        .select(
            "task_submissions.*",
            "tasks.title as task_title",
        )
        .orderBy(
            "task_submissions.submitted_at",
            "asc",
        );
}


export async function reviewSubmission(
    id: number,
    data: {
        reviewStatus:
        | "approved"
        | "revision_requested"
        | "rejected";
        reviewNote?: string;
        reviewedBy: number;
    },
    trx?: Knex.Transaction,
) {
    const executor = trx || db;

    const [updated] = await executor("task_submissions")
        .where({ id })
        .whereIn("review_status", [
            "pending",
            "revision_requested",
        ])
        .update({
            reviewStatus: data.reviewStatus,
            reviewNote: data.reviewNote ?? null,
            reviewedBy: data.reviewedBy,
            reviewedAt: new Date(),
        })
        .returning("*");

    return updated;
}

// ─────────────────────────────────────────────
// Attachments
// ─────────────────────────────────────────────

export async function getAttachmentsBySubmission(
    submissionId: number,
) {
    const attachments = await db("submission_attachments")
        .where({ submissionId });

    return attachments.map((attachment) => ({
        ...attachment,
        id: Number(attachment.id),
        submissionId: Number(attachment.submissionId),
        fileSize:
            attachment.fileSize !== null
                ? Number(attachment.fileSize)
                : null,
    }));
}

export async function countAttachmentsBySubmission(
    submissionId: number,
    trx?: Knex.Transaction,
): Promise<number> {
    const executor = trx || db;
    const row = await executor("submission_attachments")
        .where({ submissionId })
        .count<{ count: string }[]>("id as count")
        .first();
    return row ? Number(row.count) : 0;
}

export async function getAttachmentById(
    attachmentId: number,
) {
    return db("submission_attachments")
        .where({ id: attachmentId })
        .first();
}

export async function objectKeyExists(objectKey: string): Promise<boolean> {
    const row = await db("submission_attachments")
        .where({ objectKey })
        .first("id");
    return row != null;
}

export async function deleteAttachment(
    attachmentId: number,
    trx?: Knex.Transaction,
) {
    const executor = trx || db;

    const [deleted] = await executor("submission_attachments")
        .where({ id: attachmentId })
        .delete()
        .returning("*");

    return deleted;
}

export async function updateContentAttachment(
    attachmentId: number,
    data: {
        type: "text" | "link";
        content: string;
    },
    trx?: Knex.Transaction,
) {
    const executor = trx || db;

    const [updated] = await executor("submission_attachments")
        .where({ id: attachmentId })
        .update({
            type: data.type,
            content: data.content,
        })
        .returning("*");

    return updated;
}

export async function updateFileAttachment(
    attachmentId: number,
    data: {
        type: "file" | "image";
        objectKey: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
    },
    trx?: Knex.Transaction,
) {
    const executor = trx || db;

    const [updated] = await executor("submission_attachments")
        .where({ id: attachmentId })
        .update({
            type: data.type,
            objectKey: data.objectKey,
            fileName: data.fileName,
            mimeType: data.mimeType,
            fileSize: data.fileSize,
            content: null,
        })
        .returning("*");
    return {
        ...updated,
        id: Number(updated.id),
        submissionId: Number(updated.submissionId),
        fileSize: Number(updated.fileSize),
    };
}
