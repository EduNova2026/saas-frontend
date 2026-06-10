import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ promotionId: string; responsableId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { promotionId, responsableId } = await context.params;
  const response = await backendFetch(
    `/api/v1/scolarite/promotions/${promotionId}/responsables/${responsableId}`,
    { method: "POST", cookies: { accessToken } }
  );
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { promotionId, responsableId } = await context.params;
  const response = await backendFetch(
    `/api/v1/scolarite/promotions/${promotionId}/responsables/${responsableId}`,
    { method: "DELETE", cookies: { accessToken } }
  );

  return new NextResponse(null, { status: response.status });
}
