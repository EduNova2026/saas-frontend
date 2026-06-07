import { NextRequest, NextResponse } from "next/server";

export default function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  if (pathname === "/" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!accessToken) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/students/:path*", "/promotions/:path*"],
};
