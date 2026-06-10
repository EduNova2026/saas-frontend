import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ responsableId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { responsableId } = await context.params;
  const response = await backendFetch(
    `/api/v1/scolarite/responsables/${responsableId}/promotions`,
    { cookies: { accessToken } }
  );
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
