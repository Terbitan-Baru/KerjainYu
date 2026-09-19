"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { API_BASE_URL } from "@/lib/env";
import { Notification } from "@/types/notification";

type NotificationCountContextValue = {
  count: number;
  resetCount: () => void;
  restoreCount: (count: number) => void;
  subscribe: (callback: (notification: Notification) => void) => () => void;
};

const NotificationCountContext = createContext<NotificationCountContextValue | undefined>(
  undefined,
);

type NotificationCountProviderProps = {
  initialCount: number;
  children: ReactNode;
};

// Sumber angka badge: unreadNotificationCount dari GET /notifications/me (fetch awal,
// sekali per navigasi top-level lewat MainLayout), lalu naik live lewat SSE
// /notifications/stream setiap notifyUser() dipanggil di backend. Sengaja TIDAK
// gabung dengan count invitations/swap pending -- itu computed sudah lain, dan
// menggabungkannya berarti request tambahan di setiap page load.
export function NotificationCountProvider({
  initialCount,
  children,
}: NotificationCountProviderProps) {
  const [count, setCount] = useState(initialCount);
  const sourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Set<(notification: Notification) => void>>(new Set());

  useEffect(() => {
    if (!API_BASE_URL) return;

    const source = new EventSource(`${API_BASE_URL}/notifications/stream`, {
      withCredentials: true,
    });
    sourceRef.current = source;

    // Payload SSE berisi notifikasi utuh (lihat notification.controller.ts ->
    // notificationEmitter). Parse sekali di sini, lalu pakai buat dua hal:
    // increment badge count, dan broadcast ke listener (mis. halaman/list
    // notifikasi) yang mau prepend item baru secara live.
    source.onmessage = (event) => {
      setCount((prev) => prev + 1);

      try {
        const notification: Notification = JSON.parse(event.data);
        listenersRef.current.forEach((listener) => listener(notification));
      } catch {
        // Payload tidak valid -- badge tetap naik, cuma listener yang di-skip.
      }
    };

    // EventSource otomatis reconnect sendiri kalau koneksi putus (network blip,
    // server restart) -- jangan close manual di sini.
    source.onerror = () => {};

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, []);

  function resetCount() {
    setCount(0);
  }

  // Dipakai NotificationBell buat rollback kalau markAllNotificationsAsReadAction
  // gagal, supaya badge gak salah nunjukin 0 padahal masih ada yang unread di DB.
  function restoreCount(previousCount: number) {
    setCount(previousCount);
  }

  // Dipakai UI daftar notifikasi (modal/halaman) buat dengar notifikasi baru
  // secara live tanpa buka EventSource kedua. Return unsubscribe function.
  function subscribe(callback: (notification: Notification) => void) {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }

  return (
    <NotificationCountContext.Provider value={{ count, resetCount, restoreCount, subscribe }}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useNotificationCount(): NotificationCountContextValue {
  const context = useContext(NotificationCountContext);

  if (context === undefined) {
    throw new Error(
      "useNotificationCount must be used within a NotificationCountProvider",
    );
  }

  return context;
}
