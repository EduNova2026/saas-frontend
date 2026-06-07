"use client";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    return response.ok;
  } catch {
    return false;
  }
}

function redirectToHome(): void {
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }

  if (response.status !== 401 || path === "/api/auth/refresh") {
    return response;
  }

  const refreshed = await refreshAccessToken();

  if (!refreshed) {
    redirectToHome();
    return response;
  }

  try {
    return await fetch(path, options);
  } catch {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }
}
