import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { search } = request.nextUrl;
  const backendResponse = await backendFetch(`/api/v1/scolarite/etudiants/${search}`, {
    cookies: { accessToken },
  });
  const data = await backendResponse.json();

  return NextResponse.json(data, { status: backendResponse.status });
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.nom !== "string" || typeof body.prenom !== "string" || typeof body.promotion_id !== "string") {
    return NextResponse.json(
      { detail: "Missing required fields: nom, prenom, promotion_id" },
      { status: 400 }
    );
  }

  const backendResponse = await backendFetch("/api/v1/scolarite/etudiants/", {
    method: "POST",
    cookies: { accessToken },
    body: {
      nom: body.nom.trim(),
      prenom: body.prenom.trim(),
      promotion_id: body.promotion_id,
    },
  });
  const data = await backendResponse.json().catch(() => ({}));

  return NextResponse.json(data, { status: backendResponse.status });
}
