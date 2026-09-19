"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import InvitationListItem from "@/components/features/invitations/InvitationListItem";
import SwapRequestListItem from "@/components/features/task-detail/SwapRequestListItem";
import NotificationListItem from "@/components/features/notifications/NotificationListItem";
import { getMyInvitationsAction, respondToInvitationAction } from "@/app/(main)/invitations/actions";
import {
    getMyIncomingSwapRequestsAction,
    respondToSwapRequestAction,
} from "@/app/(main)/projects/[projectId]/task-board/actions";
import {
    getMyNotificationsAction,
    markNotificationAsReadAction,
    markAllNotificationsAsReadAction,
    deleteNotificationAction,
} from "@/app/(main)/notifications/actions";
import { resolveNotificationLink } from "@/lib/notifications/resolveNotificationLink";
import { useNotificationCount } from "@/contexts/NotificationCountContext";
import { Invitation } from "@/types/team";
import { TaskSwapRequestListItem } from "@/types/task";
import { Notification } from "@/types/notification";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/utils/cn";

type NotificationModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

type Tab = "notifications" | "invitations" | "swaps";

const NOTIFICATIONS_PREVIEW_LIMIT = 8;

// Satu modal notifikasi buat undangan project & permintaan tukar task,
// gantiin dua modal terpisah (AcceptInvitationModal + SwapRequestModal) yang
// dulu sama-sama selalu mounted di topbar tiap breakpoint sekaligus.
export default function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
    const router = useRouter();
    const { resetCount, restoreCount, subscribe } = useNotificationCount();
    const [tab, setTab] = useState<Tab>("notifications");

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notificationError, setNotificationError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [invitationError, setInvitationError] = useState<string | null>(null);
    const [respondingInvitationId, setRespondingInvitationId] = useState<number | null>(null);
    const [invitationErrors, setInvitationErrors] = useState<Record<number, string>>({});

    const [swapRequests, setSwapRequests] = useState<TaskSwapRequestListItem[]>([]);
    const [swapError, setSwapError] = useState<string | null>(null);
    const [respondingSwapId, setRespondingSwapId] = useState<number | null>(null);
    const [swapErrors, setSwapErrors] = useState<Record<number, string>>({});

    const [isLoading, startLoad] = useTransition();
    const [isResponding, startRespond] = useTransition();

    // Muat ulang ketiga daftar tiap kali modal dibuka, biar badge/tab selalu segar.
    useEffect(() => {
        if (!isOpen) return;

        startLoad(async () => {
            setNotificationError(null);
            setInvitationError(null);
            setSwapError(null);

            const [notificationResult, invitationResult, swapResult] = await Promise.allSettled([
                getMyNotificationsAction(),
                getMyInvitationsAction(),
                getMyIncomingSwapRequestsAction(),
            ]);

            if (notificationResult.status === "fulfilled") {
                setNotifications(notificationResult.value.notifications);
                setUnreadCount(notificationResult.value.unreadNotificationCount);
            } else {
                setNotificationError("Gagal memuat notifikasi. Coba lagi.");
            }

            if (invitationResult.status === "fulfilled") {
                setInvitations(invitationResult.value);
            } else {
                setInvitationError("Gagal memuat undangan. Coba lagi.");
            }

            if (swapResult.status === "fulfilled") {
                setSwapRequests(swapResult.value);
            } else {
                setSwapError("Gagal memuat permintaan tukar task. Coba lagi.");
            }
        });
    }, [isOpen]);

    // Notifikasi baru yang datang live lewat SSE selagi modal terbuka ikut
    // di-prepend, biar tab ini konsisten dengan halaman /notifications.
    useEffect(() => {
        return subscribe((notification) => {
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });
    }, [subscribe]);

    function handleReadNotification(id: number) {
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
            }
        });
    }

    function handleDeleteNotification(id: number) {
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
            }
        });
    }

    async function handleNavigateNotification(notification: Notification) {
        const link = await resolveNotificationLink(notification);
        onClose();
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

        startRespond(async () => {
            const result = await markAllNotificationsAsReadAction();
            if (!result.success) {
                setNotifications(previousNotifications);
                setUnreadCount(previousCount);
                restoreCount(previousCount);
            }
        });
    }

    function handleRespondInvitation(invitation: Invitation, status: "accept" | "reject") {
        setRespondingInvitationId(invitation.id);
        setInvitationErrors((prev) => {
            const next = { ...prev };
            delete next[invitation.id];
            return next;
        });

        startRespond(async () => {
            const result = await respondToInvitationAction(invitation.id, status);
            setRespondingInvitationId(null);

            if (!result.success) {
                setInvitationErrors((prev) => ({
                    ...prev,
                    [invitation.id]: result.error ?? "Gagal merespons undangan.",
                }));
                return;
            }

            setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
        });
    }

    function handleRespondSwap(request: TaskSwapRequestListItem, status: "approved" | "rejected") {
        setRespondingSwapId(request.id);
        setSwapErrors((prev) => {
            const next = { ...prev };
            delete next[request.id];
            return next;
        });

        startRespond(async () => {
            const result = await respondToSwapRequestAction(
                request.id,
                status,
                String(request.task.projectId),
                request.task.id,
                request.targetTask?.id ?? null,
            );
            setRespondingSwapId(null);

            if (!result.success) {
                setSwapErrors((prev) => ({
                    ...prev,
                    [request.id]: result.error ?? "Gagal merespons permintaan tukar task.",
                }));
                return;
            }

            setSwapRequests((prev) => prev.filter((r) => r.id !== request.id));
        });
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Notifikasi">
            <div className="flex flex-col gap-3">
                <div className="flex gap-1 rounded-lg bg-status-todo-bg p-1">
                    <button
                        type="button"
                        onClick={() => setTab("notifications")}
                        className={cn(
                            "flex-1 rounded-md px-2 py-1.5 text-sm font-inter font-medium transition-colors",
                            tab === "notifications"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted hover:text-foreground"
                        )}
                    >
                        Notifikasi{unreadCount > 0 ? ` (${unreadCount})` : ""}
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("invitations")}
                        className={cn(
                            "flex-1 rounded-md px-2 py-1.5 text-sm font-inter font-medium transition-colors",
                            tab === "invitations"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted hover:text-foreground"
                        )}
                    >
                        Undangan{invitations.length > 0 ? ` (${invitations.length})` : ""}
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("swaps")}
                        className={cn(
                            "flex-1 rounded-md px-2 py-1.5 text-sm font-inter font-medium transition-colors",
                            tab === "swaps"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted hover:text-foreground"
                        )}
                    >
                        Tukar Task{swapRequests.length > 0 ? ` (${swapRequests.length})` : ""}
                    </button>
                </div>

                <div className="flex flex-col gap-1.5">
                    {isLoading && (
                        <p className="py-6 text-center text-sm font-inter text-muted">Memuat...</p>
                    )}

                    {!isLoading && tab === "notifications" && (
                        <>
                            {notificationError && (
                                <p className="py-6 text-center text-sm font-inter text-status-blocked-text">
                                    {notificationError}
                                </p>
                            )}
                            {!notificationError && notifications.length === 0 && (
                                <p className="py-6 text-center text-sm font-inter text-muted">
                                    Belum ada notifikasi.
                                </p>
                            )}
                            {!notificationError && notifications.length > 0 && unreadCount > 0 && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleMarkAllAsRead}
                                        className="rounded-lg px-3 py-1.5 text-sm font-inter font-medium text-muted transition-colors hover:bg-status-todo-bg hover:text-foreground"
                                    >
                                        Tandai semua dibaca
                                    </button>
                                </div>
                            )}
                            {!notificationError &&
                                notifications.slice(0, NOTIFICATIONS_PREVIEW_LIMIT).map((notification) => (
                                    <NotificationListItem
                                        key={notification.id}
                                        notification={notification}
                                        onRead={handleReadNotification}
                                        onDelete={handleDeleteNotification}
                                        onNavigate={handleNavigateNotification}
                                    />
                                ))}
                            {!notificationError && notifications.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        router.push(ROUTES.NOTIFICATION);
                                    }}
                                    className="mt-1 rounded-lg px-3 py-2 text-center text-sm font-inter font-medium text-muted transition-colors hover:bg-status-todo-bg hover:text-foreground"
                                >
                                    Lihat semua
                                </button>
                            )}
                        </>
                    )}

                    {!isLoading && tab === "invitations" && (
                        <>
                            {invitationError && (
                                <p className="py-6 text-center text-sm font-inter text-status-blocked-text">
                                    {invitationError}
                                </p>
                            )}
                            {!invitationError && invitations.length === 0 && (
                                <p className="py-6 text-center text-sm font-inter text-muted">
                                    Tidak ada undangan proyek saat ini.
                                </p>
                            )}
                            {!invitationError &&
                                invitations.map((invitation) => (
                                    <InvitationListItem
                                        key={invitation.id}
                                        invitation={invitation}
                                        isResponding={isResponding && respondingInvitationId === invitation.id}
                                        error={invitationErrors[invitation.id] ?? null}
                                        onAccept={(inv) => handleRespondInvitation(inv, "accept")}
                                        onReject={(inv) => handleRespondInvitation(inv, "reject")}
                                    />
                                ))}
                        </>
                    )}

                    {!isLoading && tab === "swaps" && (
                        <>
                            {swapError && (
                                <p className="py-6 text-center text-sm font-inter text-status-blocked-text">
                                    {swapError}
                                </p>
                            )}
                            {!swapError && swapRequests.length === 0 && (
                                <p className="py-6 text-center text-sm font-inter text-muted">
                                    Tidak ada permintaan tukar task saat ini.
                                </p>
                            )}
                            {!swapError &&
                                swapRequests.map((request) => (
                                    <SwapRequestListItem
                                        key={request.id}
                                        request={request}
                                        isResponding={isResponding && respondingSwapId === request.id}
                                        error={swapErrors[request.id] ?? null}
                                        onAccept={(r) => handleRespondSwap(r, "approved")}
                                        onReject={(r) => handleRespondSwap(r, "rejected")}
                                    />
                                ))}
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}