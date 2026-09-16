"use client";

import Link from "next/link";
import { Archive, HelpCircle, Settings, X, FolderOpen } from "lucide-react";
import { ROUTES, projectRoutes } from "@/lib/routes";

type MoreSheetProps = {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
};

const MAIN_SHEET_ITEMS = [
    { label: "Pusat Bantuan", href: ROUTES.HELP_CENTER, icon: HelpCircle },
    { label: "Arsip Proyek", href: ROUTES.ARCHIVE, icon: Archive },
];

function getProjectSheetItems(projectId: string) {
    const routes = projectRoutes(projectId);
    return [
    { label: "Berkas", href: routes.LINKS, icon: FolderOpen },
    { label: "Pengaturan", href: routes.SETTINGS, icon: Settings },
    ];
}

export default function MoreSheet({ isOpen, onClose, projectId }: MoreSheetProps) {
    if (!isOpen) return null;

    const items = projectId ? getProjectSheetItems(projectId) : MAIN_SHEET_ITEMS;

    return (
        <div className="fixed inset-0 z-50">
            {/* Overlay */}
            <div
                aria-hidden="true"
                onClick={onClose}
                className="absolute inset-0 bg-black/40"
            />

            {/* Sheet */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Menu lainnya"
                className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-card pb-6 pt-2"
            >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />

                <div className="flex items-center justify-between px-4 pb-2">
                    <span className="text-sm font-inter font-semibold text-foreground">Lainnya</span>
                    <button type="button" aria-label="Tutup menu" onClick={onClose}>
                        <X className="size-5 text-muted" />
                    </button>
                </div>

                <div className="flex flex-col">
                    {items.map(({ label, href, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-label={`Buka halaman ${label}`}
                            onClick={onClose}
                            className="group flex items-center gap-3 px-4 py-3 text-sm font-inter text-foreground transition-colors duration-200 hover:bg-status-todo-bg"
                        >
                            <Icon className="size-5 text-muted transition-colors duration-200 group-hover:text-foreground" />
                            {label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}