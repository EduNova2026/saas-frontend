import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ enseignementId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { enseignementId } = await context.params;
  const { search } = request.nextUrl;

  const response = await backendFetch(
    `/api/v1/scolarite/enseignements/${enseignementId}/moyenne${search}`,
    { cookies: { accessToken } }
  );
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
