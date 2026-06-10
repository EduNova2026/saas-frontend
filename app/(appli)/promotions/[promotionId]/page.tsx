"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import {
  createEtudiant,
  createPromotionGroupe,
  getNotes,
  getPromotion,
  getPromotionEtudiants,
  getPromotionGroupes,
  removeEtudiantFromPromotion,
  updateEtudiant,
  updateGroupe,
  type EtudiantOut,
  type GroupeOut,
  type PromotionOut,
} from "@/lib/api/scolarite";
import type { NoteOut } from "@/types/scolarite";

type Tab = "groupes" | "etudiants";

function getParamValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function loadNotes(etudiantIds: string[]) {
  const allNotes: NoteOut[] = [];

  for (const id of etudiantIds) {
    try {
      const notes = await getNotes({ etudiant_id: id, limit: 1000 });
      allNotes.push(...notes);
    } catch {}
  }

  return allNotes;
}

function computeAverage(notes: NoteOut[], etudiantId: string): number | null {
  const studentNotes = notes.filter((note) => note.etudiant_id === etudiantId && !note.absent && note.valeur !== null);
  if (studentNotes.length === 0) return null;

  const sum = studentNotes.reduce((acc, note) => {
    const normalized = (note.valeur! / note.examen.note_max) * 20;
    return acc + normalized;
  }, 0);

  return sum / studentNotes.length;
}

function computePromotionStats(notes: NoteOut[], etudiantIds: string[]) {
  const averages = etudiantIds
    .map((id) => computeAverage(notes, id))
    .filter((average): average is number => average !== null);

  if (averages.length === 0) {
    return { moyenneGenerale: null, tauxReussite: null };
  }

  const moyenneGenerale = averages.reduce((sum, average) => sum + average, 0) / averages.length;
  const tauxReussite = (averages.filter((average) => average >= 10).length / averages.length) * 100;

  return { moyenneGenerale, tauxReussite };
}

function formatAverage(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}/20`;
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}%`;
}

function formatStudentName(prenom: string, nom: string): string {
  return `${nom.toUpperCase()} ${prenom.charAt(0).toUpperCase()}${prenom.slice(1).toLowerCase()}`;
}

export default function PromotionDashboardPage() {
  const params = useParams<{ promotionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const promotionId = getParamValue(params.promotionId);
  const activeTab: Tab = searchParams.get("tab") === "etudiants" ? "etudiants" : "groupes";
  const { hasRole, loading: authLoading } = useAuth();

  const [promotion, setPromotion] = useState<PromotionOut | null>(null);
  const [etudiants, setEtudiants] = useState<EtudiantOut[]>([]);
  const [groupes, setGroupes] = useState<GroupeOut[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogEtudiantOpen, setDialogEtudiantOpen] = useState(false);
  const [dialogGroupeOpen, setDialogGroupeOpen] = useState(false);
  const [nomEtudiant, setNomEtudiant] = useState("");
  const [prenomEtudiant, setPrenomEtudiant] = useState("");
  const [nomGroupe, setNomGroupe] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingEtudiant, setEditingEtudiant] = useState<EtudiantOut | null>(null);
  const [editingGroupe, setEditingGroupe] = useState<GroupeOut | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editPrenom, setEditPrenom] = useState("");
  const [moyenneGenerale, setMoyenneGenerale] = useState<number | null>(null);
  const [tauxReussite, setTauxReussite] = useState<number | null>(null);

  const isAdminPedagogique = hasRole("admin") || hasRole("admin_pedagogique");
  const canManagePromotions = hasRole("responsable_pedagogique") || isAdminPedagogique;

  const loadPromotion = useCallback(async () => {
    if (!promotionId) return;

    try {
      setLoading(true);
      setError(null);
      const [promotionData, etudiantsData, groupesData] = await Promise.all([
        getPromotion(promotionId),
        getPromotionEtudiants(promotionId),
        getPromotionGroupes(promotionId),
      ]);
      const notesData = await loadNotes(etudiantsData.map((etudiant) => etudiant.id));
      const stats = computePromotionStats(notesData, etudiantsData.map((etudiant) => etudiant.id));
      setPromotion(promotionData);
      setEtudiants(etudiantsData);
      setGroupes(groupesData);
      setMoyenneGenerale(stats.moyenneGenerale);
      setTauxReussite(stats.tauxReussite);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger la promotion.");
    } finally {
      setLoading(false);
    }
  }, [promotionId]);

  useEffect(() => {
    if (!authLoading && canManagePromotions) {
      queueMicrotask(() => void loadPromotion());
    }
  }, [authLoading, canManagePromotions, loadPromotion]);

  const filteredEtudiants = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return etudiants;

    return etudiants.filter((etudiant) =>
      formatStudentName(etudiant.prenom, etudiant.nom).toLowerCase().includes(value)
    );
  }, [etudiants, search]);

  const changeTab = (tab: Tab) => {
    router.replace(`/promotions/${promotionId}?tab=${tab}`);
  };

  const handleCreateEtudiant = async () => {
    setSaving(true);
    setActionError(null);

    try {
      await createEtudiant(promotionId, nomEtudiant.trim(), prenomEtudiant.trim());
      setDialogEtudiantOpen(false);
      setNomEtudiant("");
      setPrenomEtudiant("");
      await loadPromotion();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible d'ajouter l'étudiant.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateGroupe = async () => {
    setSaving(true);
    setActionError(null);

    try {
      await createPromotionGroupe(promotionId, nomGroupe.trim());
      setDialogGroupeOpen(false);
      setNomGroupe("");
      await loadPromotion();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de créer le groupe.");
    } finally {
      setSaving(false);
    }
  };

  const openEtudiantEdit = (etudiant: EtudiantOut) => {
    setEditingEtudiant(etudiant);
    setEditingGroupe(null);
    setEditNom(etudiant.nom);
    setEditPrenom(etudiant.prenom);
    setActionError(null);
  };

  const openGroupeEdit = (groupe: GroupeOut) => {
    setEditingGroupe(groupe);
    setEditingEtudiant(null);
    setEditNom(groupe.nom);
    setEditPrenom("");
    setActionError(null);
  };

  const closeEditDialog = () => {
    setEditingEtudiant(null);
    setEditingGroupe(null);
    setEditNom("");
    setEditPrenom("");
  };

  const handleUpdate = async () => {
    setSaving(true);
    setActionError(null);

    try {
      if (editingEtudiant) {
        await updateEtudiant(editingEtudiant.id, {
          nom: editNom.trim(),
          prenom: editPrenom.trim(),
        });
      }

      if (editingGroupe) {
        await updateGroupe(editingGroupe.id, {
          nom: editNom.trim(),
          promotion_id: editingGroupe.promotion_id,
        });
      }

      closeEditDialog();
      await loadPromotion();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de modifier l'élément.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStudent = async (etudiant: EtudiantOut) => {
    const confirmed = window.confirm(
      `Retirer ${etudiant.nom} ${etudiant.prenom} de cette promotion ?`
    );
    if (!confirmed) return;

    setSaving(true);
    setActionError(null);

    try {
      await removeEtudiantFromPromotion(etudiant.id);
      await loadPromotion();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de retirer l'étudiant.");
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
                Votre rôle ne permet pas d&apos;accéder à la gestion de cette promotion.
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
      <Button asChild variant="ghost" className="w-fit gap-2 px-0 text-slate-600">
        <Link href="/promotions">
          <ArrowLeft className="h-4 w-4" />
          Retour aux promotions
        </Link>
      </Button>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">
          {promotion ? promotion.nom : "Tableau de bord promotion"}
        </h1>
        <p className="text-sm text-slate-500">
          {promotion ? promotion.annee_scolaire : "Statistiques, groupes et étudiants."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Étudiants" value={loading ? "…" : String(etudiants.length)} icon={<Users />} />
        <StatCard title="Groupes" value={loading ? "…" : String(groupes.length)} icon={<GraduationCap />} />
        <StatCard title="Moyenne de la promotion" value={loading ? "…" : formatAverage(moyenneGenerale)} icon={<TrendingUp />} />
        <StatCard title="Taux de réussite" value={loading ? "…" : formatPercent(tauxReussite)} icon={<TrendingUp />} />
      </div>

      {error || actionError ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error ?? actionError}</CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader className="border-b pb-0">
          <div className="flex gap-2">
            <Button variant={activeTab === "groupes" ? "default" : "ghost"} onClick={() => changeTab("groupes")}>
              Groupes
            </Button>
            <Button variant={activeTab === "etudiants" ? "default" : "ghost"} onClick={() => changeTab("etudiants")}>
              Étudiants
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {activeTab === "groupes" ? (
            <section className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={dialogGroupeOpen} onOpenChange={setDialogGroupeOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Créer un groupe
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un groupe</DialogTitle>
                      <DialogDescription>Le groupe sera rattaché à cette promotion.</DialogDescription>
                    </DialogHeader>
                    <Input value={nomGroupe} onChange={(event) => setNomGroupe(event.target.value)} placeholder="Nom du groupe" />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogGroupeOpen(false)} disabled={saving}>
                        Annuler
                      </Button>
                      <Button onClick={handleCreateGroupe} disabled={!nomGroupe.trim() || saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Créer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="h-[430px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 border-b bg-slate-50">
                    <TableRow>
                      <TableHead>Groupe</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <LoadingRow colSpan={2} label="Chargement des groupes…" />
                    ) : groupes.length > 0 ? (
                      groupes.map((groupe) => (
                        <TableRow key={groupe.id}>
                          <TableCell className="font-medium text-slate-900">{groupe.nom}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button asChild size="sm" variant="outline" className="gap-2">
                                <Link href={`/promotions/${promotionId}/groupes/${groupe.id}`}>
                                  <Eye className="h-4 w-4" />
                                  Voir
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => openGroupeEdit(groupe)}>
                                <Pencil className="h-4 w-4" />
                                Modifier
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={2} label="Aucun groupe dans cette promotion." />
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un étudiant..." className="pl-10" />
                </div>
                <Dialog open={dialogEtudiantOpen} onOpenChange={setDialogEtudiantOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter un étudiant
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un étudiant</DialogTitle>
                      <DialogDescription>L&apos;étudiant sera créé et rattaché à cette promotion.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input value={prenomEtudiant} onChange={(event) => setPrenomEtudiant(event.target.value)} placeholder="Prénom" />
                      <Input value={nomEtudiant} onChange={(event) => setNomEtudiant(event.target.value)} placeholder="Nom" />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogEtudiantOpen(false)} disabled={saving}>
                        Annuler
                      </Button>
                      <Button onClick={handleCreateEtudiant} disabled={!nomEtudiant.trim() || !prenomEtudiant.trim() || saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Ajouter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="h-[430px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 border-b bg-slate-50">
                    <TableRow>
                      <TableHead>Étudiant</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <LoadingRow colSpan={2} label="Chargement des étudiants…" />
                    ) : filteredEtudiants.length > 0 ? (
                      filteredEtudiants.map((etudiant) => (
                        <TableRow key={etudiant.id}>
                          <TableCell className="font-medium text-slate-900">
                            {formatStudentName(etudiant.prenom, etudiant.nom)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="gap-2" disabled>
                                <Eye className="h-4 w-4" />
                                Voir à venir
                              </Button>
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => openEtudiantEdit(etudiant)}>
                                <Pencil className="h-4 w-4" />
                                Modifier
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                disabled={saving}
                                onClick={() => void handleRemoveStudent(etudiant)}
                              >
                                Retirer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={2} label="Aucun étudiant dans cette promotion." />
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingEtudiant !== null || editingGroupe !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEtudiant ? "Modifier l'étudiant" : "Modifier le groupe"}</DialogTitle>
            <DialogDescription>Le nom du groupe sera mis à jour.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {editingEtudiant ? (
              <Input value={editPrenom} onChange={(event) => setEditPrenom(event.target.value)} placeholder="Prénom" />
            ) : null}
            <Input value={editNom} onChange={(event) => setEditNom(event.target.value)} placeholder="Nom" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={!editNom.trim() || (editingEtudiant !== null && !editPrenom.trim()) || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <div className="h-4 w-4 text-slate-400">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function LoadingRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {label}
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-slate-500">
        {label}
      </TableCell>
    </TableRow>
  );
}
