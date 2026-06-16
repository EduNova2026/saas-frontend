import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { search } = request.nextUrl;
  const response = await backendFetch(`/api/v1/scolarite/groupes/${search}`, {
    cookies: { accessToken },
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || !body.nom || !body.promotion_id) {
    return NextResponse.json(
      { detail: "Missing required fields: nom, promotion_id" },
      { status: 400 }
    );
  }

  const response = await backendFetch("/api/v1/scolarite/groupes/", {
    method: "POST",
    cookies: { accessToken },
    body,
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
