"use client";

import { apiFetch } from "@/lib/api/http";
import type { RoleOut, UtilisateurOut, UtilisateurRoleOut } from "@/types/admin";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const data = await response.json().catch(() => null);
  const record = asRecord(data);
  const detail = record?.detail;
  return new Error(typeof detail === "string" ? detail : fallback);
}

function normalizeArray<T>(payload: unknown, normalize: (value: unknown) => T | null): T[] {
  const record = asRecord(payload);
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.data)
        ? record.data
        : Array.isArray(record?.results)
          ? record.results
          : [];

  return candidates.map(normalize).filter((item): item is T => item !== null);
}

function normalizeRole(value: unknown): RoleOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = record.id;
  const libelle = record.libelle;

  if (typeof id !== "string" || typeof libelle !== "string") {
    return null;
  }

  return { id, libelle };
}

function normalizeUtilisateurRole(value: unknown): UtilisateurRoleOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const utilisateurId = record.utilisateur_id;
  const roleId = record.role_id;
  const libelle = record.libelle ?? null;

  if (
    typeof utilisateurId !== "string" ||
    typeof roleId !== "string" ||
    (libelle !== null && typeof libelle !== "string")
  ) {
    return null;
  }

  return {
    utilisateur_id: utilisateurId,
    role_id: roleId,
    libelle,
  };
}

function normalizeUtilisateur(value: unknown): UtilisateurOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = record.id;
  const email = record.email;
  const nom = record.nom;
  const prenom = record.prenom;
  const roles = record.roles;
  const actif = record.actif;
  const premierLogin = record.premier_login;

  if (
    typeof id !== "string" ||
    typeof email !== "string" ||
    typeof nom !== "string" ||
    typeof prenom !== "string" ||
    !Array.isArray(roles) ||
    !roles.every((role): role is string => typeof role === "string") ||
    typeof actif !== "boolean" ||
    typeof premierLogin !== "boolean"
  ) {
    return null;
  }

  return {
    id,
    email,
    nom,
    prenom,
    roles,
    actif,
    premier_login: premierLogin,
  };
}

export async function getUsers(params?: {
  search?: string;
  role?: string;
  actif?: boolean;
}): Promise<UtilisateurOut[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.role) searchParams.set("role", params.role);
  if (typeof params?.actif === "boolean") searchParams.set("actif", String(params.actif));

  const path = searchParams.size
    ? `/api/scolarite/utilisateurs?${searchParams.toString()}`
    : "/api/scolarite/utilisateurs";
  const response = await apiFetch(path);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger les utilisateurs.");
  }

  return normalizeArray(await response.json(), normalizeUtilisateur);
}

export async function getUser(userId: string): Promise<UtilisateurOut> {
  const response = await apiFetch(`/api/scolarite/utilisateurs/${userId}`);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger l'utilisateur.");
  }

  const utilisateur = normalizeUtilisateur(await response.json());
  if (!utilisateur) throw new Error("La réponse utilisateur est invalide.");
  return utilisateur;
}

export async function updateUserActivation(
  userId: string,
  actif: boolean
): Promise<{ utilisateur_id: string; actif: boolean }> {
  const response = await apiFetch(`/api/scolarite/utilisateurs/${userId}/activation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actif }),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de modifier l'activation de l'utilisateur.");
  }

  return await response.json();
}

export async function getRoles(): Promise<RoleOut[]> {
  const response = await apiFetch("/api/scolarite/roles");

  if (!response.ok) {
    throw await readError(response, "Impossible de charger les rôles.");
  }

  return normalizeArray(await response.json(), normalizeRole);
}

export async function getUserRoles(userId: string): Promise<UtilisateurRoleOut[]> {
  const response = await apiFetch(`/api/scolarite/roles/utilisateurs/${userId}/roles`);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger les rôles de l'utilisateur.");
  }

  return normalizeArray(await response.json(), normalizeUtilisateurRole);
}

export async function assignRoleToUser(
  userId: string,
  roleId: string
): Promise<UtilisateurRoleOut> {
  const response = await apiFetch(`/api/scolarite/roles/utilisateurs/${userId}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role_id: roleId }),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible d'attribuer le rôle à l'utilisateur.");
  }

  const utilisateurRole = normalizeUtilisateurRole(await response.json());
  if (!utilisateurRole) throw new Error("La réponse attribution de rôle est invalide.");
  return utilisateurRole;
}

export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  const response = await apiFetch(`/api/scolarite/roles/utilisateurs/${userId}/roles/${roleId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de retirer le rôle de l'utilisateur.");
  }
}

export async function replaceUserRolesAndClearAssignments(
  userId: string,
  roleIds: string[]
): Promise<UtilisateurRoleOut[]> {
  const response = await apiFetch(`/api/admin/utilisateurs/${userId}/roles`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roles: roleIds }),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de remplacer les rôles de l'utilisateur.");
  }

  return normalizeArray(await response.json(), normalizeUtilisateurRole);
}
