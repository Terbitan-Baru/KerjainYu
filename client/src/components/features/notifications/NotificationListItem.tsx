"use client";

import {
  ClipboardList,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  AlarmClock,
  FileText,
  Bell,
  X,
  LucideIcon,
} from "lucide-react";
import { Notification } from "@/types/notification";
import { formatRelativeTime } from "@/lib/notifications/relativeTime";
import { cn } from "@/utils/cn";

type NotificationListItemProps = {
  notification: Notification;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
  onNavigate: (notification: Notification) => void;
};

type IconConfig = {
  icon: LucideIcon;
  bg: string;
  text: string;
};

function getIconConfig(notification: Notification): IconConfig {
  switch (notification.type) {
    case "task_assigned":
      return { icon: ClipboardList, bg: "bg-role-member-bg", text: "text-role-member-text" };
    case "task_swapped":
    case "swap_requested":
      return { icon: ArrowLeftRight, bg: "bg-status-progress-bg", text: "text-status-progress-text" };
    case "submission_pending":
      return { icon: Clock, bg: "bg-status-progress-bg", text: "text-status-progress-text" };
    case "submission_reviewed":
      if (notification.message.toLowerCase().includes("ditolak") || notification.message.toLowerCase().includes("rejected")) {
        return { icon: CheckCircle2, bg: "bg-status-blocked-bg", text: "text-status-blocked-text" };
      }
      return { icon: CheckCircle2, bg: "bg-status-done-bg", text: "text-status-done-text" };
    case "comment_added":
      return { icon: MessageSquare, bg: "bg-status-todo-bg", text: "text-status-todo-text" };
    case "member_added":
    case "member_invited":
      return { icon: UserPlus, bg: "bg-role-guest-bg", text: "text-role-guest-text" };
    case "deadline_reminder":
      return { icon: AlarmClock, bg: "bg-status-blocked-bg", text: "text-status-blocked-text" };
    case "appeal_updated":
      return { icon: FileText, bg: "bg-status-progress-bg", text: "text-status-progress-text" };
    default:
      return { icon: Bell, bg: "bg-status-todo-bg", text: "text-status-todo-text" };
  }
}

export default function NotificationListItem({
  notification,
  onRead,
  onDelete,
  onNavigate,
}: NotificationListItemProps) {
  const { icon: Icon, bg, text } = getIconConfig(notification);

  function handleClick() {
    if (!notification.isRead) {
      onRead(notification.id);
    }
    onNavigate(notification);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(notification.id);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-status-todo-bg md:p-3"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          bg,
        )}
      >
        <Icon className={cn("size-4.5", text)} />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-inter text-sm",
            notification.isRead ? "font-normal text-muted" : "font-medium text-foreground",
          )}
        >
          {notification.message}
        </p>
        <p className="mt-0.5 font-inter text-xs text-muted">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 pt-1">
        {!notification.isRead && (
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
        )}
        <button
          type="button"
          aria-label="Hapus notifikasi"
          onClick={handleDelete}
          className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:text-status-blocked-text"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
