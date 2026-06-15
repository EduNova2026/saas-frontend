import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const meResponse = await backendFetch("/api/v1/auth/me", {
    cookies: { accessToken },
  });

  if (!meResponse.ok) {
    return NextResponse.json(
      { detail: "Unable to verify identity" },
      { status: 502 }
    );
  }

  const user = await meResponse.json();
  const roles: string[] = user.roles ?? [];

  const isAdmin = roles.includes("admin_pedagogique");
  const isRP = roles.includes("responsable_pedagogique");

  if (!isAdmin && !isRP) {
    return NextResponse.json(
      { detail: "Insufficient permissions" },
      { status: 403 }
    );
  }

  const { search } = request.nextUrl;
  const response = await backendFetch(`/api/v1/scolarite/promotions/${search}`, {
    cookies: { accessToken },
  });
  const data = await response.json();

  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || !body.nom || !body.annee_scolaire) {
    return NextResponse.json(
      { detail: "Missing required fields: nom, annee_scolaire" },
      { status: 400 }
    );
  }

  const backendResponse = await backendFetch("/api/v1/scolarite/promotions/", {
    method: "POST",
    cookies: { accessToken },
    body: { nom: body.nom, annee_scolaire: body.annee_scolaire },
  });

  const data = await backendResponse.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendResponse.status });
}
