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

export type ExamenUpdate = Partial<Omit<ExamenCreate, "enseignement_id">>;

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

export interface EtudiantExportNote {
  examen_id: string;
  examen_nom: string;
  examen_type: string;
  examen_coefficient: number;
  examen_note_max: number;
  examen_date: string | null;
  note_valeur: number | null;
  note_absent: boolean;
  note_motif_absence: string | null;
}

export interface EtudiantExportGroupe {
  groupe_id: string;
  groupe_nom: string;
  semestre: number;
  coefficient: number;
  notes: EtudiantExportNote[];
}

export interface EtudiantExport {
  etudiant_id: string;
  nom: string;
  prenom: string;
  promotion_id: string | null;
  promotion_nom: string | null;
  groupes: EtudiantExportGroupe[];
}

// --- Risque ---

export type StatutRisque = "Non évalué" | "OK" | "Suivre" | "Risque";
export type ReferenceRisque = "promotion" | "groupe" | "seuil_10";

export interface RisqueOut {
  score_risque: number | null;
  statut: StatutRisque;
  moyenne: number | null;
  moyenne_reference: number | null;
  ecart_moyenne: number | null;
  semestre: number;
  note_count: number;
  coefficient_total: number;
  absence_count: number;
  evaluation_count: number;
  absence_rate: number;
  score_notes: number | null;
  score_absences: number;
  reference_scope: ReferenceRisque;
  formule_version: string;
}

export interface RisqueParEtudiant extends RisqueOut {
  etudiant_id: string;
}
