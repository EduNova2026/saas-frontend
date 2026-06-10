import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { userId } = await context.params;
  const response = await backendFetch(`/api/v1/scolarite/roles/utilisateurs/${userId}/roles`, {
    cookies: { accessToken },
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { userId } = await context.params;
  const body = await request.json();
  const response = await backendFetch(`/api/v1/scolarite/roles/utilisateurs/${userId}/roles`, {
    method: "POST",
    body,
    cookies: { accessToken },
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
