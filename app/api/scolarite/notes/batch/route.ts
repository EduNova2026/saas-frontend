import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.examen_id !== "string" || !Array.isArray(body.notes)) {
    return NextResponse.json(
      { detail: "Missing required fields: examen_id, notes" },
      { status: 400 }
    );
  }

  const response = await backendFetch("/api/v1/scolarite/notes/batch", {
    method: "POST",
    cookies: { accessToken },
    body,
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
