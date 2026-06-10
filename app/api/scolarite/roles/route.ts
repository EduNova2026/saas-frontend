import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<Record<string, never>>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  void context;

  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const response = await backendFetch("/api/v1/scolarite/roles/", {
    cookies: { accessToken },
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
