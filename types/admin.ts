export interface RoleOut {
  id: string;
  libelle: string;
}

export interface UtilisateurRoleOut {
  utilisateur_id: string;
  role_id: string;
  libelle: string | null;
}

export interface UtilisateurOut {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  roles: string[];
  actif: boolean;
  premier_login: boolean;
}
