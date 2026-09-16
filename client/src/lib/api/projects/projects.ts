import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectDetailResponse,
} from "@/types/project";
import { apiFetch } from "../fetcher";
import { ApiRequestError } from "../apiRequestError";

const PROJECT_PATH = "/projects";

// Request Url
export function getProjectsRequest(cookie: string) {
  return apiFetch<Project[]>(PROJECT_PATH, { cookie });
}

export async function getProjectDetailRequest(
  projectId: string,
  cookie: string,
) {
  return apiFetch<ProjectDetailResponse>(`${PROJECT_PATH}/${projectId}`, {
    cookie,
  });
}

export function createProjectRequest(
  payload: CreateProjectPayload,
  cookie: string,
) {
  return apiFetch<Project>(PROJECT_PATH, {
    method: "POST",
    body: payload,
    cookie,
  });
}

export function updateProjectRequest(
  projectId: string,
  payload: UpdateProjectPayload,
  cookie: string,
) {
  return apiFetch<Project>(`${PROJECT_PATH}/${projectId}`, {
    method: "PATCH",
    body: payload,
    cookie,
  });
}

export function deleteProjectRequest(projectId: string, cookie: string) {
  return apiFetch<null>(`${PROJECT_PATH}/${projectId}`, {
    method: "DELETE",
    cookie,
  });
}



// Fetcher
export const getProjects = cache(
  async (includeArchived = false): Promise<Project[]> => {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    try {
      const { data } = await getProjectsRequest(cookieHeader);

      return data
        .filter((project) => includeArchived || !project.isArchived)
        .map((project) => ({
          ...project,
          members: project.members ?? [],
        }));
    } catch {
      return [];
    }
  }
);

export const getArchivedProjects = cache(async (): Promise<Project[]> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const { data } = await getProjectsRequest(cookieHeader);

    return data
      .filter((project) => project.isArchived)
      .map((project) => ({
        ...project,
        members: project.members ?? [],
      }));
  } catch {
    return [];
  }
});

export const getProject = cache(
  async (projectId: string): Promise<ProjectDetailResponse | null> => {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    try {
      const { data } = await getProjectDetailRequest(projectId, cookieHeader);

      return {
        ...data,
        project: {
          ...data.project,
          members: data.project.members ?? [],
        },
      };
    } catch {
      return null;
    }
  },
);

export async function updateProject(
  projectId: string,
  payload: UpdateProjectPayload,
): Promise<{ project: Project | null; error: string | null }> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const { data } = await updateProjectRequest(projectId, payload, cookieHeader);
    return { project: data, error: null };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { project: null, error: err.message };
    }
    return { project: null, error: "Terjadi kesalahan tak terduga. Coba lagi." };
  }
}

export async function deleteProject(
  projectId: string,
): Promise<{ success: boolean; error: string | null }> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    await deleteProjectRequest(projectId, cookieHeader);
    return { success: true, error: null };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Terjadi kesalahan tak terduga. Coba lagi." };
  }
}