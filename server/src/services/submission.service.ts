import { db } from "../database/db"
import * as submissionRepo from "../database/repositories/submission.repository"
import * as taskRepo from "../database/repositories/task.repository"
import * as projectMemberRepo from "../database/repositories/project.member.repository"
import * as projectRepo from "../database/repositories/project.repository"
import { ConflictError, ForbiddenError, NotFoundError } from "../errors/AppError"
import { CreateAttachmentInput, CreateFileAttachmentInput, CreateFileUploadUrlInput, CreateSubmissionInput, ReviewSubmissionInput, UpdateAttachmentInput } from "../schemas/submission.schema"
import * as storageService from "./storage.service"
import { assertProjectLeader, assertProjectMembership, assertProjectIsActive } from "./helper/auhtorization.helper"
import { assertTaskAccess } from "./helper/task.helper"
import { notifyUser } from "./notification.service"
import { file } from "zod"

// B4: batas maksimum jumlah attachment (gabungan text/link/file) per
// submission. Tanpa batas ini, satu submission bisa "digembungkan" dengan
// ribuan attachment kecil (baik lewat banyak request paralel maupun lewat
// script) yang membebani query getAttachmentsBySubmission dan storage.
export const MAX_ATTACHMENTS_PER_SUBMISSION = 20;

//POST /api/v1/tasks/:id/submissions
export async function createSubmission(
    taskId: number,
    submittedBy: number,
    input: CreateSubmissionInput,
) {
    const task = await assertTaskAccess(taskId, submittedBy);

    const project = await projectRepo.getProjectById(task.projectId);
    if (!project) {
        throw new NotFoundError("Project not found");
    }
    assertProjectIsActive(project);

    if (task.assigneeId != submittedBy) {
        throw new ForbiddenError(
            "Only the assignee can submit the task"
        );
    }

    if (!["in_revision", "ongoing"].includes(task.status)) {
        throw new ConflictError(
            "Only task in status revision & ongoing that can be submitted"
        );
    }

    return db.transaction(async (trx) => {
        const submission = await submissionRepo.createSubmission(
            {
                taskId,
                submittedBy,
                note: input.note,
            },
            trx
        );

        // text / link attachments only
        if (input.contents.length > 0) {
            await submissionRepo.createContentAttachments(
                submission.id,
                input.contents,
                trx
            );
        }

        const updatedTask =
            await taskRepo.updateTaskStatusIfAllowed(
                task.id,
                ["ongoing", "in_revision"],
                "submitted",
                trx
            );

        if (!updatedTask) {
            throw new ConflictError(
                "This task has already been submitted"
            );
        }

        const leader = await projectMemberRepo.getProjectLeader(task.projectId);
        if (leader) {
            await notifyUser({
                userId: leader.userId,
                type: "submission_pending",
                referenceType: "submission",
                referenceId: submission.id,
                message: `New submission for task "${task.title}" is waiting for review`,
            }, trx);
        }

        return submission;
    });
}

// POST /api/v1/submissions/:id/attachments/upload-url -> Used to provide the presigned url to the client
export async function createAttachmentUploadUrl(
    submissionId: number,
    userId: number,
    input: CreateFileUploadUrlInput,
) {
    const submission =
        await submissionRepo.getSubmissionById(submissionId);

    if (!submission) {
        throw new NotFoundError("Submission is not found");
    }

    const task =
        await taskRepo.getTaskById(submission.taskId);

    if (!task) {
        throw new NotFoundError("Task is not found");
    }

    if (task.assigneeId != userId) {
        throw new ForbiddenError(
            "Only the assignee can upload submission attachments",
        );
    }

    if (!["pending", "revision_requested"].includes(submission.reviewStatus)) {
        throw new ConflictError("Cannot upload attachments to a reviewed submission");
    }

    return storageService.createSubmissionUploadUrl(
        submissionId,
        input.fileName,
        input.mimeType,
        input.fileSize,
    );
}

//POST /api/v1/submissions/:id/attachments -> For saving metadata to database
export async function createAttachment(
    submissionId: number,
    userId: number,
    input: CreateAttachmentInput,
) {
    const submission =
        await submissionRepo.getSubmissionById(
            submissionId,
        );

    if (!submission) {
        throw new NotFoundError(
            "Submission is not found",
        );
    }

    const task =
        await taskRepo.getTaskById(
            submission.taskId,
        );

    if (!task) {
        throw new NotFoundError(
            "Task is not found",
        );
    }

    if (task.assigneeId != userId) {
        throw new ForbiddenError(
            "Only the assignee can attach files to this submission",
        );
    }

    if (!["pending", "revision_requested"].includes(submission.reviewStatus)
    ) {
        throw new ConflictError(
            "Cannot attach file to a reviewed submission",
        );
    }

    return db.transaction(async (trx) => {
        const existingCount = await submissionRepo.countAttachmentsBySubmission(
            submissionId,
            trx,
        );
        const incomingCount =
            (input.content ? 1 : 0) + (input.file ? 1 : 0);

        if (existingCount + incomingCount > MAX_ATTACHMENTS_PER_SUBMISSION) {
            throw new ConflictError(
                `Submission ini sudah memiliki ${existingCount} attachment, maksimum adalah ${MAX_ATTACHMENTS_PER_SUBMISSION}.`,
            );
        }

        let contentAttachment = null;
        let fileAttachment = null;
        if (input.content) {
            contentAttachment = await submissionRepo.createContentAttachment(submissionId, { content: input.content.content, type: input.content.type }, trx)
        }
        if (input.file) {
            if (!input.file.objectKey.startsWith(`submissions/${submissionId}/`,)) {
                throw new ForbiddenError(
                    "Invalid object key",
                );
            }

            const verification = await storageService.verifyUploadedObject(
                input.file.objectKey,
                input.file.fileSize,
            );
            if (!verification.exists) {
                throw new ConflictError(
                    "File belum berhasil diupload ke storage. Upload file terlebih dahulu sebelum menyimpan metadata.",
                );
            }
            if (!verification.sizeMatches) {
                throw new ConflictError(
                    `Ukuran file yang diupload (${verification.actualSize} bytes) tidak sesuai dengan yang dilaporkan (${input.file.fileSize} bytes).`,
                );
            }

            fileAttachment = await submissionRepo.createFileAttachment(
                {
                    submissionId,
                    type: input.file.type,
                    objectKey: input.file.objectKey,
                    fileName: input.file.fileName,
                    mimeType: input.file.mimeType,
                    fileSize: input.file.fileSize,
                },
                trx,
            );
        }
        return { contentAttachment, fileAttachment }
    });
}

//PATCH /api/v1/submissions/:id/review
export async function reviewSubmission(submissionId: number, leaderId: number, input: ReviewSubmissionInput) {
    const submission = await submissionRepo.getSubmissionById(submissionId)
    if (!submission) {
        throw new NotFoundError("Submission is not found")
    }
    const task = await taskRepo.getTaskById(submission.taskId)
    if (!task) {
        throw new NotFoundError("Task is not found")
    }
    const { project } = await assertProjectLeader(task.projectId, leaderId)
    assertProjectIsActive(project);
    if (!['pending', 'revision_requested'].includes(submission.reviewStatus)) {
        throw new ConflictError("Only submission on pending and revision that can be reviewed")
    }
    return db.transaction(async (trx) => {
        const updated = await submissionRepo.reviewSubmission(submissionId, { ...input, reviewedBy: leaderId }, trx)
        if (!updated) {
            throw new ConflictError(
                "This submission has already been reviewed"
            );
        }
        if (input.reviewStatus == 'approved') {
            await taskRepo.updateTask(task.id, { status: "approved" }, trx)
        } else if (input.reviewStatus == 'revision_requested') {
            await taskRepo.updateTask(task.id, { status: "in_revision" }, trx)
        } else if (input.reviewStatus == 'rejected') {
            await taskRepo.updateTask(task.id, { status: "rejected" }, trx)
        }

        await notifyUser({
            userId: submission.submittedBy,
            type: "submission_reviewed",
            referenceType: "submission",
            referenceId: submission.id,
            message: `Your submission for task "${task.title}" was ${input.reviewStatus.replace('_', ' ')}`,
        }, trx)

        return updated
    })
}

//GET /api/v1/projects/:id/pending-submissions
export async function pendingSubmissionsByProject(projectId: number, leaderId: number) {
    await assertProjectLeader(projectId, leaderId)
    const submissions = await submissionRepo.getPendingSubmissionsByProject(projectId)
    return submissions
}

//GET /api/v1/submissions/:id/attachments -> Fetching all attachments by submission
export async function getSubmissionAttachments(submissionId: number, userId: number) {
    const submission = await submissionRepo.getSubmissionById(submissionId)
    if (!submission) {
        throw new NotFoundError("Submission not found")
    }
    const task = await taskRepo.getTaskById(submission.taskId)
    if (!task) {
        throw new NotFoundError("Task not found")
    }
    await assertProjectMembership(task.projectId, userId)
    return await submissionRepo.getAttachmentsBySubmission(submissionId)
}

//DELETE /api/v1/submissions/:id/attachments/:attachmentId
export async function deleteAttachment(submissionId: number, attachmentId: number, userId: number) {
    const submission = await submissionRepo.getSubmissionById(submissionId)
    if (!submission) {
        throw new NotFoundError("Submission not found")
    }

    const attachment = await submissionRepo.getAttachmentById(attachmentId)
    if (!attachment) {
        throw new NotFoundError("Attachment not found")
    }
    if (attachment.submissionId != submission.id) {
        throw new NotFoundError("Attachment not found")
    }

    const task = await taskRepo.getTaskById(submission.taskId)
    if (!task) {
        throw new NotFoundError("Task not found")
    }
    const isAssignee = task.assigneeId == userId;
    if (!isAssignee) {
        await assertProjectLeader(task.projectId, userId)
    }

    // Delete the object first to avoid leaving orphaned DB metadata.
    // Note: DB and object storage are separate systems, so this operation
    // is not fully atomic. A failed DB delete after storage deletion
    // may require manual/retry-based recovery.
    if (attachment.type === "file" || attachment.type === "image") {
        await storageService.deleteObject(attachment.objectKey)
    }
    return await submissionRepo.deleteAttachment(attachmentId)
}


// PATCH /api/v1/submissions/:id/attachments/:attachmentId
export async function updateAttachment(
    submissionId: number,
    attachmentId: number,
    userId: number,
    input: UpdateAttachmentInput,
) {
    const submission =
        await submissionRepo.getSubmissionById(submissionId);

    if (!submission) {
        throw new NotFoundError("Submission not found");
    }

    const attachment =
        await submissionRepo.getAttachmentById(attachmentId);

    if (!attachment) {
        throw new NotFoundError("Attachment not found");
    }

    if (attachment.submissionId !== submission.id) {
        throw new NotFoundError("Attachment not found");
    }

    const task =
        await taskRepo.getTaskById(submission.taskId);

    if (!task) {
        throw new NotFoundError("Task not found");
    }

    const isAssignee = task.assigneeId === userId;

    if (!isAssignee) {
        await assertProjectLeader(
            task.projectId,
            userId,
        );
    }

    if (
        !["pending", "revision_requested"].includes(
            submission.reviewStatus,
        )
    ) {
        throw new ConflictError(
            "Cannot update attachment on a reviewed submission",
        );
    }

    if (input.content) {
        if (
            attachment.type !== "text" &&
            attachment.type !== "link"
        ) {
            throw new ConflictError(
                "Cannot change a file attachment into a content attachment",
            );
        }

        return submissionRepo.updateContentAttachment(
            attachmentId,
            input.content,
        );
    }

    if (
        attachment.type !== "file" &&
        attachment.type !== "image"
    ) {
        throw new ConflictError(
            "Cannot change a content attachment into a file attachment",
        );
    }

    const file = input.file!;

    if (
        !file.objectKey.startsWith(
            `submissions/${submissionId}/`,
        )
    ) {
        throw new ForbiddenError(
            "Invalid object key",
        );
    }

    const verification = await storageService.verifyUploadedObject(
        file.objectKey,
        file.fileSize,
    );
    if (!verification.exists) {
        throw new ConflictError(
            "File belum berhasil diupload ke storage. Upload file terlebih dahulu sebelum menyimpan metadata.",
        );
    }
    if (!verification.sizeMatches) {
        throw new ConflictError(
            `Ukuran file yang diupload (${verification.actualSize} bytes) tidak sesuai dengan yang dilaporkan (${file.fileSize} bytes).`,
        );
    }

    const oldObjectKey = attachment.objectKey;

    const updated =
        await submissionRepo.updateFileAttachment(
            attachmentId,
            {
                type: file.type,
                objectKey: file.objectKey,
                fileName: file.fileName,
                mimeType: file.mimeType,
                fileSize: file.fileSize,
            },
        );

    if (oldObjectKey) {
        await storageService.deleteObject(oldObjectKey);
    }

    return updated;
}
export async function createAttachmentDownloadUrl(
    submissionId: number,
    attachmentId: number,
    userId: number,
) {
    const submission = await submissionRepo.getSubmissionById(submissionId);
    if (!submission) {
        throw new NotFoundError("Submission not found");
    }

    const task = await taskRepo.getTaskById(submission.taskId);
    if (!task) {
        throw new NotFoundError("Task not found");
    }
    await assertProjectMembership(task.projectId, userId);

    const attachment = await submissionRepo.getAttachmentById(attachmentId);
    if (!attachment) {
        throw new NotFoundError("Attachment not found");
    }
    if (attachment.submissionId != submission.id) {
        throw new NotFoundError("Attachment not found");
    }
    if (attachment.type !== "file" && attachment.type !== "image") {
        throw new ConflictError("This attachment has no downloadable file");
    }

    const downloadUrl = await storageService.createDownloadUrl(
        attachment.objectKey,
    );

    return {
        downloadUrl,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
    };
}