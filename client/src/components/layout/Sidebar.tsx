"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Folder, ListChecks, UserPlus, HelpCircle, Archive, LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { getInitials } from "@/utils/getInitials";
import { APP_NAME } from "@/lib/constants";
import Link from "next/link";
import { ROUTES, getProjectIdFromPathname } from "@/lib/routes";
import AddMemberModal from "@/components/features/team/AddMemberModal";

type NavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
    { label: "Projects", href: ROUTES.PROJECTS, icon: Folder },
    { label: "My Tasks", href: ROUTES.MY_TASK, icon: ListChecks },
];


const SECONDARY_NAV_ITEMS: NavItem[] = [
    { label: "Pusat Bantuan", href: ROUTES.HELP_CENTER, icon: HelpCircle },
    { label: "Arsip Proyek", href: ROUTES.ARCHIVE, icon: Archive },
];

type SidebarNavLinkProps = {
    item: NavItem;
    isActive: boolean;
    isIconOnly: boolean;
};

function SidebarNavLink({ item, isActive, isIconOnly }: SidebarNavLinkProps) {
    const { label, href, icon: Icon } = item;

    return (
        <Link
            href={href}
            aria-label={`Buka halaman ${label}`}
            aria-current={isActive ? "page" : undefined}
            title={isIconOnly ? label : undefined}
            className={cn(
                "group flex items-center rounded-lg transition-colors duration-200",
                isIconOnly ? "justify-center size-9 mx-auto" : "gap-3 px-3 py-2",
                isActive ? "bg-status-progress-bg" : "hover:bg-status-todo-bg"
            )}
        >
            <Icon
                className={cn(
                    "size-4.5 transition-colors duration-200",
                    isActive ? "text-status-progress-text" : "text-muted group-hover:text-foreground"
                )}
            />
            {!isIconOnly && (
                <span
                    className={cn(
                        "text-sm font-inter font-medium transition-colors duration-200",
                        isActive ? "text-status-progress-text" : "text-foreground"
                    )}
                >
                    {label}
                </span>
            )}
        </Link>
    );
}

type SidebarProps = {
    variant?: "icon-only" | "full";
};

export default function Sidebar({ variant = "full" }: SidebarProps) {
    const pathname = usePathname();
    const isIconOnly = variant === "icon-only";
    const activeProjectId = getProjectIdFromPathname(pathname);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    return (
        <>
            <aside
                aria-label="Sidebar navigasi"
                className={cn(
                    "h-full shrink-0 border-r border-r-border bg-background flex flex-col py-4",
                    isIconOnly ? "w-16 items-center" : "w-60 px-4"
                )}
            >
                {/* Brand */}
                <div className={cn("flex items-center mb-6", isIconOnly ? "justify-center" : "gap-2 px-1")}>
                    <div className="size-8 rounded-lg bg-status-progress-bg flex items-center justify-center text-xs font-semibold text-status-progress-text">
                        {getInitials(APP_NAME)}
                    </div>
                    {!isIconOnly && (
                        <span className="text-sm font-inter font-semibold text-foreground">
                            {APP_NAME}
                        </span>
                    )}
                </div>

                {/* Nav */}
                <nav aria-label="Navigasi utama" className="flex flex-col gap-1 w-full">
                    {NAV_ITEMS.map((item) => (
                        <SidebarNavLink
                            key={item.href}
                            item={item}
                            isActive={pathname === item.href}
                            isIconOnly={isIconOnly}
                        />
                    ))}
                </nav>

                <div className="flex-1" />

                {/* Bottom actions */}
                <div className="flex flex-col gap-1 w-full pt-5 border-t border-t-border">
                    <button
                        type="button"
                        aria-label="Invite member"
                        onClick={() => setIsInviteModalOpen(true)}
                        disabled={!activeProjectId}
                        title={activeProjectId ? undefined : "Buka sebuah proyek dulu untuk mengundang anggota"}
                        className={cn(
                            "flex items-center rounded-lg bg-primary text-primary-foreground transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-50",
                            isIconOnly ? "justify-center size-9 mx-auto" : "gap-2 px-3 py-2"
                        )}
                    >
                        <UserPlus className="size-4.5" />
                        {!isIconOnly && <span className="text-sm font-inter font-medium">Invite Member</span>}
                    </button>

                    {SECONDARY_NAV_ITEMS.map((item) => (
                        <SidebarNavLink
                            key={item.href}
                            item={item}
                            isActive={pathname === item.href}
                            isIconOnly={isIconOnly}
                        />
                    ))}
                </div>
            </aside>
            {activeProjectId && (
                <AddMemberModal
                    projectId={activeProjectId}
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                />
            )}
        </>
    );
}