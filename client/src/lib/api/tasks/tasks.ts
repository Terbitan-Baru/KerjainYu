import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { MyTask, Task, TaskDetail, TaskComment, TaskSubmission } from "@/types/task";
import { apiFetch } from "../fetcher";

const MY_TASKS_PATH = "/tasks";

export function getMyTasksRequest(cookie: string) {
  return apiFetch<MyTask[]>(MY_TASKS_PATH, { cookie });
}

export const getMyTasks = cache(async (): Promise<MyTask[]> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const { data } = await getMyTasksRequest(cookieHeader);
    return data;
  } catch {
    return [];
  }
});

function projectTasksPath(projectId: string) {
  return `/projects/${projectId}/tasks`;
}

function taskPath(taskId: number) {
  return `/tasks/${taskId}`;
}

export function getProjectTasksRequest(projectId: string, cookie: string) {
  return apiFetch<Task[]>(projectTasksPath(projectId), { cookie });
}

export const getProjectTasks = cache(
  async (projectId: string): Promise<Task[]> => {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    try {
      const { data } = await getProjectTasksRequest(projectId, cookieHeader);
      return data;
    } catch {
      return [];
    }
  },
);

export type CreateTaskPayload = {
  title: string;
  description?: string;
  priority?: number;
  deadline?: string;
};

export function createTaskRequest(
  projectId: string,
  payload: CreateTaskPayload,
  cookie: string,
) {
  return apiFetch<Task>(projectTasksPath(projectId), {
    method: "POST",
    body: payload,
    cookie,
  });
}

export function claimTaskRequest(taskId: number, cookie: string) {
  return apiFetch<Task>(`${taskPath(taskId)}/claim`, {
    method: "PATCH",
    cookie,
  });
}

export function assignTaskRequest(
  taskId: number,
  userId: number,
  cookie: string,
) {
  return apiFetch<Task>(`${taskPath(taskId)}/assign`, {
    method: "PATCH",
    body: { userId },
    cookie,
  });
}

export type UpdateTaskPayload = Partial<{
  title: string;
  description: string;
  priority: number;
  deadline: string;
}>;

export function updateTaskRequest(
  taskId: number,
  payload: UpdateTaskPayload,
  cookie: string,
) {
  return apiFetch<Task>(taskPath(taskId), {
    method: "PATCH",
    body: payload,
    cookie,
  });
}

export function startTaskRequest(taskId: number, cookie: string) {
  return apiFetch<Task>(`${taskPath(taskId)}/ongoing`, {
    method: "PATCH",
    cookie,
  });
}

export function submitTaskRequest(
  taskId: number,
  note: string | undefined,
  cookie: string,
) {
  return apiFetch<TaskSubmission>(`${taskPath(taskId)}/submissions`, {
    method: "POST",
    body: { note: note || undefined, contents: [] },
    cookie,
  });
}

export function getTaskDetailRequest(taskId: number, cookie: string) {
  return apiFetch<TaskDetail>(taskPath(taskId), { cookie });
}

export const getTaskDetailData = cache(
  async (taskId: number): Promise<TaskDetail | null> => {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    try {
      const { data } = await getTaskDetailRequest(taskId, cookieHeader);
      return data;
    } catch {
      return null;
    }
  },
);

function taskCommentsPath(taskId: number) {
  return `${taskPath(taskId)}/comments`;
}

export function getTaskCommentsRequest(taskId: number, cookie: string) {
  return apiFetch<TaskComment[]>(taskCommentsPath(taskId), { cookie });
}

export const getTaskComments = cache(
  async (taskId: number): Promise<TaskComment[]> => {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    try {
      const { data } = await getTaskCommentsRequest(taskId, cookieHeader);
      return data;
    } catch {
      return [];
    }
  },
);

export function createTaskCommentRequest(
  taskId: number,
  comment: string,
  cookie: string,
) {
  return apiFetch<TaskComment>(taskCommentsPath(taskId), {
    method: "POST",
    body: { comment },
    cookie,
  });
}

export function deleteTaskCommentRequest(commentId: number, cookie: string) {
  return apiFetch<null>(`/comments/${commentId}`, {
    method: "DELETE",
    cookie,
  });
}