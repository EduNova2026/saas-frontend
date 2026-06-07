import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const backendResponse = await backendFetch("/api/v1/auth/me", {
    cookies: { accessToken },
  });
  const data = await backendResponse.json();

  return NextResponse.json(data, { status: backendResponse.status });
}
