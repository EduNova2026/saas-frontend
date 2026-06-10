import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ userId: string; roleId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { userId, roleId } = await context.params;
  const response = await backendFetch(
    `/api/v1/scolarite/roles/utilisateurs/${userId}/roles/${roleId}`,
    { method: "DELETE", cookies: { accessToken } }
  );

  return new NextResponse(null, { status: response.status });
}
