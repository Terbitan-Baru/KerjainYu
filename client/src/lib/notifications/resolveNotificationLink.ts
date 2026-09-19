"use server";

import { cookies } from "next/headers";
import { Notification } from "@/types/notification";
import { getTaskDetailRequest } from "@/lib/api/tasks/tasks";
import { taskDetailRoute, projectRoutes } from "@/lib/routes";

// Dipanggil lazy (cuma pas user klik satu row), bukan buat pre-resolve semua
// item di list -- fetch network di sini per-klik, jangan panggil buat 50 item
// sekaligus pas render.
export async function resolveNotificationLink(
  notification: Notification,
): Promise<string | null> {
  if (notification.referenceId === null) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  switch (notification.referenceType) {
    case "task": {
      try {
        const { data: task } = await getTaskDetailRequest(notification.referenceId, cookieHeader);
        return taskDetailRoute(String(task.projectId), task.id);
      } catch {
        return null;
      }
    }
    case "submission":
    case "swap_request": {
      return null;
    }
    case "project":
      return projectRoutes(String(notification.referenceId)).TEAM;
    default:
      return null;
  }
}
