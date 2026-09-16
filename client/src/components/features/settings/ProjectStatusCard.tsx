"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { setProjectStatusAction } from "@/app/(main)/projects/[projectId]/settings/actions";
import { ProjectStatus } from "@/types/project";
import SettingsSection from "@/components/features/settings/SettingsSection";
import ConfirmDangerDialog from "@/components/features/settings/ConfirmDangerDialog";

type ProjectStatusCardProps = {
    projectId: string;
    projectTitle: string;
    status: ProjectStatus;
    canManage: boolean;
};

export default function ProjectStatusCard({ projectId, projectTitle, status, canManage }: ProjectStatusCardProps) {
    const router = useRouter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const isCompleted = status === "completed";
    const nextStatus: ProjectStatus = isCompleted ? "ongoing" : "completed";
    const actionLabel = isCompleted ? "Buka lagi sebagai aktif" : "Tandai selesai";

    function handleConfirm() {
        if (isPending) return;
        setError(null);
        startTransition(async () => {
            const result = await setProjectStatusAction(projectId, nextStatus);
            if (!result.success) {
                setError(result.error ?? "Gagal memperbarui status proyek.");
                return;
            }
            setIsDialogOpen(false);
            router.refresh();
        });
    }

    function handleDialogClose() {
        if (isPending) return;
        setIsDialogOpen(false);
    }

    const Icon = isCompleted ? RotateCcw : CheckCircle2;

    return (
        <SettingsSection
            icon={Icon}
            title="Status Proyek"
            description={
                isCompleted
                    ? "Proyek ini ditandai selesai. Semua tugas jadi read-only — klaim, submit, review, dan tukar tugas tidak bisa dilakukan."
                    : "Tandai proyek ini selesai kalau seluruh pekerjaannya sudah rampung. Tugas di dalamnya akan jadi read-only, tapi datanya tetap tersimpan."
            }
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-inter text-foreground">
                    Status saat ini:{" "}
                    <span className="font-medium">{isCompleted ? "Selesai" : "Aktif"}</span>
                </p>

                {canManage && (
                    <button
                        type="button"
                        onClick={() => setIsDialogOpen(true)}
                        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-inter font-medium text-foreground transition-colors hover:border-primary sm:w-auto"
                    >
                        <Icon className="size-4" />
                        {actionLabel}
                    </button>
                )}
            </div>

            {!canManage && (
                <p className="mt-3 text-xs font-inter text-muted">
                    Hanya ketua proyek yang bisa mengubah status proyek ini.
                </p>
            )}

            <ConfirmDangerDialog
                isOpen={isDialogOpen}
                title={isCompleted ? "Aktifkan lagi proyek ini?" : "Tandai proyek selesai?"}
                message={
                    isCompleted
                        ? `"${projectTitle}" akan kembali aktif. Anggota bisa klaim, submit, dan review tugas seperti biasa lagi.`
                        : `"${projectTitle}" akan ditandai selesai. Selama status ini aktif, tidak ada aksi (klaim, submit, review, tukar tugas) yang bisa dilakukan pada tugas apa pun di proyek ini. Kamu bisa mengaktifkannya lagi kapan saja.`
                }
                confirmLabel={actionLabel}
                isPending={isPending}
                error={error}
                onCancel={handleDialogClose}
                onConfirm={handleConfirm}
            />
        </SettingsSection>
    );
}