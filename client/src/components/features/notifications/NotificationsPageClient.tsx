"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NotificationListItem from "@/components/features/notifications/NotificationListItem";
import { resolveNotificationLink } from "@/lib/notifications/resolveNotificationLink";
import { useNotificationCount } from "@/contexts/NotificationCountContext";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  deleteNotificationAction,
} from "@/app/(main)/notifications/actions";
import { Notification, NotificationSummary } from "@/types/notification";
import { cn } from "@/utils/cn";

type NotificationsPageClientProps = {
  initialSummary: NotificationSummary;
};

type FilterTab = "all" | "unread";

export default function NotificationsPageClient({
  initialSummary,
}: NotificationsPageClientProps) {
  const router = useRouter();
  const { resetCount, restoreCount, subscribe } = useNotificationCount();

  const [notifications, setNotifications] = useState<Notification[]>(initialSummary.notifications);
  const [unreadCount, setUnreadCount] = useState(initialSummary.unreadNotificationCount);
  const [tab, setTab] = useState<FilterTab>("all");
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, startMarkAll] = useTransition();

  // Live: notifikasi baru dari SSE di-prepend ke atas list tanpa refetch.
  useEffect(() => {
    return subscribe((notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
  }, [subscribe]);

  function handleRead(id: number) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    markNotificationAsReadAction(id).then((result) => {
      if (!result.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
        );
        setUnreadCount((prev) => prev + 1);
        setError(result.error);
      }
    });
  }

  function handleDelete(id: number) {
    const previous = notifications;
    const deleted = previous.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (deleted && !deleted.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    deleteNotificationAction(id).then((result) => {
      if (!result.success) {
        setNotifications(previous);
        if (deleted && !deleted.isRead) {
          setUnreadCount((prev) => prev + 1);
        }
        setError(result.error);
      }
    });
  }

  async function handleNavigate(notification: Notification) {
    const link = await resolveNotificationLink(notification);
    if (link) {
      router.push(link);
    }
  }

  function handleMarkAllAsRead() {
    const previousCount = unreadCount;
    const previousNotifications = notifications;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    resetCount();

    startMarkAll(async () => {
      const result = await markAllNotificationsAsReadAction();
      if (!result.success) {
        setNotifications(previousNotifications);
        setUnreadCount(previousCount);
        restoreCount(previousCount);
        setError(result.error);
      }
    });
  }

  const visibleNotifications =
    tab === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-status-todo-bg p-1">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-inter font-medium transition-colors",
              tab === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-inter font-medium transition-colors",
              tab === "unread"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            Belum dibaca{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-inter font-medium text-muted transition-colors hover:bg-status-todo-bg hover:text-foreground disabled:opacity-60"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {error && (
          <p className="py-6 text-center text-sm font-inter text-status-blocked-text">
            {error}
          </p>
        )}

        {!error && visibleNotifications.length === 0 && (
          <p className="py-6 text-center text-sm font-inter text-muted">
            {tab === "unread" ? "Tidak ada notifikasi yang belum dibaca." : "Belum ada notifikasi."}
          </p>
        )}

        {!error &&
          visibleNotifications.map((notification) => (
            <div key={notification.id} className="animate-auth-fade-in">
              <NotificationListItem
                notification={notification}
                onRead={handleRead}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
