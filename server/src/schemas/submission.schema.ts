import { z } from "../lib/zod-extended";


function refineTypeMatchesMimeType<
    T extends { type: "file" | "image"; mimeType: string },
>(data: T): boolean {
    const isImageMime = data.mimeType.toLowerCase().startsWith("image/");
    if (data.type === "image") {
        return isImageMime;
    }
    return !isImageMime;
}

const TYPE_MIME_MISMATCH_MESSAGE =
    "type tidak konsisten dengan mimeType: gunakan type \"image\" untuk mimeType image/* dan type \"file\" untuk mimeType lainnya.";

// ─────────────────────────────────────────────
// Content attachment
// Used when submitting text / link content
// ─────────────────────────────────────────────

export const submissionContentAttachmentSchema = z.object({
    type: z.enum(["text", "link"])
        .openapi({
            example: "link",
        }),

    content: z.string()
        .trim()
        .min(1, "Content cannot be empty")
        .openapi({
            example:
                "https://figma.com/file/website-redesign?node=homepage",
        }),
})
    .strict()
    .openapi("SubmissionContentAttachmentInput");

export const createFileUploadUrlSchema = z.object({
    type: z.enum(["file", "image"])
        .openapi({
            example: "file",
        }),

    fileName: z.string()
        .trim()
        .min(1, "File name cannot be empty")
        .max(255, "File name is too long")
        .openapi({
            example: "report.pdf",
        }),

    mimeType: z.string()
        .trim()
        .min(1, "MIME type cannot be empty")
        .openapi({
            example: "application/pdf",
        }),

    fileSize: z.number()
        .int()
        .positive("File size must be greater than 0")
        .max(
            10 * 1024 * 1024,
            "Maximum file size is 10MB",
        )
        .openapi({
            example: 2458123,
        }),
})
    .strict()
    .refine(refineTypeMatchesMimeType, {
        message: TYPE_MIME_MISMATCH_MESSAGE,
        path: ["mimeType"],
    })
    .openapi("CreateFileUploadUrlInput");

export const createFileAttachmentSchema = z.object({
    type: z.enum(["file", "image"])
        .openapi({
            example: "file",
        }),

    objectKey: z.string()
        .trim()
        .min(1, "Object key cannot be empty")
        .openapi({
            example:
                "submissions/370/550e8400-e29b-41d4-a716-446655440000-report.pdf",
        }),

    fileName: z.string()
        .trim()
        .min(1, "File name cannot be empty")
        .max(255, "File name is too long")
        .openapi({
            example: "report.pdf",
        }),

    mimeType: z.string()
        .trim()
        .min(1, "MIME type cannot be empty")
        .openapi({
            example: "application/pdf",
        }),

    fileSize: z.number()
        .int()
        .positive("File size must be greater than 0")
        .max(
            10 * 1024 * 1024,
            "Maximum file size is 10MB",
        )
        .openapi({
            example: 2458123,
        }),
})
    .strict()
    .refine(refineTypeMatchesMimeType, {
        message: TYPE_MIME_MISMATCH_MESSAGE,
        path: ["mimeType"],
    })
    .openapi("CreateFileAttachmentInput");

export const createAttachmentSchema = z.object({
    content: submissionContentAttachmentSchema.nullable(),
    file: createFileAttachmentSchema.nullable(),
})
    .refine(
        (data) => data.content !== null || data.file !== null,
        {
            message: "Either content or file must be provided",
        },
    )
    .openapi("CreateAttachmentInput");

export const createSubmissionSchema = z.object({
    note: z.string()
        .trim()
        .min(1, "Note cannot be empty")
        .max(1000, "Note is too long")
        .optional()
        .openapi({
            example:
                "Sudah selesai, mockup ada di Figma.",
        }),

    contents: z.array(
        submissionContentAttachmentSchema,
    )
        .max(
            10,
            "Maximum 10 content attachments per submission",
        )
        .default([])
        .openapi({
            description:
                "Optional text or link attachments.",
        }),
})
    .strict()
    .openapi("CreateSubmissionInput");

// ─────────────────────────────────────────────
// Review submission
// PATCH /api/v1/submissions/:id/review
// ─────────────────────────────────────────────

export const reviewSubmissionSchema = z.object({
    reviewStatus: z.enum([
        "approved",
        "revision_requested",
        "rejected",
    ])
        .openapi({
            example: "revision_requested",
        }),

    reviewNote: z.string()
        .trim()
        .max(1000, "Review note is too long")
        .optional()
        .openapi({
            example:
                "Warna kurang sesuai brand guideline, tolong disesuaikan.",
        }),
})
    .strict()
    .refine(
        (data) => {
            if (
                data.reviewStatus !== "approved" &&
                !data.reviewNote
            ) {
                return false;
            }

            return true;
        },
        {
            message:
                "reviewNote is required when requesting revision or rejecting a submission",
            path: ["reviewNote"],
        },
    )
    .openapi("ReviewSubmissionInput");

export const attachmentIdParams = z.object({
    attachmentId: z.coerce.number().int().positive()
})

export const updateAttachmentSchema = z
    .object({
        content: z
            .object({
                type: z.enum(["text", "link"]),
                content: z.string().trim().min(1),
            })
            .optional(),

        file: z
            .object({
                type: z.enum(["file", "image"]),
                objectKey: z.string().trim().min(1),
                fileName: z.string().trim().min(1),
                mimeType: z.string().trim().min(1),
                fileSize: z.number().positive(),
            })
            .refine(refineTypeMatchesMimeType, {
                message: TYPE_MIME_MISMATCH_MESSAGE,
                path: ["mimeType"],
            })
            .optional(),
    })
    .refine(
        (data) => !!data.content !== !!data.file,
        {
            message: "Provide either content or file",
        },
    );


// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type SubmissionContentAttachmentInput =
    z.infer<typeof submissionContentAttachmentSchema>;

export type CreateAttachmentInput =
    z.infer<typeof createAttachmentSchema>;

export type CreateFileAttachmentInput =
    z.infer<typeof createFileAttachmentSchema>;
export type CreateFileUploadUrlInput =
    z.infer<typeof createFileUploadUrlSchema>;

export type CreateSubmissionInput =
    z.infer<typeof createSubmissionSchema>;

export type ReviewSubmissionInput =
    z.infer<typeof reviewSubmissionSchema>;

export type UpdateAttachmentInput = z.infer<
    typeof updateAttachmentSchema
>; 