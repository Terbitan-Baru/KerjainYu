"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, CalendarDays, ListOrdered, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import AuthErrorBanner from "@/components/features/auth/AuthErrorBanner";
import TaskFormField from "@/components/features/tasks/TaskFormField";
import TaskDescriptionField from "@/components/features/tasks/TaskDescriptionField";
import { Task } from "@/types/task";
import { updateTaskAction } from "@/app/(main)/projects/[projectId]/task-board/actions";
import { validateCreateTaskFields, FieldErrors } from "@/lib/validation/taskSchema";

type TaskEditModalProps = {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    task: Task;
};

/** Tanggal deadline task (ISO) dipotong ke format YYYY-MM-DD untuk <input type="date">,
 *  cermin dari toDateInputValue() di settings/page.tsx. */
function toDateInputValue(deadline: string | null): string {
    if (!deadline) return "";
    return deadline.slice(0, 10);
}

/** Tanggal hari ini dalam format YYYY-MM-DD, dipakai sebagai batas bawah input date
 *  (menolak tanggal lampau langsung di browser, cermin dari aturan server). */
function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function TaskEditModal({ isOpen, onClose, projectId, task }: TaskEditModalProps) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit() {
        const formData = new FormData(formRef.current ?? undefined);
        const title = String(formData.get("title") ?? "");
        const description = String(formData.get("description") ?? "");
        const priority = String(formData.get("priority") ?? "");
        const deadline = String(formData.get("deadline") ?? "");

        const errors = validateCreateTaskFields(title, deadline, priority);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError(null);
            return;
        }

        setFieldErrors({});
        setError(null);
        startTransition(async () => {
            const result = await updateTaskAction(projectId, task.id, {
                title: title.trim(),
                description: description.trim(),
                priority: priority.trim() ? Number(priority) : undefined,
                deadline: deadline.trim() || undefined,
            });

            if (!result.success) {
                setError(result.error);
                return;
            }

            router.refresh();
            onClose();
        });
    }

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Tugas">
            <form
                ref={formRef}
                onSubmit={(event) => {
                    event.preventDefault();
                    handleSubmit();
                }}
                className="flex flex-col gap-4"
                noValidate
            >
                <AuthErrorBanner message={error} />

                <TaskFormField
                    id="edit-title"
                    name="title"
                    label="Judul tugas"
                    type="text"
                    icon={ClipboardList}
                    placeholder="Buat testing aplikasi"
                    autoComplete="off"
                    required
                    defaultValue={task.title}
                    error={fieldErrors.title}
                />

                <TaskDescriptionField
                    id="edit-description"
                    name="description"
                    label="Deskripsi"
                    placeholder="Jelaskan detail tugas ini (opsional)"
                    defaultValue={task.description ?? ""}
                    error={fieldErrors.description}
                />

                <div className="grid grid-cols-2 gap-3">
                    <TaskFormField
                        id="edit-priority"
                        name="priority"
                        label="Prioritas"
                        type="number"
                        icon={ListOrdered}
                        placeholder="1"
                        min="1"
                        defaultValue={task.priority?.toString() ?? ""}
                        error={fieldErrors.priority}
                    />

                    <TaskFormField
                        id="edit-deadline"
                        name="deadline"
                        label="Deadline"
                        type="date"
                        icon={CalendarDays}
                        min={getTodayDateString()}
                        defaultValue={toDateInputValue(task.deadline)}
                        error={fieldErrors.deadline}
                    />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-inter font-medium text-foreground transition-colors hover:bg-status-todo-bg sm:min-h-10"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        aria-busy={isPending}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-inter font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10"
                    >
                        {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                        {isPending ? "Menyimpan..." : "Simpan perubahan"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
