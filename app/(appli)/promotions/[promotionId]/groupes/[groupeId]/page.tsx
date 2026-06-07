"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Search, ShieldAlert, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assignEtudiantToGroupe,
  getGroupe,
  getGroupeEtudiants,
  getPromotionEtudiants,
  unassignEtudiantFromGroupe,
  type EtudiantOut,
  type GroupeOut,
} from "@/lib/api/scolarite";
import { useAuth } from "@/hooks/useAuth";

function getParamValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function GroupeManagementPage() {
  const params = useParams<{ promotionId: string; groupeId: string }>();
  const promotionId = getParamValue(params.promotionId);
  const groupeId = getParamValue(params.groupeId);
  const { hasRole, loading: authLoading } = useAuth();
  const [groupe, setGroupe] = useState<GroupeOut | null>(null);
  const [etudiantsGroupe, setEtudiantsGroupe] = useState<EtudiantOut[]>([]);
  const [etudiantsPromotion, setEtudiantsPromotion] = useState<EtudiantOut[]>([]);
  const [recherche, setRecherche] = useState("");
  const [selectedEtudiantId, setSelectedEtudiantId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isAdminPedagogique = hasRole("admin") || hasRole("admin_pedagogique");
  const canManagePromotions = hasRole("responsable_pedagogique") || isAdminPedagogique;

  const chargerGroupe = useCallback(async () => {
    if (!promotionId || !groupeId) return;

    try {
      setLoading(true);
      setError(null);
      const [groupeData, groupeEtudiantsData, promotionEtudiantsData] = await Promise.all([
        getGroupe(groupeId),
        getGroupeEtudiants(groupeId),
        getPromotionEtudiants(promotionId),
      ]);
      setGroupe(groupeData);
      setEtudiantsGroupe(groupeEtudiantsData);
      setEtudiantsPromotion(promotionEtudiantsData);
      setSelectedEtudiantId(
        promotionEtudiantsData.find(
          (etudiant) => !groupeEtudiantsData.some((item) => item.id === etudiant.id)
        )?.id ?? ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le groupe.");
    } finally {
      setLoading(false);
    }
  }, [groupeId, promotionId]);

  useEffect(() => {
    if (authLoading || !canManagePromotions) {
      setLoading(false);
      return;
    }

    void chargerGroupe();
  }, [authLoading, canManagePromotions, chargerGroupe]);

  const etudiantsFiltres = useMemo(() => {
    const search = recherche.trim().toLowerCase();
    if (!search) return etudiantsGroupe;

    return etudiantsGroupe.filter((etudiant) =>
      `${etudiant.prenom} ${etudiant.nom}`.toLowerCase().includes(search)
    );
  }, [etudiantsGroupe, recherche]);

  const etudiantsDisponibles = useMemo(
    () =>
      etudiantsPromotion.filter(
        (etudiant) => !etudiantsGroupe.some((item) => item.id === etudiant.id)
      ),
    [etudiantsGroupe, etudiantsPromotion]
  );

  const handleAssignEtudiant = async () => {
    if (!selectedEtudiantId) {
      setActionError("Sélectionnez un étudiant à ajouter.");
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      await assignEtudiantToGroupe(selectedEtudiantId, groupeId);
      setDialogOpen(false);
      await chargerGroupe();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erreur lors de l'ajout de l'étudiant."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignEtudiant = async (etudiantId: string) => {
    setSaving(true);
    setActionError(null);

    try {
      await unassignEtudiantFromGroupe(etudiantId, groupeId);
      await chargerGroupe();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erreur lors du retrait de l'étudiant."
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  if (!canManagePromotions) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="mt-1 text-sm text-slate-600">
                Votre rôle ne permet pas d'accéder à la gestion de ce groupe.
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
    <main className="p-10 bg-slate-50 min-h-screen space-y-6">
      <Button asChild variant="ghost" className="w-fit gap-2 px-0 text-slate-600">
        <Link href={`/promotions/${promotionId}`}>
          <ArrowLeft className="h-4 w-4" />
          Retour à la promotion
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion du groupe</h1>
          <p className="text-sm text-slate-500">
            {groupe ? groupe.nom : "Étudiants rattachés au groupe."}
          </p>
        </div>
        <Card className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Étudiants</p>
              <p className="font-bold text-slate-900">
                {loading ? "…" : etudiantsGroupe.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}
      {actionError ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{actionError}</CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm border overflow-hidden">
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Étudiants du groupe</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un étudiant..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-10 bg-white border-slate-200"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter un étudiant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un étudiant au groupe</DialogTitle>
                  <DialogDescription>
                    Sélectionnez un étudiant de cette promotion qui n'est pas déjà dans le groupe.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label htmlFor="etudiant-groupe" className="text-sm font-medium text-slate-700">
                    Étudiant
                  </label>
                  <select
                    id="etudiant-groupe"
                    value={selectedEtudiantId}
                    onChange={(e) => setSelectedEtudiantId(e.target.value)}
                    disabled={etudiantsDisponibles.length === 0}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50"
                  >
                    {etudiantsDisponibles.length > 0 ? (
                      etudiantsDisponibles.map((etudiant) => (
                        <option key={etudiant.id} value={etudiant.id}>
                          {etudiant.prenom} {etudiant.nom}
                        </option>
                      ))
                    ) : (
                      <option>Aucun étudiant disponible</option>
                    )}
                  </select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAssignEtudiant}
                    disabled={!selectedEtudiantId || saving || etudiantsDisponibles.length === 0}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ajout…
                      </>
                    ) : (
                      "Ajouter"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <ScrollArea className="h-[500px] w-full">
          <Table>
            <TableHeader className="bg-slate-50 border-b sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead>Étudiant</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-sm text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des étudiants…
                    </div>
                  </TableCell>
                </TableRow>
              ) : etudiantsFiltres.length > 0 ? (
                etudiantsFiltres.map((etudiant) => (
                  <TableRow key={etudiant.id}>
                    <TableCell className="py-4 font-medium text-slate-900">
                      {etudiant.prenom} {etudiant.nom}
                    </TableCell>
                    <TableCell className="py-4 text-sm text-slate-500">
                      {etudiant.id}
                    </TableCell>
                    <TableCell className="py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-red-600 hover:text-red-700"
                        onClick={() => void handleUnassignEtudiant(etudiant.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                        Retirer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-sm text-slate-500">
                    Aucun étudiant trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </main>
  );
}
