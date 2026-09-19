"use server";

import { cookies } from "next/headers";
import { ApiRequestError } from "@/lib/api/apiRequestError";
import {
  getMyNotificationsRequest,
  getUnreadNotificationCount,
  markAllNotificationsAsReadRequest,
  markNotificationAsReadRequest,
  deleteNotificationRequest,
} from "@/lib/api/notifications/notifications";
import { NotificationSummary } from "@/types/notification";

export async function getUnreadNotificationCountAction(): Promise<number> {
  return getUnreadNotificationCount();
}

export async function getMyNotificationsAction(): Promise<NotificationSummary> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const { data } = await getMyNotificationsRequest(cookieHeader);
    return data;
  } catch {
    return { notifications: [], unreadNotificationCount: 0 };
  }
}

export type MarkAllNotificationsAsReadState = {
  success: boolean;
  error: string | null;
};

// Dipanggil pas badge di-reset di client (buka NotificationModal), supaya
// status "read" beneran ke-persist di DB -- bukan cuma di state React yang
// hilang lagi begitu di-refresh.
export async function markAllNotificationsAsReadAction(): Promise<MarkAllNotificationsAsReadState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await markAllNotificationsAsReadRequest(cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  return { success: true, error: null };
}

export type MarkNotificationAsReadState = {
  success: boolean;
  error: string | null;
};

export async function markNotificationAsReadAction(
  id: number,
): Promise<MarkNotificationAsReadState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await markNotificationAsReadRequest(id, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  return { success: true, error: null };
}

export type DeleteNotificationState = {
  success: boolean;
  error: string | null;
};

export async function deleteNotificationAction(
  id: number,
): Promise<DeleteNotificationState> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    await deleteNotificationRequest(id, cookieHeader);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Terjadi kesalahan tak terduga. Coba lagi.",
    };
  }

  return { success: true, error: null };
}
