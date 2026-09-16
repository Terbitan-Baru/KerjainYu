"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProjectAction } from "@/app/(main)/projects/[projectId]/settings/actions";
import { ROUTES } from "@/lib/routes";
import SettingsSection from "@/components/features/settings/SettingsSection";
import ConfirmDangerDialog from "@/components/features/settings/ConfirmDangerDialog";

type DeleteProjectCardProps = {
    projectId: string;
    projectTitle: string;
    canManage: boolean;
};

export default function DeleteProjectCard({ projectId, projectTitle, canManage }: DeleteProjectCardProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleConfirm() {
        if (isPending) return;
        setError(null);
        startTransition(async () => {
            const result = await deleteProjectAction(projectId);
            if (!result.success) {
                setError(result.error ?? "Gagal menghapus proyek.");
                return;
            }
            window.location.href = ROUTES.PROJECTS;
        });
    }

    function handleDialogClose() {
        if (isPending) return;
        setIsDialogOpen(false);
    }

    return (
        <SettingsSection
            icon={Trash2}
            tone="danger"
            title="Hapus Proyek"
            description="Tindakan ini permanen. Semua tugas, anggota, dan berkas dalam proyek akan hilang."
        >
            {canManage && (
                <button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-status-blocked-text bg-card px-4 text-sm font-inter font-medium text-status-blocked-text transition-colors hover:bg-status-blocked-bg sm:w-auto"
                >
                    <Trash2 className="size-4" />
                    Hapus proyek ini
                </button>
            )}

            {!canManage && (
                <p className="text-xs font-inter text-muted">
                    Hanya ketua proyek yang bisa menghapus proyek ini.
                </p>
            )}

            <ConfirmDangerDialog
                isOpen={isDialogOpen}
                title="Hapus proyek?"
                message={`"${projectTitle}" akan dihapus permanen beserta seluruh tugas, anggota, dan berkas di dalamnya. Tindakan ini tidak bisa dibatalkan.`}
                confirmLabel="Ya, hapus proyek"
                pendingLabel="Menghapus..."
                isPending={isPending}
                error={error}
                onCancel={handleDialogClose}
                onConfirm={handleConfirm}
            />
        </SettingsSection>
    );
}