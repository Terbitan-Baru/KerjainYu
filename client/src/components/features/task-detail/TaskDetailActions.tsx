"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2, SquarePen, UserPlus } from "lucide-react";
import { Task, TaskDetail } from "@/types/task";
import { Project, ProjectMember } from "@/types/project";
import { getAvailableActions, ActionDefinition } from "@/lib/api/tasks/taskStatus";
import { isTaskAssignee, resolveTaskAssigneeId } from "@/lib/api/tasks/taskAssignee";
import { getSwapEligibility } from "@/lib/api/tasks/taskSwap";
import { cn } from "@/utils/cn";
import { transitionTaskAction } from "@/app/(main)/projects/[projectId]/task-board/actions";
import TaskActionModal from "@/components/features/task-detail/TaskActionModal";
import TaskReviewModal from "@/components/features/task-detail/TaskReviewModal";
import TaskAssignModal from "@/components/features/task-detail/TaskAssignModal";
import TaskSwapRequestModal from "@/components/features/task-detail/TaskSwapRequestModal";
import TaskEditModal from "@/components/features/task-detail/TaskEditModal";


const REVIEW_ACTIONS: ActionDefinition["action"][] = ["approve", "requestRevision", "reject"];

const ACTION_BUTTON_STYLE: Record<ActionDefinition["variant"], string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    default: "border border-border bg-card text-foreground hover:border-primary",
    danger: "border border-status-blocked-text bg-card text-status-blocked-text hover:bg-status-blocked-bg",
};

type TaskDetailActionsProps = {
    task: TaskDetail;
    projectId: string;
    currentUserId: number;
    isLeader: boolean;
    members: ProjectMember[];
    project: Pick<Project, "status" | "isArchived" | "allowFreeSwap">;
    projectTasks: Task[];
};

export default function TaskDetailActions({
    task,
    projectId,
    currentUserId,
    isLeader,
    members,
    project,
    projectTasks,
}: TaskDetailActionsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [activeSubmitAction, setActiveSubmitAction] = useState<ActionDefinition | null>(null);
    const [activeReviewAction, setActiveReviewAction] = useState<ActionDefinition | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignModalKey, setAssignModalKey] = useState(0);
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const [swapModalKey, setSwapModalKey] = useState(0);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editModalKey, setEditModalKey] = useState(0);

    const isProjectActive = project.status !== "completed" && !project.isArchived;

    const actions = getAvailableActions(task.status, isProjectActive).filter((definition) => {
        if (definition.actor === "leader") return isLeader;
        if (definition.actor === "assignee") return isTaskAssignee(task, currentUserId);
        return true; // "member" — siapapun anggota project boleh klaim
    });
    const canAssign = isLeader && isProjectActive && resolveTaskAssigneeId(task) === null;
    const { canRequestSwap } = getSwapEligibility(task, project, currentUserId);
    // Edit title/description/priority/deadline — leader-only, project harus
    // aktif (sama seperti aksi lain), tapi tidak bergantung pada status task.
    const canEdit = isLeader && isProjectActive;

    if (!isProjectActive) {
        return (
            <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-inter text-muted">
                    Proyek ini sudah selesai atau diarsipkan, sehingga tidak ada aksi yang bisa dilakukan pada tugas ini.
                </p>
            </div>
        );
    }

    if (actions.length === 0 && !canAssign && !canRequestSwap && !canEdit) return null;

    function handleAction(definition: ActionDefinition) {
        if (definition.action === "submit") {
            setActiveSubmitAction(definition);
            return;
        }
        if (REVIEW_ACTIONS.includes(definition.action)) {
            setActiveReviewAction(definition);
            return;
        }

        setError(null);
        startTransition(async () => {
            const result = await transitionTaskAction(
                projectId,
                task.id,
                definition.action as "claim" | "ongoing",
            );
            if (!result.success) {
                setError(result.error);
                return;
            }
            router.refresh();
        });
    }

    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-inter text-sm font-semibold text-foreground">Aksi</h3>

            <div className="mt-3 flex flex-wrap gap-2">
                {canEdit && (
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                            setEditModalKey((key) => key + 1);
                            setIsEditModalOpen(true);
                        }}
                        className={cn(
                            "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-inter font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none",
                            ACTION_BUTTON_STYLE.default
                        )}
                    >
                        <SquarePen className="size-3.5" aria-hidden="true" />
                        Edit Tugas
                    </button>
                )}

                {canAssign && (
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                            setAssignModalKey((key) => key + 1);
                            setIsAssignModalOpen(true);
                        }}
                        className={cn(
                            "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-inter font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none",
                            ACTION_BUTTON_STYLE.default
                        )}
                    >
                        <UserPlus className="size-3.5" aria-hidden="true" />
                        Tugaskan ke Member
                    </button>
                )}

                {actions.map((definition) => (
                    <button
                        key={definition.action}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAction(definition)}
                        className={cn(
                            "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-inter font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none",
                            ACTION_BUTTON_STYLE[definition.variant]
                        )}
                    >
                        {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                        {definition.label}
                    </button>
                ))}

                {canRequestSwap && (
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                            setSwapModalKey((key) => key + 1);
                            setIsSwapModalOpen(true);
                        }}
                        className={cn(
                            "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-inter font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none",
                            ACTION_BUTTON_STYLE.default
                        )}
                    >
                        <ArrowLeftRight className="size-3.5" aria-hidden="true" />
                        Tukar Task
                    </button>
                )}
            </div>

            {error && <p className="mt-3 text-xs font-inter text-status-blocked-text">{error}</p>}

            <TaskActionModal
                definition={activeSubmitAction}
                projectId={projectId}
                taskId={task.id}
                onClose={() => setActiveSubmitAction(null)}
            />

            <TaskReviewModal
                definition={activeReviewAction}
                projectId={projectId}
                taskId={task.id}
                submissionId={task.latestSubmission?.id ?? null}
                onClose={() => setActiveReviewAction(null)}
            />

            <TaskAssignModal
                key={`assign-${assignModalKey}`}
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                projectId={projectId}
                taskId={task.id}
                members={members}
            />

            {canEdit && (
                <TaskEditModal
                    key={`edit-${editModalKey}`}
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    projectId={projectId}
                    task={task}
                />
            )}

            {canRequestSwap && (
                <TaskSwapRequestModal
                    key={`swap-${swapModalKey}`}
                    isOpen={isSwapModalOpen}
                    onClose={() => setIsSwapModalOpen(false)}
                    projectId={projectId}
                    task={task}
                    currentUserId={currentUserId}
                    members={members}
                    projectTasks={projectTasks}
                />
            )}
        </div>
    );
}