"use client";

import { apiFetch } from "@/lib/api/http";

export type ImportErrorCode =
  | "hors_groupe"
  | "etudiant_introuvable"
  | "note_manquante"
  | "erreur_parsing";

export interface ImportErrorDetail {
  ligne: number;
  nom: string;
  prenom: string;
  raison: string;
  code: ImportErrorCode;
  existe_en_base: boolean;
  etudiant_id?: string;
}

export interface ImportJobOut {
  id: string;
  statut?: string;
  fichier_nom?: string;
  lignes_total?: number;
  /** Accepted lines (backend field: lignes_ok) */
  lignes_ok?: number;
  /** @deprecated use lignes_ok */
  lignes_succes?: number;
  lignes_erreur?: number;
  erreurs_detail?: ImportErrorDetail[];
  created_at?: string;
  updated_at?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Normalize a raw error detail object from legacy or enriched format.
 * Derives category from `raison` string if `code` is absent (legacy rows).
 */
function normalizeErrorDetail(raw: unknown): ImportErrorDetail {
  const r = asRecord(raw);
  if (!r) return { ligne: 0, nom: "", prenom: "", raison: "Inconnu", code: "erreur_parsing", existe_en_base: false };

  const raison = typeof r.raison === "string" ? r.raison : "";
  const code = typeof r.code === "string" ? (r.code as ImportErrorCode) : deriveCode(raison);
  const existe_en_base = typeof r.existe_en_base === "boolean" ? r.existe_en_base : raison.includes("non inscrit");

  return {
    ligne: typeof r.ligne === "number" ? r.ligne : 0,
    nom: typeof r.nom === "string" ? r.nom : "",
    prenom: typeof r.prenom === "string" ? r.prenom : "",
    raison,
    code,
    existe_en_base,
    etudiant_id: typeof r.etudiant_id === "string" ? r.etudiant_id : undefined,
  };
}

function deriveCode(raison: string): ImportErrorCode {
  if (raison.includes("non inscrit")) return "hors_groupe";
  if (raison.includes("introuvable")) return "etudiant_introuvable";
  if (raison.includes("Note manquante") || raison.includes("absent")) return "note_manquante";
  return "erreur_parsing";
}

function normalizeImportJob(value: unknown): ImportJobOut | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string") return null;

  const lignesOk = typeof record.lignes_ok === "number" ? record.lignes_ok : undefined;
  const lignesSucces = typeof record.lignes_succes === "number" ? record.lignes_succes : undefined;

  return {
    id: record.id,
    statut: typeof record.statut === "string" ? record.statut : undefined,
    fichier_nom: typeof record.fichier_nom === "string" ? record.fichier_nom : undefined,
    lignes_total: typeof record.lignes_total === "number" ? record.lignes_total : undefined,
    lignes_ok: lignesOk ?? lignesSucces,
    lignes_succes: lignesSucces,
    lignes_erreur: typeof record.lignes_erreur === "number" ? record.lignes_erreur : undefined,
    erreurs_detail: Array.isArray(record.erreurs_detail)
      ? record.erreurs_detail.map(normalizeErrorDetail)
      : undefined,
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
  file: File;
  examenId?: string;
  enseignementId?: string;
  groupeId?: string;
}): Promise<ImportJobOut> {
  const formData = new FormData();
  formData.set("file", params.file);

  const queryParts: string[] = [];
  if (params.examenId) queryParts.push(`examen_id=${encodeURIComponent(params.examenId)}`);
  if (params.enseignementId) queryParts.push(`enseignement_id=${encodeURIComponent(params.enseignementId)}`);
  if (params.groupeId) queryParts.push(`groupe_id=${encodeURIComponent(params.groupeId)}`);
  const query = queryParts.join("&");

  const response = await apiFetch(
    `/api/imports/upload?${query}`,
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
