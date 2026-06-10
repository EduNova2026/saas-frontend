"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, Loader2, Mail, Shield, ShieldAlert, UserRound, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  getRoles,
  getUser,
  getUserRoles,
  replaceUserRolesAndClearAssignments,
} from "@/lib/api/admin";
import {
  getEnseignantGroupes,
  getGroupe,
  getPromotion,
  getResponsablePromotions,
  type GroupeOut,
  type PromotionOut,
} from "@/lib/api/scolarite";
import type { RoleOut, UtilisateurOut, UtilisateurRoleOut } from "@/types/admin";
import type { EnseignantGroupeOut, ResponsablePromotionOut } from "@/types/scolarite";

type UtilisateurWithCreation = UtilisateurOut & {
  created_at?: string | null;
};

type GroupeAssignment = EnseignantGroupeOut & {
  groupe: GroupeOut | null;
  promotion: PromotionOut | null;
};

type PromotionAssignment = ResponsablePromotionOut & {
  promotion: PromotionOut | null;
};

function formatRole(role: string): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

function StatusBadge({ actif }: { actif: boolean }) {
  return actif ? (
    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Actif</Badge>
  ) : (
    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
      Inactif
    </Badge>
  );
}

export default function AdminUtilisateurProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const { user: currentUser, hasRole, loading: authLoading } = useAuth();
  const canAccessUsers = hasRole("admin_pedagogique");
  const [utilisateur, setUtilisateur] = useState<UtilisateurOut | null>(null);
  const [roles, setRoles] = useState<RoleOut[]>([]);
  const [userRoles, setUserRoles] = useState<UtilisateurRoleOut[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [groupAssignments, setGroupAssignments] = useState<GroupeAssignment[]>([]);
  const [promotionAssignments, setPromotionAssignments] = useState<PromotionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeRoleNames = useMemo(() => {
    const names = new Set<string>();
    userRoles.forEach((role) => {
      if (role.libelle) names.add(role.libelle);
    });
    utilisateur?.roles.forEach((role) => names.add(role));
    return names;
  }, [userRoles, utilisateur]);

  const hasEnseignantRole = activeRoleNames.has("enseignant");
  const hasResponsablePedagogiqueRole = activeRoleNames.has("responsable_pedagogique");

  const loadAssignments = useCallback(
    async (roleNames: Set<string>) => {
      setAssignmentsLoading(true);
      setGroupAssignments([]);
      setPromotionAssignments([]);

      try {
        const [groupes, promotions] = await Promise.all([
          roleNames.has("enseignant")
            ? getEnseignantGroupes(userId).then(async (assignments) =>
                Promise.all(
                  assignments.map(async (assignment) => {
                    const groupe = await getGroupe(assignment.groupe_id).catch(() => null);
                    const promotion = groupe
                      ? await getPromotion(groupe.promotion_id).catch(() => null)
                      : null;
                    return { ...assignment, groupe, promotion };
                  })
                )
              )
            : Promise.resolve([]),
          roleNames.has("responsable_pedagogique")
            ? getResponsablePromotions(userId).then(async (assignments) =>
                Promise.all(
                  assignments.map(async (assignment) => {
                    const promotion = await getPromotion(assignment.promotion_id).catch(() => null);
                    return { ...assignment, promotion };
                  })
                )
              )
            : Promise.resolve([]),
        ]);

        setGroupAssignments(groupes);
        setPromotionAssignments(promotions);
      } catch (err) {
        setRoleError(err instanceof Error ? err.message : "Impossible de charger les assignations.");
      } finally {
        setAssignmentsLoading(false);
      }
    },
    [userId]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRoleError(null);

      const [loadedUser, loadedRoles, loadedUserRoles] = await Promise.all([
        getUser(userId),
        getRoles(),
        getUserRoles(userId),
      ]);

      const loadedRoleNames = new Set<string>();
      loadedUserRoles.forEach((role) => {
        if (role.libelle) loadedRoleNames.add(role.libelle);
      });
      loadedUser.roles.forEach((role) => loadedRoleNames.add(role));

      setUtilisateur(loadedUser);
      setRoles(loadedRoles);
      setUserRoles(loadedUserRoles);
      setSelectedRoles(new Set(loadedUserRoles.map((role) => role.role_id)));
      await loadAssignments(loadedRoleNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le profil utilisateur.");
    } finally {
      setLoading(false);
    }
  }, [loadAssignments, userId]);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser || !canAccessUsers) return;

    queueMicrotask(() => void loadData());
  }, [authLoading, canAccessUsers, currentUser, loadData]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const handleSaveRoles = async () => {
    setSaving(true);
    setRoleError(null);

    try {
      await replaceUserRolesAndClearAssignments(userId, Array.from(selectedRoles));
      setShowRoleConfirm(false);
      await loadData();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Impossible d'enregistrer les rôles.");
    } finally {
      setSaving(false);
    }
  };

  const creationDate = formatDate((utilisateur as UtilisateurWithCreation | null)?.created_at);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  if (!currentUser || !canAccessUsers) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="mt-1 text-sm text-slate-600">
                Votre rôle ne permet pas d&apos;accéder à la gestion des utilisateurs.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/profile">Retour à mon profil</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-10">
      <Button asChild variant="outline">
        <Link href="/admin/utilisateurs">← Utilisateurs</Link>
      </Button>

      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement du profil utilisateur…
          </CardContent>
        </Card>
      ) : utilisateur ? (
        <>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {utilisateur.prenom} {utilisateur.nom}
            </h1>
            <p className="text-sm text-slate-500">Profil, rôles et assignations pédagogiques.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserRound className="h-5 w-5 text-blue-600" />
                  Informations utilisateur
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nom</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {utilisateur.nom || "Non renseigné"}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Prénom</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {utilisateur.prenom || "Non renseigné"}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4 sm:col-span-2">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">{utilisateur.email}</p>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Statut</p>
                  <div className="mt-2">
                    <StatusBadge actif={utilisateur.actif} />
                  </div>
                </div>
                {creationDate ? (
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Date de création
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{creationDate}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Rôles actuels
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeRoleNames.size > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(activeRoleNames).map((role) => (
                      <Badge key={role} className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                        {formatRole(role)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Aucun rôle associé.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BadgeCheck className="h-5 w-5 text-blue-600" />
                Gestion des rôles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {roles.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={selectedRoles.has(role.id)}
                        onChange={() => toggleRole(role.id)}
                      />
                      {formatRole(role.libelle)}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Aucun rôle disponible.</p>
              )}

              {roleError ? <p className="text-sm text-red-600">{roleError}</p> : null}

              <Button onClick={() => setShowRoleConfirm(true)} disabled={roles.length === 0 || saving}>
                Enregistrer les rôles
              </Button>
            </CardContent>
          </Card>

          {assignmentsLoading ? (
            <Card>
              <CardContent className="flex items-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des assignations…
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            {hasEnseignantRole ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UsersRound className="h-5 w-5 text-blue-600" />
                    Groupes assignés
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupAssignments.length > 0 ? (
                    groupAssignments.map((assignment) => (
                      <div key={assignment.groupe_id} className="rounded-lg border bg-white p-4">
                        <p className="font-semibold text-slate-900">
                          {assignment.groupe?.nom ?? "Groupe indisponible"}
                        </p>
                        <p className="text-sm text-slate-500">
                          Promotion : {assignment.promotion?.nom ?? "Promotion indisponible"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Aucun groupe assigné.</p>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {hasResponsablePedagogiqueRole ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Promotions assignées
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {promotionAssignments.length > 0 ? (
                    promotionAssignments.map((assignment) => (
                      <div key={assignment.promotion_id} className="rounded-lg border bg-white p-4">
                        <p className="font-semibold text-slate-900">
                          {assignment.promotion?.nom ?? "Promotion indisponible"}
                        </p>
                        <p className="text-sm text-slate-500">
                          Année : {assignment.promotion?.annee_scolaire ?? "Non renseignée"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Aucune promotion assignée.</p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Dialog open={showRoleConfirm} onOpenChange={setShowRoleConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmer le changement de rôles</DialogTitle>
                <DialogDescription>
                  Attention : changer les rôles supprimera les assignations incompatibles : groupes
                  assignés si le rôle &quot;enseignant&quot; est retiré, promotions assignées si le rôle
                  &quot;responsable_pedagogique&quot; est retiré.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRoleConfirm(false)} disabled={saving}>
                  Annuler
                </Button>
                <Button onClick={handleSaveRoles} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirmer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            Utilisateur introuvable.
          </CardContent>
        </Card>
      )}
    </main>
  );
}
