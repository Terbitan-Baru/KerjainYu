// routes/submission.routes.ts

import { Router } from "express";
import * as submissionController from "../controllers/submission.controller";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate";
import { readRateLimiter, writeRateLimiter, uploadRateLimiter } from "../middlewares/rateLimiter"
import { idParams } from "../schemas/id.schema";
import {
    attachmentIdParams,
    createAttachmentSchema,
    createFileAttachmentSchema,
    createFileUploadUrlSchema,
    reviewSubmissionSchema,
    updateAttachmentSchema,
} from "../schemas/submission.schema";
const router = Router();

router.get(
    "/:id/attachments",
    readRateLimiter,
    authenticate,
    validate(idParams, "params"),
    submissionController.getAttachmentsBySubmission
);

router.post(
    "/:id/attachments/upload-url",
    authenticate,           
    uploadRateLimiter,     
    validate(idParams, "params"),
    validate(createFileUploadUrlSchema, "body"),
    submissionController.createAttachmentUploadUrl
);

router.post(
    "/:id/attachments",
    writeRateLimiter,
    authenticate,
    validate(idParams, "params"),
    validate(createAttachmentSchema, "body"),
    submissionController.createFileAttachment
);

router.get(
    "/:id/attachments/:attachmentId/download-url",
    readRateLimiter,
    authenticate,
    validate(idParams, "params"),
    validate(attachmentIdParams, "params"),
    submissionController.createAttachmentDownloadUrl
);

router.patch(
    "/:id/attachments/:attachmentId",
    writeRateLimiter,
    authenticate,
    validate(idParams, "params"),
    validate(attachmentIdParams, "params"),
    validate(updateAttachmentSchema, "body"),
    submissionController.updateAttachment
);

router.delete(
    "/:id/attachments/:attachmentId",
    writeRateLimiter,
    authenticate,
    validate(idParams, "params"),
    validate(attachmentIdParams, "params"),
    submissionController.deleteAttachment
);
router.patch(
    "/:id/review",
    writeRateLimiter,
    authenticate,
    validate(idParams, "params"),
    validate(reviewSubmissionSchema, "body"),
    submissionController.reviewSubmission
);

export default router;