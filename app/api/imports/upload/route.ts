import { backendFormDataFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const examenId = request.nextUrl.searchParams.get("examen_id");
  const enseignementId = request.nextUrl.searchParams.get("enseignement_id");

  if (!examenId && !enseignementId) {
    return NextResponse.json({ detail: "Missing examen_id or enseignement_id" }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);

  if (!formData || !formData.get("file")) {
    return NextResponse.json({ detail: "Missing file" }, { status: 400 });
  }

  const query = examenId
    ? `examen_id=${encodeURIComponent(examenId)}`
    : `enseignement_id=${encodeURIComponent(enseignementId!)}`;

  const response = await backendFormDataFetch(
    `/api/v1/imports/upload?${query}`,
    formData,
    { cookies: { accessToken } }
  );
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
