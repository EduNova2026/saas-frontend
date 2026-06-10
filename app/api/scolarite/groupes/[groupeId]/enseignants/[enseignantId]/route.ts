import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ groupeId: string; enseignantId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { groupeId, enseignantId } = await context.params;
  const response = await backendFetch(
    `/api/v1/scolarite/groupes/${groupeId}/enseignants/${enseignantId}`,
    { method: "POST", cookies: { accessToken } }
  );
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { groupeId, enseignantId } = await context.params;
  const response = await backendFetch(
    `/api/v1/scolarite/groupes/${groupeId}/enseignants/${enseignantId}`,
    { method: "DELETE", cookies: { accessToken } }
  );

  return new NextResponse(null, { status: response.status });
}
