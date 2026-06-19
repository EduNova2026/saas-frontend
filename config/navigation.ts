import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  School,
  Shield,
  UserRound,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

export const allNavItems: NavItem[] = [
  { title: "Mon profil", url: "/profile", icon: UserRound },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["responsable_pedagogique", "enseignant"] },
  { title: "Étudiants", url: "/students", icon: Users, roles: ["responsable_pedagogique", "admin_pedagogique"] },
  { title: "Promotions", url: "/promotions", icon: GraduationCap, roles: ["admin_pedagogique"] },
  { title: "Mes groupes", url: "/mes-groupes", icon: BookOpen, roles: ["enseignant"] },
  { title: "Mes promotions", url: "/mes-promotions", icon: School, roles: ["responsable_pedagogique"] },
  { title: "Utilisateurs", url: "/admin/utilisateurs", icon: Shield, roles: ["admin_pedagogique"] },
];

export function roleLabel(roles: string[]): string {
  if (roles.includes("responsable_pedagogique")) return "Espace Responsable";
  if (roles.includes("enseignant")) return "Espace Enseignant";
  return "Espace Edunova";
}
