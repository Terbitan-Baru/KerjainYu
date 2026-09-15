import * as projectRepo from "../database/repositories/project.repository";
import * as projectMemberRepo from "../database/repositories/project.member.repository";
import * as projectLinkRepo from "../database/repositories/project.link.repository";
import * as taskRepo from "../database/repositories/task.repository"
import * as projectSchema from "../schemas/projectSchema";
import { findById } from "../database/repositories/user.repository";
import { assertProjectIsActive, assertProjectLeader, assertProjectMembership } from "./helper/auhtorization.helper";
import { db } from "../database/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/AppError";
import { CreateProjectLinkInput } from "../schemas/projectLinkSchema";
import { notifyUser } from "./notification.service";

//POST /api/v1/projects
export async function createProjectWithLinks(
  projectInput: projectSchema.CreateProjectInput,
  linksInput: CreateProjectLinkInput[],
  userId: number,
) {
  return db.transaction(async (trx) => {
    const project = await projectRepo.createProject(projectInput, trx);
    await projectMemberRepo.setLeader(project.id, userId, trx);
    if (linksInput.length > 0) {
      await projectLinkRepo.createLinks(project.id, userId, linksInput, trx);
    }
    return project;
  });
}

//POST /api/v1/projects/:id/invitations
export async function inviteMember(projectId: number, leaderId: number, targetUserId: number) {
  await assertProjectLeader(projectId, leaderId)
  const project = await projectRepo.getProjectById(projectId)
  await assertProjectIsActive({ status: project!.status, isArchived: project!.isArchived })
  const prospectiveMember = await findById(targetUserId)
  if (!prospectiveMember) {
    throw new NotFoundError("User is not found")
  }
  if (prospectiveMember.id === leaderId) {
    throw new ConflictError("You're  can't invite yourself")
  }

  const existing = await projectMemberRepo.getRole(projectId, prospectiveMember.id)
  if (existing?.status === "active") {
    throw new ConflictError(`${prospectiveMember.username}, already part of this project`)
  }
  if (existing?.status === "invited") {
    throw new ConflictError(`${prospectiveMember.username} has already been invited`);
  }
  return db.transaction(async (trx) => {
    await notifyUser({ userId: prospectiveMember.id, type: "member_invited", referenceType: "project", referenceId: projectId, message: "You got invited to join this project" }, trx)
    if (existing) {
      //re-invite after the invitation before got rejected (or after removal): reset joined_at
      //explicitly since this membership is back to "not yet joined"
      return await projectMemberRepo.resetToInvited(existing.id, trx)
    }
    return await projectMemberRepo.addMember(projectId, prospectiveMember.id, trx)
  })
}

//GET /api/v1/projects/:id
export async function getDetailProject(projectId: number, userId: number) {
  const [project, membership, links] = await Promise.all([
    projectRepo.getProjectById(projectId),
    projectMemberRepo.getRole(projectId, userId),
    projectLinkRepo.getAllLinksByProject(projectId),
  ]);
  await assertProjectMembership(projectId, userId)
  return [project, membership, links];
}

//GET /api/v1/projects
export async function getAllProjects(userId: number) {
  const projects = await projectRepo.getProjectsByUserId(userId);
  return projects;
}


//GET /api/v1/projects/:id/tasks
export async function getTasksByProject(projectId: number, userId: number) {
  await assertProjectMembership(projectId, userId)
  const tasks = await taskRepo.getTasksByProject(projectId)
  return tasks
}


//PATCH /api/v1/projects/:id
export async function updateProject(
  projectId: number,
  userId: number,
  input: projectSchema.UpdateProjectInput,
) {
  const [project, membership] = await Promise.all([
    projectRepo.getProjectById(projectId),
    projectMemberRepo.getRole(projectId, userId),
  ]);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  if (membership?.role !== "leader") {
    throw new ForbiddenError("Only the leader who can update the project");
  }
  if (input.isArchived) {
    input.isArchivedAt = new Date();
  }
  return await projectRepo.updateProject(project.id, input);
}

//DELETE /api/v1/projects/:id
export async function deleteProject(projectId: number, userId: number) {
  await assertProjectLeader(projectId, userId);

  return db.transaction(async (trx) => {
    const tasks = await trx("tasks").select("id").where({ projectId });
    const taskIds = tasks.map((t) => t.id);

    let submissionIds: number[] = [];
    if (taskIds.length > 0) {
      const submissions = await trx("task_submissions").select("id").whereIn("taskId", taskIds);
      submissionIds = submissions.map((s) => s.id);
    }

    if (submissionIds.length > 0) {
      await trx("submission_attachments").whereIn("submissionId", submissionIds).del();
    }

    if (taskIds.length > 0) {
      await trx("task_appeals").whereIn("taskId", taskIds).del();
      await trx("task_submissions").whereIn("taskId", taskIds).del();
      await trx("comments_task").whereIn("taskId", taskIds).del();
      await trx("task_swap_requests")
        .where((qb) => {
          qb.whereIn("taskId", taskIds).orWhereIn("targetTaskId", taskIds);
        })
        .del();
      await trx("task_ownership_log").whereIn("taskId", taskIds).del();
      await trx("tasks").whereIn("id", taskIds).del();
    }

    await trx("project_links").where({ projectId }).del();
    await trx("project_members").where({ projectId }).del();
    await trx("projects").where({ id: projectId }).del();
  });
}