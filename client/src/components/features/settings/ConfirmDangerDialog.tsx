"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

type ConfirmDangerDialogProps = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    pendingLabel?: string;
    isPending?: boolean;
    error?: string | null;
    onCancel: () => void;
    onConfirm: () => void;
};

export default function ConfirmDangerDialog({
    isOpen,
    title,
    message,
    confirmLabel,
    pendingLabel = "Memproses...",
    isPending = false,
    error,
    onCancel,
    onConfirm,
}: ConfirmDangerDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={isPending ? () => { } : onCancel} title={title}>
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 rounded-lg bg-status-blocked-bg p-3">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-blocked-text" />
                    <p className="text-sm font-inter text-status-blocked-text">{message}</p>
                </div>

                {error && (
                    <p className="text-sm font-inter text-status-blocked-text">{error}</p>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isPending}
                        className="flex min-h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-inter font-medium text-foreground transition-colors hover:bg-status-todo-bg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isPending}
                        aria-busy={isPending}
                        className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-status-blocked-text px-4 text-sm font-inter font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                        {isPending ? pendingLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}