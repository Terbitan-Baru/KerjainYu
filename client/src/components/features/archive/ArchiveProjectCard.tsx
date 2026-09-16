"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ArchiveRestore, Loader2 } from "lucide-react";
import { Project } from "@/types/project";
import { cn } from "@/utils/cn";
import { getInitials } from "@/utils/getInitials";
import { unarchiveProjectAction } from "@/app/(main)/archive/actions";
import RestoreProjectDialog from "@/components/features/archive/RestoreProjectDialog";

type ArchiveProjectCardProps = {
    project: Project;
    canManage: boolean;
};

const STATUS_STYLE: Record<Project["status"], string> = {
    ongoing: "bg-status-progress-bg text-status-progress-text",
    completed: "bg-status-done-bg text-status-done-text",
};

const STATUS_LABEL: Record<Project["status"], string> = {
    ongoing: "Berlangsung",
    completed: "Selesai",
};

function formatDeadline(deadline: string) {
    return new Date(deadline).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function ArchiveProjectCard({ project, canManage }: ArchiveProjectCardProps) {
    const router = useRouter();
    const members = project.members ?? [];
    const leader = members.find((member) => member.role === "leader");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleConfirmRestore() {
        setError(null);
        startTransition(async () => {
            const result = await unarchiveProjectAction(String(project.id));
            if (!result.success) {
                setError(result.error ?? "Gagal mengaktifkan kembali proyek.");
                return;
            }
            setIsDialogOpen(false);
            router.refresh();
        });
    }

    return (
        <div className="rounded-xl border border-border bg-card p-4 opacity-90 transition-opacity hover:opacity-100 sm:p-5">
            <Link
                href={`/projects/${project.id}`}
                aria-label={`Buka proyek ${project.title}`}
                className="block"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <h3
                        title={project.title}
                        className="min-w-0 truncate font-inter text-base font-semibold text-foreground sm:text-lg"
                    >
                        {project.title}
                    </h3>
                    <span
                        className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-inter font-medium",
                            STATUS_STYLE[project.status]
                        )}
                    >
                        {STATUS_LABEL[project.status]}
                    </span>
                </div>

                {/* Meta */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-inter text-muted sm:text-sm">
                    <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 sm:size-4" />
                        {formatDeadline(project.deadline)}
                    </span>

                    {leader && (
                        <span>
                            Leader: <span className="text-foreground">{leader.fullName ?? leader.username}</span>
                        </span>
                    )}
                </div>
            </Link>

            {/* Footer: avatar anggota + aksi restore */}
            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex -space-x-2">
                    {members.slice(0, 4).map((member) => (
                        <div
                            key={member.id}
                            title={member.fullName ?? member.username}
                            className={cn(
                                "flex size-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-inter font-semibold sm:size-8 sm:text-xs",
                                member.role === "leader"
                                    ? "bg-role-lead-bg text-role-lead-text"
                                    : "bg-role-member-bg text-role-member-text"
                            )}
                        >
                            {getInitials(member.fullName ?? member.username)}
                        </div>
                    ))}
                    {members.length > 4 && (
                        <div className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-inter font-medium text-teritary sm:size-8 sm:text-xs">
                            +{members.length - 4}
                        </div>
                    )}
                </div>

                {canManage && (
                    <button
                        type="button"
                        onClick={() => setIsDialogOpen(true)}
                        disabled={isPending}
                        aria-label={`Aktifkan kembali proyek ${project.title}`}
                        className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-inter font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                    >
                        {isPending ? (
                            <Loader2 className="size-3.5 animate-spin sm:size-4" aria-hidden="true" />
                        ) : (
                            <ArchiveRestore className="size-3.5 sm:size-4" />
                        )}
                        Aktifkan
                    </button>
                )}
            </div>

            <RestoreProjectDialog
                isOpen={isDialogOpen}
                projectTitle={project.title}
                isPending={isPending}
                error={error}
                onCancel={() => setIsDialogOpen(false)}
                onConfirm={handleConfirmRestore}
            />
        </div>
    );
}
