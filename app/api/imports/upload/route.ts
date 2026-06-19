import { backendFormDataFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const examenId = request.nextUrl.searchParams.get("examen_id");
  const enseignementId = request.nextUrl.searchParams.get("enseignement_id");
  const groupeId = request.nextUrl.searchParams.get("groupe_id");

  if (!examenId && !enseignementId) {
    return NextResponse.json({ detail: "Missing examen_id or enseignement_id" }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);

  if (!formData || !formData.get("file")) {
    return NextResponse.json({ detail: "Missing file" }, { status: 400 });
  }

  const queryParts: string[] = [];
  if (examenId) queryParts.push(`examen_id=${encodeURIComponent(examenId)}`);
  if (enseignementId) queryParts.push(`enseignement_id=${encodeURIComponent(enseignementId)}`);
  if (groupeId) queryParts.push(`groupe_id=${encodeURIComponent(groupeId)}`);
  const query = queryParts.join("&");

  const response = await backendFormDataFetch(
    `/api/v1/imports/upload?${query}`,
    formData,
    { cookies: { accessToken } }
  );
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
