import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ groupeId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { groupeId } = await context.params;
  const response = await backendFetch(`/api/v1/scolarite/groupes/${groupeId}`, {
    cookies: { accessToken },
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { groupeId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body.nom !== "string" || typeof body.promotion_id !== "string") {
    return NextResponse.json(
      { detail: "Missing required fields: nom, promotion_id" },
      { status: 400 }
    );
  }

  const response = await backendFetch(`/api/v1/scolarite/groupes/${groupeId}`, {
    method: "PATCH",
    cookies: { accessToken },
    body: { nom: body.nom.trim(), promotion_id: body.promotion_id },
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
