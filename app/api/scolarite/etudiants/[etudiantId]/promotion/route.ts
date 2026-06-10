import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ etudiantId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { etudiantId } = await context.params;
  const response = await backendFetch(
    `/api/v1/scolarite/etudiants/${etudiantId}/promotion`,
    { method: "DELETE", cookies: { accessToken } }
  );

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
