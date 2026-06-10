import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

type RoleOut = {
  id: string;
  libelle: string;
};

type UtilisateurRoleOut = {
  utilisateur_id: string;
  role_id: string;
};

type EnseignantGroupeOut = {
  enseignant_id: string;
  groupe_id: string;
};

type ResponsablePromotionOut = {
  responsable_id: string;
  promotion_id: string;
};

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

async function cleanupEnseignantGroupes(userId: string, accessToken: string) {
  const response = await backendFetch(`/api/v1/scolarite/enseignants/${userId}/groupes`, {
    cookies: { accessToken },
  });

  if (!response.ok) return;

  const assignments = (await readJson(response)) as EnseignantGroupeOut[];
  if (!Array.isArray(assignments)) return;

  await Promise.allSettled(
    assignments.map((assignment) =>
      backendFetch(
        `/api/v1/scolarite/groupes/${assignment.groupe_id}/enseignants/${userId}`,
        { method: "DELETE", cookies: { accessToken } }
      )
    )
  );
}

async function cleanupResponsablePromotions(userId: string, accessToken: string) {
  const response = await backendFetch(`/api/v1/scolarite/responsables/${userId}/promotions`, {
    cookies: { accessToken },
  });

  if (!response.ok) return;

  const assignments = (await readJson(response)) as ResponsablePromotionOut[];
  if (!Array.isArray(assignments)) return;

  await Promise.allSettled(
    assignments.map((assignment) =>
      backendFetch(
        `/api/v1/scolarite/promotions/${assignment.promotion_id}/responsables/${userId}`,
        { method: "DELETE", cookies: { accessToken } }
      )
    )
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { userId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { roles?: unknown };
  const nextRoleIds = Array.isArray(body.roles)
    ? body.roles.filter((roleId): roleId is string => typeof roleId === "string")
    : [];

  const rolesResponse = await backendFetch("/api/v1/scolarite/roles/", {
    cookies: { accessToken },
  });
  if (!rolesResponse.ok) {
    const data = await readJson(rolesResponse);
    return NextResponse.json(data, { status: rolesResponse.status });
  }

  const roles = (await readJson(rolesResponse)) as RoleOut[];
  const roleLibelles = new Map(roles.map((role) => [role.id, role.libelle]));

  const currentRolesResponse = await backendFetch(
    `/api/v1/scolarite/roles/utilisateurs/${userId}/roles`,
    { cookies: { accessToken } }
  );
  if (!currentRolesResponse.ok) {
    const data = await readJson(currentRolesResponse);
    return NextResponse.json(data, { status: currentRolesResponse.status });
  }

  const currentRoles = (await readJson(currentRolesResponse)) as UtilisateurRoleOut[];
  const currentRoleIds = currentRoles.map((role) => role.role_id);
  const currentLibelles = new Set(currentRoleIds.map((roleId) => roleLibelles.get(roleId)));
  const nextLibelles = new Set(nextRoleIds.map((roleId) => roleLibelles.get(roleId)));

  for (const roleId of currentRoleIds) {
    const response = await backendFetch(
      `/api/v1/scolarite/roles/utilisateurs/${userId}/roles/${roleId}`,
      { method: "DELETE", cookies: { accessToken } }
    );

    if (!response.ok && response.status !== 404) {
      const data = await readJson(response);
      return NextResponse.json(data, { status: response.status });
    }
  }

  for (const roleId of nextRoleIds) {
    const response = await backendFetch(`/api/v1/scolarite/roles/utilisateurs/${userId}/roles`, {
      method: "POST",
      body: { role_id: roleId },
      cookies: { accessToken },
    });

    if (!response.ok) {
      const data = await readJson(response);
      return NextResponse.json(data, { status: response.status });
    }
  }

  const lostEnseignantRole =
    currentLibelles.has("enseignant") && !nextLibelles.has("enseignant");
  const lostResponsableRole =
    (currentLibelles.has("responsable_pedagogique") ||
      currentLibelles.has("admin_pedagogique")) &&
    !nextLibelles.has("responsable_pedagogique") &&
    !nextLibelles.has("admin_pedagogique");

  await Promise.allSettled([
    lostEnseignantRole ? cleanupEnseignantGroupes(userId, accessToken) : Promise.resolve(),
    lostResponsableRole ? cleanupResponsablePromotions(userId, accessToken) : Promise.resolve(),
  ]);

  const finalRolesResponse = await backendFetch(
    `/api/v1/scolarite/roles/utilisateurs/${userId}/roles`,
    { cookies: { accessToken } }
  );
  const data = await readJson(finalRolesResponse);

  return NextResponse.json(data, { status: finalRolesResponse.status });
}
