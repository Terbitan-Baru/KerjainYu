"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiRequestError } from "@/lib/api/apiRequestError";
import { TaskAction } from "@/lib/api/tasks/taskStatus";
import {
  claimTaskRequest,
  createTaskRequest,
  startTaskRequest,
  submitTaskRequest,
  assignTaskRequest,
  createTaskCommentRequest,
  deleteTaskCommentRequest,
  updateTaskRequest,
  UpdateTaskPayload,
} from "@/lib/api/tasks/tasks";
import {
  reviewSubmissionRequest,
  createAttachmentUploadUrlRequest,
  createAttachmentRequest,
  deleteSubmissionAttachmentRequest,
  getAttachmentDownloadUrlRequest,
} from "@/lib/api/submissions/submissions";
import { createSwapRequestRequest, getIncomingSwapRequests, respondSwapRequestRequest } from "@/lib/api/tasks/swapRequests";
import {
  CreateSwapRequestPayload,
  TaskSwapRequestListItem,
  CreateUploadUrlPayload,
  CreateAttachmentPayload,
  SubmissionAttachment,
} from "@/types/task";
import { TaskFormState } from "@/lib/api/tasks/taskFormState";
import { validateCreateTaskFields } from "@/lib/validation/taskSchema";
import { ROUTES, projectRoutes, taskDetailRoute } from "@/lib/routes";

export type TransitionTaskState = {
  success: boolean;
  error: string | null;
};

// "claim"/"ongoing" adalah aksi assignee sederhana lewat endpoint task.
async function runTaskAction(taskId: number, action: "claim" | "ongoing", cookie: string) {
  switch (action) {
    case "claim":
      return claimTaskRequest(taskId, cookie);
    case "ongoing":
      return startTaskRequest(taskId, cookie);
  }
}

export async function transitionTaskAction(
  projectId: string,
  taskId: number,
  action: Extract<TaskAction, "claim" | "ongoing">,
): Promise<TransitionTaskState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await runTaskAction(taskId, action, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  revalidatePath(projectRoutes(projectId).TASK_BOARD);
  revalidatePath(taskDetailRoute(projectId, taskId));
  return { success: true, error: null };
}

export type SubmitTaskState = {
  success: boolean;
  error: string | null;
  submissionId: number | null;
};

// POST /tasks/:id/submissions — dipakai baik untuk submit pertama kali
// (status ongoing) maupun submit ulang setelah revisi (status in_revision);
// server menerima keduanya langsung tanpa langkah "resume" terpisah.
// Me-return submissionId supaya UI bisa lanjut upload attachment sesudahnya.
export async function submitTaskAction(
  projectId: string,
  taskId: number,
  note: string | undefined,
): Promise<SubmitTaskState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const { data } = await submitTaskRequest(taskId, note, cookieHeader);

    revalidatePath(projectRoutes(projectId).TASK_BOARD);
    revalidatePath(taskDetailRoute(projectId, taskId));
    return { success: true, error: null, submissionId: data.id };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message, submissionId: null };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
      submissionId: null,
    };
  }
}

export type ReviewSubmissionState = {
  success: boolean;
  error: string | null;
};

// PATCH /submissions/:id/review — leader approve/minta revisi/tolak sebuah
// submission. Butuh submissionId (bukan taskId) sesuai kontrak server.
export async function reviewSubmissionAction(
  projectId: string,
  taskId: number,
  submissionId: number,
  reviewStatus: "approved" | "revision_requested" | "rejected",
  reviewNote: string | undefined,
): Promise<ReviewSubmissionState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await reviewSubmissionRequest(
      submissionId,
      { reviewStatus, reviewNote: reviewNote || undefined },
      cookieHeader,
    );
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  revalidatePath(projectRoutes(projectId).TASK_BOARD);
  revalidatePath(taskDetailRoute(projectId, taskId));
  return { success: true, error: null };
}

export type UploadUrlResult = {
  success: boolean;
  error: string | null;
  uploadUrl: string | null;
  objectKey: string | null;
};

// POST /submissions/:id/attachments/upload-url — minta presigned URL. Upload
// binary-nya sendiri dilakukan langsung dari browser (client component) ke
// uploadUrl, karena apiFetch hanya untuk request JSON lewat server.
export async function createAttachmentUploadUrlAction(
  submissionId: number,
  payload: CreateUploadUrlPayload,
): Promise<UploadUrlResult> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const { data } = await createAttachmentUploadUrlRequest(submissionId, payload, cookieHeader);
    return { success: true, error: null, uploadUrl: data.uploadUrl, objectKey: data.objectKey };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message, uploadUrl: null, objectKey: null };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
      uploadUrl: null,
      objectKey: null,
    };
  }
}

export type AttachmentActionState = {
  success: boolean;
  error: string | null;
  contentAttachment: SubmissionAttachment | null;
  fileAttachment: SubmissionAttachment | null;
};

// POST /submissions/:id/attachments — simpan metadata attachment. Dipanggil
// setelah file diupload ke uploadUrl (untuk file/image), atau langsung untuk
// attachment text/link.
export async function createAttachmentAction(
  projectId: string,
  taskId: number,
  submissionId: number,
  payload: CreateAttachmentPayload,
): Promise<AttachmentActionState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const { data } = await createAttachmentRequest(submissionId, payload, cookieHeader);
    revalidatePath(taskDetailRoute(projectId, taskId));
    return {
      success: true,
      error: null,
      contentAttachment: data.contentAttachment,
      fileAttachment: data.fileAttachment,
    };
  } catch (err) {
    const error =
      err instanceof ApiRequestError ? err.message : "Terjadi kesalahan tak terduga. Coba lagi.";
    return { success: false, error, contentAttachment: null, fileAttachment: null };
  }
}

export type DeleteAttachmentState = {
  success: boolean;
  error: string | null;
};

// DELETE /submissions/:id/attachments/:attachmentId
export async function deleteSubmissionAttachmentAction(
  projectId: string,
  taskId: number,
  submissionId: number,
  attachmentId: number,
): Promise<DeleteAttachmentState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await deleteSubmissionAttachmentRequest(submissionId, attachmentId, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  revalidatePath(taskDetailRoute(projectId, taskId));
  return { success: true, error: null };
}

export type DownloadUrlResult = {
  success: boolean;
  error: string | null;
  downloadUrl: string | null;
  fileName: string | null;
};

// GET /submissions/:id/attachments/:attachmentId/download-url — dipanggil
// tepat sebelum file dibuka, karena presigned URL cuma berlaku beberapa
// menit dan tidak boleh disimpan/dipakai ulang setelah expired.
export async function getAttachmentDownloadUrlAction(
  submissionId: number,
  attachmentId: number,
): Promise<DownloadUrlResult> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const { data } = await getAttachmentDownloadUrlRequest(submissionId, attachmentId, cookieHeader);
    return { success: true, error: null, downloadUrl: data.downloadUrl, fileName: data.fileName };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message, downloadUrl: null, fileName: null };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
      downloadUrl: null,
      fileName: null,
    };
  }
}

export type AssignTaskState = {
  success: boolean;
  error: string | null;
};

export async function assignTaskAction(
  projectId: string,
  taskId: number,
  targetUserId: number,
): Promise<AssignTaskState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await assignTaskRequest(taskId, targetUserId, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  revalidatePath(projectRoutes(projectId).TASK_BOARD);
  revalidatePath(taskDetailRoute(projectId, taskId));
  return { success: true, error: null };
}

export type UpdateTaskState = {
  success: boolean;
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function updateTaskAction(
  projectId: string,
  taskId: number,
  payload: UpdateTaskPayload,
): Promise<UpdateTaskState> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    await updateTaskRequest(taskId, payload, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Terjadi kesalahan tak terduga. Coba lagi." };
  }

  revalidatePath(taskDetailRoute(projectId, taskId));
  revalidatePath(projectRoutes(projectId).TASK_BOARD);
  return { success: true, error: null };
}

export type SwapRequestState = {
  success: boolean;
  error: string | null;
};

// Membuat permintaan tukar task. Penerima (requestedTo) bisa melihatnya lewat
// getMyIncomingSwapRequestsAction() di bawah, sama seperti alur InvitationBell.
export async function createSwapRequestAction(
  projectId: string,
  taskId: number,
  payload: CreateSwapRequestPayload,
): Promise<SwapRequestState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await createSwapRequestRequest(taskId, payload, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  revalidatePath(projectRoutes(projectId).TASK_BOARD);
  revalidatePath(taskDetailRoute(projectId, taskId));
  return { success: true, error: null };
}

// Daftar swap request yang menunggu respons user login — dipakai SwapRequestBell.
export async function getMyIncomingSwapRequestsAction(): Promise<TaskSwapRequestListItem[]> {
  return getIncomingSwapRequests();
}

export async function respondToSwapRequestAction(
  swapRequestId: number,
  status: "approved" | "rejected",
  projectId: string,
  taskId?: number,
  targetTaskId?: number | null,
): Promise<SwapRequestState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await respondSwapRequestRequest(swapRequestId, status, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  revalidatePath(projectRoutes(projectId).TASK_BOARD);
  if (taskId != null) {
    revalidatePath(taskDetailRoute(projectId, taskId));
  }
  if (targetTaskId != null) {
    revalidatePath(taskDetailRoute(projectId, targetTaskId));
  }
  revalidatePath(ROUTES.MY_TASK);
  return { success: true, error: null };
}

export async function createTaskAction(
  projectId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const priority = String(formData.get("priority") ?? "");
  const deadline = String(formData.get("deadline") ?? "");
  const values = { title, description, priority, deadline };

  const fieldErrors = validateCreateTaskFields(title, deadline, priority);
  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, error: null, fieldErrors, values };
  }

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await createTaskRequest(
      projectId,
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority.trim() ? Number(priority) : undefined,
        deadline: deadline.trim() || undefined,
      },
      cookieHeader,
    );
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message, values };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
      values,
    };
  }

  revalidatePath(projectRoutes(projectId).TASK_BOARD);
  return { success: true, error: null };
}

export type CommentActionState = {
  success: boolean;
  error: string | null;
};

export async function createTaskCommentAction(
  projectId: string,
  taskId: number,
  _prevState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const comment = String(formData.get("comment") ?? "").trim();

  if (!comment) {
    return { success: false, error: "Komentar tidak boleh kosong." };
  }
  if (comment.length > 1000) {
    return { success: false, error: "Komentar maksimal 1000 karakter." };
  }

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await createTaskCommentRequest(taskId, comment, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  revalidatePath(taskDetailRoute(projectId, taskId));
  return { success: true, error: null };
}

export async function deleteTaskCommentAction(
  projectId: string,
  taskId: number,
  commentId: number,
): Promise<CommentActionState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await deleteTaskCommentRequest(commentId, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  revalidatePath(taskDetailRoute(projectId, taskId));
  return { success: true, error: null };
}