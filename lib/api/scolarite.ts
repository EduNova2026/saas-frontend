"use client";

import { apiFetch } from "@/lib/api/http";
import type {
  EnseignantGroupeOut,
  ExamenCreate,
  ExamenOut,
  GroupeUpdate,
  NoteBatchCreate,
  NoteCreate,
  NoteOut,
  NoteUpdate,
  PromotionUpdate,
  ResponsablePromotionOut,
  EtudiantUpdate,
} from "@/types/scolarite";

export type { EnseignantGroupeOut, ResponsablePromotionOut } from "@/types/scolarite";

export interface PromotionOut {
  id: string;
  nom: string;
  annee_scolaire: string;
}

export interface GroupeOut {
  id: string;
  nom: string;
  promotion_id: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const data = await response.json().catch(() => null);
  const record = asRecord(data);
  const detail = record?.detail;
  return new Error(typeof detail === "string" ? detail : fallback);
}

function normalizePromotion(value: unknown): PromotionOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const nested = asRecord(record.promotion);
  const source = nested ?? record;
  const id = source.id ?? source.promotion_id;
  const nom = source.nom ?? source.name ?? source.libelle;
  const anneeScolaire = source.annee_scolaire ?? source.anneeScolaire;

  if (typeof id !== "string" || typeof nom !== "string" || typeof anneeScolaire !== "string") {
    return null;
  }

  return { id, nom, annee_scolaire: anneeScolaire };
}

function normalizePromotionsPayload(payload: unknown): PromotionOut[] {
  const record = asRecord(payload);
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.data)
        ? record.data
        : Array.isArray(record?.promotions)
          ? record.promotions
          : Array.isArray(record?.results)
            ? record.results
            : [];

  return candidates
    .map(normalizePromotion)
    .filter((promotion): promotion is PromotionOut => promotion !== null);
}

function normalizeGroupe(value: unknown): GroupeOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = record.id ?? record.groupe_id;
  const nom = record.nom ?? record.name ?? record.libelle;
  const promotionId = "promotion_id" in record ? record.promotion_id : record.promotionId;

  if (typeof id !== "string" || typeof nom !== "string" || typeof promotionId !== "string") {
    return null;
  }

  return { id, nom, promotion_id: promotionId };
}

function normalizeGroupesPayload(payload: unknown): GroupeOut[] {
  const record = asRecord(payload);
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.data)
        ? record.data
        : Array.isArray(record?.groupes)
          ? record.groupes
          : Array.isArray(record?.results)
            ? record.results
            : [];

  return candidates
    .map(normalizeGroupe)
    .filter((groupe): groupe is GroupeOut => groupe !== null);
}

export async function getPromotions(): Promise<PromotionOut[]> {
  const response = await apiFetch("/api/scolarite/promotions");

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour consulter les promotions."
      );
    }
    throw new Error("Impossible de charger les promotions depuis le serveur.");
  }

  const data = await response.json();
  return normalizePromotionsPayload(data);
}

export async function getPromotion(promotionId: string): Promise<PromotionOut> {
  const response = await apiFetch(`/api/scolarite/promotions/${promotionId}`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour consulter cette promotion."
      );
    }
    throw new Error("Impossible de charger la promotion depuis le serveur.");
  }

  const data = await response.json();
  const promotion = normalizePromotion(data);

  if (!promotion) {
    throw new Error("La réponse promotion est invalide.");
  }

  return promotion;
}

export async function createPromotion(
  nom: string,
  annee_scolaire: string
): Promise<PromotionOut> {
  const response = await apiFetch("/api/scolarite/promotions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, annee_scolaire }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour créer une promotion."
      );
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.detail || "Impossible de créer la promotion."
    );
  }

  const data = await response.json();
  const promotion = normalizePromotion(data);

  if (!promotion) {
    throw new Error("La promotion a été créée, mais la réponse est invalide.");
  }

  return promotion;
}

export async function updatePromotion(
  promotionId: string,
  payload: PromotionUpdate
): Promise<PromotionOut> {
  const response = await apiFetch(`/api/scolarite/promotions/${promotionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de modifier la promotion.");
  }

  const promotion = normalizePromotion(await response.json());

  if (!promotion) {
    throw new Error("La promotion a été modifiée, mais la réponse est invalide.");
  }

  return promotion;
}

export interface EtudiantOut {
  id: string;
  nom: string;
  prenom: string;
  promotion_id: string | null;
  utilisateur_id: string;
}

function normalizeEtudiant(value: unknown): EtudiantOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = record.id ?? record.etudiant_id;
  const nom = record.nom;
  const prenom = record.prenom;
  const promotionId = record.promotion_id ?? record.promotionId;
  const utilisateurId = record.utilisateur_id ?? record.utilisateurId ?? "";

  if (
    typeof id !== "string" ||
    typeof nom !== "string" ||
    typeof prenom !== "string" ||
    (promotionId !== null && typeof promotionId !== "string") ||
    typeof utilisateurId !== "string"
  ) {
    return null;
  }

  return {
    id,
    nom,
    prenom,
    promotion_id: promotionId,
    utilisateur_id: utilisateurId,
  };
}

function normalizeEtudiantsPayload(payload: unknown): EtudiantOut[] {
  const record = asRecord(payload);
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.data)
        ? record.data
        : Array.isArray(record?.etudiants)
          ? record.etudiants
          : Array.isArray(record?.results)
            ? record.results
            : [];

  return candidates
    .map(normalizeEtudiant)
    .filter((etudiant): etudiant is EtudiantOut => etudiant !== null);
}

type GetEtudiantsParams = {
  promotion_id?: string;
  nom?: string;
  prenom?: string;
};

type GetEtudiantsResponse = {
  items: EtudiantOut[];
  count: number;
};

export async function getEtudiants(
  params?: GetEtudiantsParams
): Promise<GetEtudiantsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.promotion_id) {
    searchParams.set("promotion_id", params.promotion_id);
  }

  if (params?.nom) {
    searchParams.set("nom", params.nom);
  }

  if (params?.prenom) {
    searchParams.set("prenom", params.prenom);
  }

  const queryString = searchParams.toString();
  const path = queryString
    ? `/api/scolarite/etudiants?${queryString}`
    : "/api/scolarite/etudiants";
  const response = await apiFetch(path);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour consulter la liste des étudiants."
      );
    }
    throw new Error("Impossible de charger les étudiants depuis le serveur.");
  }

  const data = (await response.json()) as GetEtudiantsResponse;
  const items = normalizeEtudiantsPayload(data);

  return {
    items,
    count: typeof data.count === "number" ? data.count : 0,
  };
}

export async function createEtudiant(
  promotionId: string,
  nom: string,
  prenom: string
): Promise<EtudiantOut> {
  const response = await apiFetch("/api/scolarite/etudiants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, prenom, promotion_id: promotionId }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour ajouter un étudiant."
      );
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || "Impossible d'ajouter l'étudiant.");
  }

  const data = await response.json();
  const etudiant = normalizeEtudiant(data);

  if (!etudiant) {
    throw new Error("L'étudiant a été ajouté, mais la réponse est invalide.");
  }

  return etudiant;
}

export async function updateEtudiant(
  etudiantId: string,
  payload: EtudiantUpdate
): Promise<EtudiantOut> {
  const response = await apiFetch(`/api/scolarite/etudiants/${etudiantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de modifier l'étudiant.");
  }

  const etudiant = normalizeEtudiant(await response.json());

  if (!etudiant) {
    throw new Error("L'étudiant a été modifié, mais la réponse est invalide.");
  }

  return etudiant;
}

export async function removeEtudiantFromPromotion(etudiantId: string): Promise<void> {
  const response = await apiFetch(`/api/scolarite/etudiants/${etudiantId}/promotion`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de retirer l'étudiant de la promotion.");
  }
}

export async function importEtudiants(
  promotionId: string,
  etudiants: Array<{ nom: string; prenom: string }>
): Promise<EtudiantOut[]> {
  const created: EtudiantOut[] = [];

  for (const etudiant of etudiants) {
    created.push(await createEtudiant(promotionId, etudiant.nom, etudiant.prenom));
  }

  return created;
}

export async function getPromotionEtudiants(
  promotionId: string,
  search?: string
): Promise<EtudiantOut[]> {
  const query = search?.trim();
  const path = query
    ? `/api/scolarite/promotions/${promotionId}/etudiants?search=${encodeURIComponent(query)}`
    : `/api/scolarite/promotions/${promotionId}/etudiants`;
  const response = await apiFetch(path);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour consulter les étudiants de cette promotion."
      );
    }
    throw new Error("Impossible de charger les étudiants de la promotion.");
  }

  const data = await response.json();
  return normalizeEtudiantsPayload(data);
}

export async function getPromotionGroupes(
  promotionId: string
): Promise<GroupeOut[]> {
  const response = await apiFetch(`/api/scolarite/promotions/${promotionId}/groupes`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour consulter les groupes de cette promotion."
      );
    }
    throw new Error("Impossible de charger les groupes de la promotion.");
  }

  const data = await response.json();
  return normalizeGroupesPayload(data);
}

export async function createPromotionGroupe(
  promotionId: string,
  nom: string
): Promise<GroupeOut> {
  const response = await apiFetch(`/api/scolarite/promotions/${promotionId}/groupes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour créer un groupe."
      );
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || "Impossible de créer le groupe.");
  }

  const data = await response.json();
  const groupe = normalizeGroupe(data);

  if (!groupe) {
    throw new Error("Le groupe a été créé, mais la réponse est invalide.");
  }

  return groupe;
}

export async function createGroupe(
  promotionId: string,
  nom: string
): Promise<GroupeOut> {
  return createPromotionGroupe(promotionId, nom);
}

export async function getGroupes(): Promise<GroupeOut[]> {
  const response = await apiFetch("/api/scolarite/groupes");

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour consulter les groupes."
      );
    }
    throw new Error("Impossible de charger les groupes depuis le serveur.");
  }

  const data = await response.json();
  return normalizeGroupesPayload(data);
}

export async function getGroupe(groupeId: string): Promise<GroupeOut> {
  const response = await apiFetch(`/api/scolarite/groupes/${groupeId}`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour consulter ce groupe."
      );
    }
    throw new Error("Impossible de charger le groupe depuis le serveur.");
  }

  const data = await response.json();
  const groupe = normalizeGroupe(data);

  if (!groupe) {
    throw new Error("La réponse groupe est invalide.");
  }

  return groupe;
}

export async function updateGroupe(
  groupeId: string,
  payload: GroupeUpdate
): Promise<GroupeOut> {
  const response = await apiFetch(`/api/scolarite/groupes/${groupeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de modifier le groupe.");
  }

  const groupe = normalizeGroupe(await response.json());

  if (!groupe) {
    throw new Error("Le groupe a été modifié, mais la réponse est invalide.");
  }

  return groupe;
}

function normalizeEnseignantGroupe(value: unknown): EnseignantGroupeOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const enseignantId = record.enseignant_id;
  const groupeId = record.groupe_id;
  const assignedBy = record.assigned_by ?? null;
  const createdAt = record.created_at;

  if (
    typeof enseignantId !== "string" ||
    typeof groupeId !== "string" ||
    typeof createdAt !== "string" ||
    (assignedBy !== null && typeof assignedBy !== "string")
  ) {
    return null;
  }

  return {
    enseignant_id: enseignantId,
    groupe_id: groupeId,
    assigned_by: assignedBy,
    created_at: createdAt,
  };
}

function normalizeResponsablePromotion(value: unknown): ResponsablePromotionOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const responsableId = record.responsable_id;
  const promotionId = record.promotion_id;
  const assignedBy = record.assigned_by ?? null;
  const createdAt = record.created_at;

  if (
    typeof responsableId !== "string" ||
    typeof promotionId !== "string" ||
    typeof createdAt !== "string" ||
    (assignedBy !== null && typeof assignedBy !== "string")
  ) {
    return null;
  }

  return {
    responsable_id: responsableId,
    promotion_id: promotionId,
    assigned_by: assignedBy,
    created_at: createdAt,
  };
}

function normalizeArray<T>(payload: unknown, normalize: (value: unknown) => T | null): T[] {
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

  return candidates.map(normalize).filter((item): item is T => item !== null);
}

export async function getGroupeEnseignants(
  groupeId: string
): Promise<EnseignantGroupeOut[]> {
  const response = await apiFetch(`/api/scolarite/groupes/${groupeId}/enseignants`);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger les enseignants du groupe.");
  }

  return normalizeArray(await response.json(), normalizeEnseignantGroupe);
}

export async function getEnseignantGroupes(
  enseignantId: string
): Promise<EnseignantGroupeOut[]> {
  const response = await apiFetch(`/api/scolarite/enseignants/${enseignantId}/groupes`);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger les groupes de l'enseignant.");
  }

  return normalizeArray(await response.json(), normalizeEnseignantGroupe);
}

function normalizeExamen(value: unknown): ExamenOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = record.id;
  const enseignementId = record.enseignement_id;
  const nom = record.nom;
  const type = record.type;
  const coefficient = record.coefficient;
  const noteMax = record.note_max;
  const dateExamen = record.date_examen ?? null;
  const codeAurion = record.code_aurion ?? null;
  const creePar = record.cree_par;
  const createdAt = record.created_at;

  if (
    typeof id !== "string" ||
    typeof enseignementId !== "string" ||
    typeof nom !== "string" ||
    typeof type !== "string" ||
    typeof coefficient !== "number" ||
    typeof noteMax !== "number" ||
    typeof creePar !== "string" ||
    typeof createdAt !== "string" ||
    (dateExamen !== null && typeof dateExamen !== "string") ||
    (codeAurion !== null && typeof codeAurion !== "string")
  ) {
    return null;
  }

  return {
    id,
    enseignement_id: enseignementId,
    nom,
    type,
    coefficient,
    note_max: noteMax,
    date_examen: dateExamen,
    code_aurion: codeAurion,
    cree_par: creePar,
    created_at: createdAt,
  };
}

function normalizeNote(value: unknown): NoteOut | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = record.id;
  const etudiantId = record.etudiant_id;
  const examenId = record.examen_id;
  const examen = normalizeExamen(record.examen);
  const valeur = record.valeur ?? null;
  const absent = record.absent;
  const motifAbsence = record.motif_absence ?? null;
  const dateSaisie = record.date_saisie;
  const saisiPar = record.saisi_par;

  if (
    typeof id !== "string" ||
    typeof etudiantId !== "string" ||
    typeof examenId !== "string" ||
    !examen ||
    (valeur !== null && typeof valeur !== "number") ||
    typeof absent !== "boolean" ||
    (motifAbsence !== null && typeof motifAbsence !== "string") ||
    typeof dateSaisie !== "string" ||
    typeof saisiPar !== "string"
  ) {
    return null;
  }

  return {
    id,
    etudiant_id: etudiantId,
    examen_id: examenId,
    examen,
    valeur,
    absent,
    motif_absence: motifAbsence,
    date_saisie: dateSaisie,
    saisi_par: saisiPar,
  };
}

export async function getExamens(params?: {
  enseignement_id?: string;
  skip?: number;
  limit?: number;
}): Promise<ExamenOut[]> {
  const searchParams = new URLSearchParams();
  if (params?.enseignement_id) searchParams.set("enseignement_id", params.enseignement_id);
  if (typeof params?.skip === "number") searchParams.set("skip", String(params.skip));
  if (typeof params?.limit === "number") searchParams.set("limit", String(params.limit));

  const path = searchParams.size
    ? `/api/scolarite/examens?${searchParams.toString()}`
    : "/api/scolarite/examens";
  const response = await apiFetch(path);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger les examens.");
  }

  return normalizeArray(await response.json(), normalizeExamen);
}

export async function getExamen(examenId: string): Promise<ExamenOut> {
  const response = await apiFetch(`/api/scolarite/examens/${examenId}`);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger l'examen.");
  }

  const examen = normalizeExamen(await response.json());
  if (!examen) throw new Error("La réponse examen est invalide.");
  return examen;
}

export async function createExamen(payload: ExamenCreate): Promise<ExamenOut> {
  const response = await apiFetch("/api/scolarite/examens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de créer l'examen.");
  }

  const examen = normalizeExamen(await response.json());
  if (!examen) throw new Error("L'examen a été créé, mais la réponse est invalide.");
  return examen;
}

export async function getNotes(params?: {
  examen_id?: string;
  etudiant_id?: string;
  enseignement_id?: string;
  skip?: number;
  limit?: number;
}): Promise<NoteOut[]> {
  const searchParams = new URLSearchParams();
  if (params?.examen_id) searchParams.set("examen_id", params.examen_id);
  if (params?.etudiant_id) searchParams.set("etudiant_id", params.etudiant_id);
  if (params?.enseignement_id) searchParams.set("enseignement_id", params.enseignement_id);
  if (typeof params?.skip === "number") searchParams.set("skip", String(params.skip));
  if (typeof params?.limit === "number") searchParams.set("limit", String(params.limit));

  const path = searchParams.size
    ? `/api/scolarite/notes?${searchParams.toString()}`
    : "/api/scolarite/notes";
  const response = await apiFetch(path);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger les notes.");
  }

  return normalizeArray(await response.json(), normalizeNote);
}

export async function createNote(payload: NoteCreate): Promise<NoteOut> {
  const response = await apiFetch("/api/scolarite/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible d'ajouter la note.");
  }

  const note = normalizeNote(await response.json());
  if (!note) throw new Error("La note a été créée, mais la réponse est invalide.");
  return note;
}

export async function createNotesBatch(payload: NoteBatchCreate): Promise<NoteOut[]> {
  const response = await apiFetch("/api/scolarite/notes/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible d'ajouter les notes.");
  }

  return normalizeArray(await response.json(), normalizeNote);
}

export async function updateNote(noteId: string, payload: NoteUpdate): Promise<NoteOut> {
  const response = await apiFetch(`/api/scolarite/notes/${noteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de modifier la note.");
  }

  const note = normalizeNote(await response.json());
  if (!note) throw new Error("La note a été modifiée, mais la réponse est invalide.");
  return note;
}

export async function deleteNote(noteId: string): Promise<void> {
  const response = await apiFetch(`/api/scolarite/notes/${noteId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de supprimer la note.");
  }
}

export async function getGroupeEtudiants(groupeId: string): Promise<EtudiantOut[]> {
  const response = await apiFetch(`/api/scolarite/groupes/${groupeId}/etudiants`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour consulter les étudiants de ce groupe."
      );
    }
    throw new Error("Impossible de charger les étudiants du groupe.");
  }

  const data = await response.json();
  return normalizeEtudiantsPayload(data);
}

export async function assignGroupeToPromotion(
  groupe: GroupeOut,
  promotionId: string
): Promise<GroupeOut> {
  const response = await apiFetch(`/api/scolarite/groupes/${groupe.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom: groupe.nom, promotion_id: promotionId }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour attribuer ce groupe."
      );
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || "Impossible d'attribuer le groupe.");
  }

  const data = await response.json();
  const updatedGroupe = normalizeGroupe(data);

  if (!updatedGroupe) {
    throw new Error("Le groupe a été attribué, mais la réponse est invalide.");
  }

  return updatedGroupe;
}

export async function assignEtudiantToGroupe(
  etudiantId: string,
  groupeId: string
): Promise<void> {
  const response = await apiFetch(`/api/scolarite/etudiants/${etudiantId}/groupes/${groupeId}`, {
    method: "POST",
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour ajouter cet étudiant au groupe."
      );
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || "Impossible d'ajouter l'étudiant au groupe.");
  }
}

export async function unassignEtudiantFromGroupe(
  etudiantId: string,
  groupeId: string
): Promise<void> {
  const response = await apiFetch(`/api/scolarite/etudiants/${etudiantId}/groupes/${groupeId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Accès non autorisé. Vous ne disposez pas des permissions nécessaires pour retirer cet étudiant du groupe."
      );
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || "Impossible de retirer l'étudiant du groupe.");
  }
}

export async function getResponsablePromotions(
  responsableId: string
): Promise<ResponsablePromotionOut[]> {
  const response = await apiFetch(`/api/scolarite/responsables/${responsableId}/promotions`);

  if (!response.ok) {
    throw await readError(response, "Impossible de charger les promotions du responsable.");
  }

  return normalizeArray(await response.json(), normalizeResponsablePromotion);
}

export async function assignResponsableToPromotion(
  promotionId: string,
  responsableId: string
): Promise<ResponsablePromotionOut> {
  const response = await apiFetch(`/api/scolarite/promotions/${promotionId}/responsables/${responsableId}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await readError(response, "Impossible d'assigner le responsable à la promotion.");
  }

  const responsablePromotion = normalizeResponsablePromotion(await response.json());
  if (!responsablePromotion) {
    throw new Error("La réponse d'assignation de responsable est invalide.");
  }

  return responsablePromotion;
}

export async function unassignResponsableFromPromotion(
  promotionId: string,
  responsableId: string
): Promise<void> {
  const response = await apiFetch(`/api/scolarite/promotions/${promotionId}/responsables/${responsableId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de retirer le responsable de la promotion.");
  }
}

export async function assignEnseignantToGroupe(
  groupeId: string,
  enseignantId: string
): Promise<EnseignantGroupeOut> {
  const response = await apiFetch(`/api/scolarite/groupes/${groupeId}/enseignants/${enseignantId}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await readError(response, "Impossible d'attribuer l'enseignant au groupe.");
  }

  const enseignantGroupe = normalizeEnseignantGroupe(await response.json());
  if (!enseignantGroupe) throw new Error("La réponse attribution d'enseignant est invalide.");
  return enseignantGroupe;
}

export async function unassignEnseignantFromGroupe(
  groupeId: string,
  enseignantId: string
): Promise<void> {
  const response = await apiFetch(`/api/scolarite/groupes/${groupeId}/enseignants/${enseignantId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await readError(response, "Impossible de retirer l'enseignant du groupe.");
  }
}
