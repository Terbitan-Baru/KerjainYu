import { Role } from "../../types/entities/projectMember.types";
import { db } from "../db";
import { Knex } from "knex";

// For Leader setting up the project, so it will automaticallya assign the user as a leader of the project
export async function setLeader(
  projectId: number,
  userId: number,
  trx?: Knex.Transaction,
) {
  const executor = trx || db;
  return executor("project_members").insert({
    project_id: projectId,
    user_id: userId,
    role: "leader",
  });
}
export async function updateMemberRole(projectId: number, userId: number, role: string = "member", trx?: Knex.Transaction) {
  const executor = trx || db;
  return executor("project_members")
    .where("project_id", projectId)
    .andWhere("user_id", userId)
    .update({
      role: role,
    })
    .returning(["user_id", "role", "status"]);
}

export async function addMember(projectId: number, userId: number, trx?: Knex.Transaction) {
  const executor = trx || db
  return executor("project_members").insert({
    project_id: projectId,
    user_id: userId,
    role: "member",
    status: "invited"
  });
}

export async function updateMembershipStatus(id: number, status: string, trx?: Knex.Transaction, joinedAt?: Date) {
  const executor = trx || db
  return executor("project_members")
    .where("id", id)
    .update({ status: status, joined_at: joinedAt });
}

export async function resetToInvited(id: number, trx?: Knex.Transaction) {
  const executor = trx || db
  return executor("project_members")
    .where("id", id)
    .update({ status: "invited", joined_at: null });
}



// export async function removeMember(projectId: number, userId: number) {
//   return db("project_members")
//     .where({
//       project_id: projectId,
//       user_id: userId,
//     })
//     .del();
// }

export async function getRole(projectId: number, userId: number) {
  return db<Role>("project_members")
    .where("project_id", projectId)
    .where("user_id", userId)
    .select("id", "user_id", "role", "status")
    .first();
}

export async function getById(id: number) {
  return db("project_members").where({ id }).first()
}

export async function getProjectLeader(projectId: number) {
  return db("project_members")
    .where({ project_id: projectId, role: "leader", status: "active" })
    .first();
}

export async function getInvitations(userId: number) {
  return db("project_members").join("projects", "project_members.project_id", "projects.id",).where("user_id", userId).where('project_members.status', 'invited').select("project_members.id", "project_members.project_id", "projects.title as project_title")
}

export async function getMembersByProject(projectId: number) {
  return db("project_members")
    .join("users", "project_members.user_id", "users.id")
    .where("project_members.project_id", projectId)
    .where("project_members.status", "active")
    .select([
      "project_members.id",
      "project_members.project_id",
      "project_members.user_id",
      "project_members.role",
      "project_members.status",
      "project_members.joined_at",
      "users.username",
      "users.full_name",
      "users.avatar_url",
    ]);
}
export async function getProjectByIdAndUser(id: number, userId: number) {
  return db("project_members").where("project_id", id);
}

export async function removeMember(projectId: number, userId: number, trx?: Knex.Transaction) {
  const executor = trx || db
  return executor("project_members").where({ project_id: projectId, user_id: userId }).update({ status: "removed" })
}