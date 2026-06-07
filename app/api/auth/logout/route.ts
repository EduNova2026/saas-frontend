import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  await backendFetch("/api/v1/auth/logout", {
    method: "POST",
    cookies: { accessToken },
  });

  const response = NextResponse.json({ success: true });

  response.cookies.set("access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 0,
  });

  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 0,
  });

  return response;
}
