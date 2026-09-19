"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import NotificationModal from "@/components/layout/NotificationModal";
import { useNotificationCount } from "@/contexts/NotificationCountContext";

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { count } = useNotificationCount();

    function handleOpen() {
        setIsOpen(true);
    }

    return (
        <>
            <button
                type="button"
                aria-label={
                    count > 0 ? `Notifikasi, ${count} belum dibaca` : "Notifikasi"
                }
                onClick={handleOpen}
                className="relative"
            >
                <Bell size={22} className="text-muted" />
                {count > 0 && (
                    <span
                        aria-hidden="true"
                        className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-blocked-text px-1 text-[10px] font-inter font-semibold text-white"
                    >
                        {count > 99 ? "99+" : count}
                    </span>
                )}
            </button>

            <NotificationModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}