import { backendFetch, backendJsonResponse } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ etudiantId: string; groupeId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { etudiantId, groupeId } = await context.params;
  const response = await backendFetch(
    `/api/v1/scolarite/etudiants/${etudiantId}/groupes/${groupeId}`,
    { method: "POST", cookies: { accessToken } }
  );

  return backendJsonResponse(response);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { etudiantId, groupeId } = await context.params;
  const response = await backendFetch(
    `/api/v1/scolarite/etudiants/${etudiantId}/groupes/${groupeId}`,
    { method: "DELETE", cookies: { accessToken } }
  );

  return backendJsonResponse(response);
}
