import "server-only";

import { env } from "@/lib/env";

type BackendFetchOptions = {
  method?: string;
  body?: unknown;
  cookies?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

export async function backendFetch(
  path: string,
  options: BackendFetchOptions = {}
): Promise<Response> {
  const normalizedBaseUrl = env.EDUNOVA_API_URL.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  const url = `${normalizedBaseUrl}/${normalizedPath}`;

  const headers = new Headers();

  if (options.cookies?.accessToken) {
    headers.set("Authorization", `Bearer ${options.cookies.accessToken}`);
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(options.body);
  }

  try {
    return await fetch(url, init);
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

export async function backendFormDataFetch(
  path: string,
  formData: FormData,
  options: Omit<BackendFetchOptions, "body"> = {}
): Promise<Response> {
  const normalizedBaseUrl = env.EDUNOVA_API_URL.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  const url = `${normalizedBaseUrl}/${normalizedPath}`;

  const headers = new Headers();

  if (options.cookies?.accessToken) {
    headers.set("Authorization", `Bearer ${options.cookies.accessToken}`);
  }

  try {
    return await fetch(url, {
      method: options.method ?? "POST",
      headers,
      body: formData,
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
