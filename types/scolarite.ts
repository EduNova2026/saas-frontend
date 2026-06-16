export interface PromotionOut {
  id: string;
  nom: string;
  annee_scolaire: string;
}

export interface GroupeOut {
  id: string;
  nom: string;
  promotion_id: string;
  semestre: number;
  coefficient: number;
}

export interface MoyenneOut {
  moyenne: number | null;
  semestre: number;
  note_count: number;
  coefficient_total: number;
}

export interface MoyenneParEtudiant {
  etudiant_id: string;
  moyenne: number | null;
  semestre: number;
  note_count: number;
  coefficient_total: number;
}

export interface EtudiantOut {
  id: string;
  nom: string;
  prenom: string;
  promotion_id: string | null;
  utilisateur_id: string;
}

export interface EnseignantGroupeOut {
  enseignant_id: string;
  groupe_id: string;
  assigned_by: string | null;
  created_at: string;
}

export interface ResponsablePromotionOut {
  responsable_id: string;
  promotion_id: string;
  assigned_by: string | null;
  created_at: string;
}

export interface ExamenOut {
  id: string;
  enseignement_id: string;
  nom: string;
  type: string;
  coefficient: number;
  note_max: number;
  date_examen: string | null;
  code_aurion: string | null;
  cree_par: string;
  created_at: string;
}

export interface NoteOut {
  id: string;
  etudiant_id: string;
  examen_id: string;
  examen: ExamenOut;
  valeur: number | null;
  absent: boolean;
  motif_absence: string | null;
  date_saisie: string;
  saisi_par: string;
}

export type PromotionUpdate = Pick<PromotionOut, "nom" | "annee_scolaire">;

export type EtudiantUpdate = Pick<EtudiantOut, "nom" | "prenom">;

export type GroupeUpdate = Pick<GroupeOut, "nom" | "promotion_id"> & { semestre?: number; coefficient?: number };

export interface ExamenCreate {
  enseignement_id: string;
  nom: string;
  type?: string;
  coefficient?: number;
  note_max?: number;
  date_examen?: string | null;
  code_aurion?: string | null;
}

export interface NoteCreate {
  examen_id: string;
  etudiant_id: string;
  valeur: number | null;
  absent: boolean;
  motif_absence?: string | null;
}

export interface NoteUpdate {
  valeur?: number | null;
  absent?: boolean;
  motif_absence?: string | null;
}

export interface NoteBatchCreate {
  examen_id: string;
  notes: NoteCreate[];
}
