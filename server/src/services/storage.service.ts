import { DeleteObjectCommand, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { s3, STORAGE_BUCKET } from "../config/storage";

export function generateObject(
    prefix: string,
    fileName: string,
) {
    const sanitizedFileName = fileName.replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
    );

    return `${prefix}/${randomUUID()}-${sanitizedFileName}`;
}

export async function createDownloadUrl(objectKey: string) {
    const command = new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: objectKey })
    return getSignedUrl(s3, command, { expiresIn: 60 * 5 })
}

export async function createUploadUrl(
    objectKey: string,
    contentType: string,
    contentLength: number,
) {
    const command = new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: contentLength,
    });

    return getSignedUrl(s3, command, {
        expiresIn: 60 * 12,
    });
}

export async function createSubmissionUploadUrl(
    submissionId: number,
    fileName: string,
    mimeType: string,
    fileSize: number,
) {
    const objectKey = generateObject(
        `submissions/${submissionId}`,
        fileName,
    );

    const uploadUrl = await createUploadUrl(
        objectKey,
        mimeType,
        fileSize,
    );

    return {
        uploadUrl,
        objectKey,
    };
}
export async function deleteObject(
    objectKey: string,
) {
    const command = new DeleteObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: objectKey,
    });

    await s3.send(command);

    return {
        objectKey,
    };
}

export async function verifyUploadedObject(
    objectKey: string,
    expectedSize: number,
): Promise<{ exists: boolean; sizeMatches: boolean; actualSize?: number }> {
    try {
        const head = await s3.send(
            new HeadObjectCommand({ Bucket: STORAGE_BUCKET, Key: objectKey }),
        );
        const actualSize = head.ContentLength ?? 0;
        return {
            exists: true,
            sizeMatches: actualSize === expectedSize,
            actualSize,
        };
    } catch (err: any) {
        // S3/MinIO melempar error (biasanya NotFound/404) kalau object tidak ada.
        if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
            return { exists: false, sizeMatches: false };
        }
        throw err; // error lain (network, permission) — jangan ditelan diam-diam
    }
}