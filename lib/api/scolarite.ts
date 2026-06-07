"use client";

import { apiFetch } from "@/lib/api/http";

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
  const promotionId = record.promotion_id ?? record.promotionId;

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

export interface EtudiantOut {
  id: string;
  nom: string;
  prenom: string;
  promotion_id: string;
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
    typeof promotionId !== "string" ||
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
