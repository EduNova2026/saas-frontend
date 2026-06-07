import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RefreshBackendResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ detail: "No refresh token" }, { status: 401 });
  }

  const backendResponse = await backendFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
  const data = await backendResponse.json();

  if (!backendResponse.ok) {
    return NextResponse.json(data, { status: backendResponse.status });
  }

  const refreshData = data as RefreshBackendResponse;
  const response = NextResponse.json({ success: true });

  response.cookies.set("access_token", refreshData.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 3600,
  });

  return response;
}
