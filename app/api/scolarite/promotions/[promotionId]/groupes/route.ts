import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ promotionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { promotionId } = await context.params;
  const response = await backendFetch(`/api/v1/scolarite/promotions/${promotionId}/groupes`, {
    cookies: { accessToken },
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { promotionId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body.nom !== "string" || !body.nom.trim()) {
    return NextResponse.json({ detail: "Missing required field: nom" }, { status: 400 });
  }

  const response = await backendFetch("/api/v1/scolarite/groupes/", {
    method: "POST",
    cookies: { accessToken },
    body: { nom: body.nom.trim(), promotion_id: promotionId },
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
