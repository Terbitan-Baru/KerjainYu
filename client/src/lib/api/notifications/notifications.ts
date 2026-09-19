import "server-only";
import { cookies } from "next/headers";
import { NotificationSummary } from "@/types/notification";
import { apiFetch } from "../fetcher";

const NOTIFICATIONS_PATH = "/notifications";

export function getMyNotificationsRequest(cookie: string) {
  return apiFetch<NotificationSummary>(`${NOTIFICATIONS_PATH}/me`, { cookie });
}

// Badge lonceng cuma butuh angkanya; kalau fetch gagal, anggap 0 daripada
// bikin seluruh layout gagal render gara-gara badge notifikasi.
export async function getUnreadNotificationCount(): Promise<number> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const { data } = await getMyNotificationsRequest(cookieHeader);
    return data.unreadNotificationCount;
  } catch {
    return 0;
  }
}

export function markAllNotificationsAsReadRequest(cookie: string) {
  return apiFetch<{ updatedCount: number }>(`${NOTIFICATIONS_PATH}/read-all`, {
    method: "POST",
    cookie,
  });
}

export function markNotificationAsReadRequest(id: number, cookie: string) {
  return apiFetch<void>(`${NOTIFICATIONS_PATH}/${id}/read`, {
    method: "POST",
    cookie,
  });
}

export function deleteNotificationRequest(id: number, cookie: string) {
  return apiFetch<void>(`${NOTIFICATIONS_PATH}/${id}`, {
    method: "DELETE",
    cookie,
  });
}
