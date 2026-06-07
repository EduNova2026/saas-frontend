import { backendFetch } from "@/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { noteId } = await context.params;
  const response = await backendFetch(`/api/v1/scolarite/notes/${noteId}`, {
    cookies: { accessToken },
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { noteId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ detail: "Missing request body" }, { status: 400 });
  }

  const response = await backendFetch(`/api/v1/scolarite/notes/${noteId}`, {
    method: "PATCH",
    cookies: { accessToken },
    body,
  });
  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { noteId } = await context.params;
  const response = await backendFetch(`/api/v1/scolarite/notes/${noteId}`, {
    method: "DELETE",
    cookies: { accessToken },
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
