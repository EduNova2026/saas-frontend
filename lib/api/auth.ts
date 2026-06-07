"use client";

import { apiFetch } from "@/lib/api/http";

export interface UserOut {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  roles: string[];
  actif: boolean;
  premier_login: boolean;
}

export interface LoginResponse {
  user: UserOut;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json() as Promise<T>;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseJsonResponse<LoginResponse>(response);
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
}

export async function me(): Promise<UserOut> {
  const response = await apiFetch("/api/auth/me");

  return parseJsonResponse<UserOut>(response);
}
