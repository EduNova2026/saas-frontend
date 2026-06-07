"use client";

import { apiFetch } from "@/lib/api/http";

export interface ImportJobOut {
  id: string;
  statut?: string;
  fichier_nom?: string;
  lignes_total?: number;
  lignes_succes?: number;
  lignes_erreur?: number;
  erreurs_detail?: unknown[];
  created_at?: string;
  updated_at?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeImportJob(value: unknown): ImportJobOut | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string") return null;

  return {
    id: record.id,
    statut: typeof record.statut === "string" ? record.statut : undefined,
    fichier_nom: typeof record.fichier_nom === "string" ? record.fichier_nom : undefined,
    lignes_total: typeof record.lignes_total === "number" ? record.lignes_total : undefined,
    lignes_succes: typeof record.lignes_succes === "number" ? record.lignes_succes : undefined,
    lignes_erreur: typeof record.lignes_erreur === "number" ? record.lignes_erreur : undefined,
    erreurs_detail: Array.isArray(record.erreurs_detail) ? record.erreurs_detail : undefined,
    created_at: typeof record.created_at === "string" ? record.created_at : undefined,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : undefined,
  };
}

function normalizeJobs(payload: unknown): ImportJobOut[] {
  const record = asRecord(payload);
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.data)
        ? record.data
        : Array.isArray(record?.results)
          ? record.results
          : [];

  return candidates
    .map(normalizeImportJob)
    .filter((job): job is ImportJobOut => job !== null);
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const data = await response.json().catch(() => null);
  const detail = asRecord(data)?.detail;
  return new Error(typeof detail === "string" ? detail : fallback);
}

export async function getImportJobs(): Promise<ImportJobOut[]> {
  const response = await apiFetch("/api/imports");

  if (!response.ok) {
    throw await readError(response, "Impossible de charger les imports.");
  }

  return normalizeJobs(await response.json());
}

export async function getImportJob(jobId: string): Promise<ImportJobOut> {
  const response = await apiFetch(`/api/imports/${jobId}`);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger l'import.");
  }

  const job = normalizeImportJob(await response.json());
  if (!job) throw new Error("La réponse import est invalide.");
  return job;
}

export async function uploadNotesCsv(params: {
  enseignementId: string;
  file: File;
}): Promise<ImportJobOut> {
  const formData = new FormData();
  formData.set("file", params.file);

  const response = await apiFetch(
    `/api/imports/upload?enseignement_id=${encodeURIComponent(params.enseignementId)}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw await readError(response, "Impossible d'importer le fichier de notes.");
  }

  const job = normalizeImportJob(await response.json());
  if (!job) throw new Error("L'import a été lancé, mais la réponse est invalide.");
  return job;
}
