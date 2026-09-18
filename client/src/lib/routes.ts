export const ROUTES = {
  PROJECTS: "/projects",
  MY_TASK: "/my-tasks",
  NOTIFICATION: "/notifications",
  PROFILE: "/profile",
  ARCHIVE: "/archive",
  HELP_CENTER: "/help",
  LOGIN: "/login",
  REGISTER: "/register",
  LANDING: "/",
} as const;

export function projectRoutes(projectId: string) {
  return {
    TEAM: `/projects/${projectId}/team`,
    TASK_BOARD: `/projects/${projectId}/task-board`,
    CALENDAR: `/projects/${projectId}/calendar`,
    LINKS: `/projects/${projectId}/links`,
    SETTINGS: `/projects/${projectId}/settings`,
    PENDING_SUBMISSIONS: `/projects/${projectId}/task-board/pending-submissions`,
  } as const;
}

export function taskDetailRoute(projectId: string, taskId: number): string {
  return `/projects/${projectId}/task-board/${taskId}`;
}

const PROJECT_DETAIL_PATTERN = /^\/projects\/([^/]+)(\/.*)?$/;

export function getProjectIdFromPathname(pathname: string): string | null {
  const match = pathname.match(PROJECT_DETAIL_PATTERN);
  return match ? match[1] : null;
}
