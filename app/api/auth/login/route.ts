import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type LoginBackendResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: unknown;
};

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const backendResponse = await backendFetch("/api/v1/auth/login", {
    method: "POST",
    body,
  });
  const data = await backendResponse.json();

  if (!backendResponse.ok) {
    return NextResponse.json(data, { status: backendResponse.status });
  }

  const loginData = data as LoginBackendResponse;
  const response = NextResponse.json({ user: loginData.user });

  response.cookies.set("access_token", loginData.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 3600,
  });

  response.cookies.set("refresh_token", loginData.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 604800,
  });

  return response;
}
