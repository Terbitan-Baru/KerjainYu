"use server";

import { revalidatePath } from "next/cache";
import { updateProject, deleteProject } from "@/lib/api/projects/projects";
import { validateProjectSettingsFields } from "@/lib/validation/projectSchema";
import { ProjectSettingsFormState } from "@/lib/api/projects/projectSettingsFormState";
import { projectRoutes } from "@/lib/routes";

export async function updateProjectSettingsAction(
    projectId: string,
    _prevState: ProjectSettingsFormState,
    formData: FormData,
): Promise<ProjectSettingsFormState> {
    const title = String(formData.get("title") ?? "");
    const deadline = String(formData.get("deadline") ?? "");
    const allowFreeSwap = formData.get("allowFreeSwap") === "on";
    const values = { title, deadline, allowFreeSwap };

    const fieldErrors = validateProjectSettingsFields(title, deadline);
    if (Object.keys(fieldErrors).length > 0) {
        return { success: false, error: null, fieldErrors, values };
    }

    const result = await updateProject(projectId, {
        title: title.trim(),
        deadline,
        allowFreeSwap,
    });

    if (!result.project) {
        return { success: false, error: result.error, values };
    }

    revalidatePath(projectRoutes(projectId).SETTINGS);
    return { success: true, error: null, values };
}

export type ArchiveProjectState = {
    success: boolean;
    error: string | null;
};

export async function setProjectArchivedAction(
    projectId: string,
    isArchived: boolean,
): Promise<ArchiveProjectState> {
    const result = await updateProject(projectId, { isArchived });

    if (!result.project) {
        return { success: false, error: result.error };
    }

    revalidatePath(projectRoutes(projectId).SETTINGS);
    revalidatePath(projectRoutes(projectId).TASK_BOARD);
    return { success: true, error: null };
}

export type ProjectStatusState = {
    success: boolean;
    error: string | null;
};

export async function setProjectStatusAction(
    projectId: string,
    status: "ongoing" | "completed",
): Promise<ProjectStatusState> {
    const result = await updateProject(projectId, { status });

    if (!result.project) {
        return { success: false, error: result.error };
    }

    revalidatePath(projectRoutes(projectId).SETTINGS);
    revalidatePath(projectRoutes(projectId).TASK_BOARD);
    return { success: true, error: null };
}

export type DeleteProjectState = {
    success: boolean;
    error: string | null;
};

export async function deleteProjectAction(
    projectId: string,
): Promise<DeleteProjectState> {
    return deleteProject(projectId);
}