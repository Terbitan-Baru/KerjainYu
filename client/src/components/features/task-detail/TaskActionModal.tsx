"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import AuthErrorBanner from "@/components/features/auth/AuthErrorBanner";
import { ActionDefinition } from "@/lib/api/tasks/taskStatus";
import { submitTaskAction } from "@/app/(main)/projects/[projectId]/task-board/actions";
import { useAttachmentUpload, PendingContent } from "@/lib/hooks/useAttachmentUpload";
import AttachmentComposer from "@/components/features/task-detail/AttachmentComposer";
import { cn } from "@/utils/cn";

const MODAL_COPY: Record<"submit", { title: string; submitLabel: string }> = {
    submit: { title: "Submit hasil kerja", submitLabel: "Submit" },
};

type TaskActionModalProps = {
    definition: ActionDefinition | null;
    projectId: string;
    taskId: number;
    onClose: () => void;
};

// Alur: (1) buat submission lewat POST /tasks/:id/submissions, (2) upload
// lampiran yang sudah dipilih lewat useAttachmentUpload.
export default function TaskActionModal({ definition, projectId, taskId, onClose }: TaskActionModalProps) {
    const [note, setNote] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [contents, setContents] = useState<PendingContent[]>([]);
    const { uploadAll, isPending, startTransition, error, setError, statusText, setStatusText, reset } =
        useAttachmentUpload();

    if (!definition || definition.action !== "submit") return null;
    const copy = MODAL_COPY.submit;

    function resetForm() {
        setNote("");
        setFiles([]);
        setContents([]);
        reset();
    }

    function handleClose() {
        if (isPending) return;
        resetForm();
        onClose();
    }

    function handleSubmit() {
        setError(null);

        startTransition(async () => {
            setStatusText("Mengirim submission...");
            const result = await submitTaskAction(projectId, taskId, note.trim() || undefined);
            if (!result.success || result.submissionId === null) {
                setError(result.error ?? "Gagal mengirim submission.");
                setStatusText(null);
                return;
            }

            const uploadError = await uploadAll({
                projectId,
                taskId,
                submissionId: result.submissionId,
                contents,
                files,
            });
            setStatusText(null);

            if (uploadError) {
                setError(`Submission terkirim, tapi: ${uploadError}`);
                return;
            }

            resetForm();
            onClose();
        });
    }

    return (
        <Modal isOpen onClose={handleClose} title={copy.title}>
            <div className="flex flex-col gap-4">
                <AuthErrorBanner message={error} />

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="submission-note" className="text-sm font-inter font-medium text-foreground">
                        Catatan untuk leader
                    </label>
                    <textarea
                        id="submission-note"
                        rows={4}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ceritakan apa yang sudah dikerjakan (opsional)"
                        maxLength={1000}
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-inter text-foreground outline-none transition-colors focus:border-primary"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-inter font-medium text-foreground">Lampiran (opsional)</span>
                    <AttachmentComposer
                        contents={contents}
                        files={files}
                        onContentsChange={setContents}
                        onFilesChange={setFiles}
                        onError={setError}
                    />
                </div>

                {statusText && <p className="text-xs font-inter text-muted">{statusText}</p>}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isPending}
                        className="flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-inter font-medium text-foreground transition-colors hover:bg-status-todo-bg disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isPending}
                        aria-busy={isPending}
                        className={cn(
                            "flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-inter font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10",
                            "bg-primary text-primary-foreground hover:opacity-90"
                        )}
                    >
                        {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                        {isPending ? "Memproses..." : copy.submitLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
