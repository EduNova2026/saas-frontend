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
  getPromotion,
  getPromotionEtudiants,
  getPromotionGroupes,
  getPromotionMoyenne,
  removeEtudiantFromPromotion,
  updateEtudiant,
  updateGroupe,
  type EtudiantOut,
  type GroupeOut,
  type PromotionOut,
} from "@/lib/api/scolarite";

type Tab = "groupes" | "etudiants";

function getParamValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
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
  const [semestreGroupe, setSemestreGroupe] = useState(1);
  const [coeffGroupe, setCoeffGroupe] = useState(1);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingEtudiant, setEditingEtudiant] = useState<EtudiantOut | null>(null);
  const [editingGroupe, setEditingGroupe] = useState<GroupeOut | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editPrenom, setEditPrenom] = useState("");
  const [editSemestre, setEditSemestre] = useState(1);
  const [editCoefficient, setEditCoefficient] = useState(1);
  const [moyenneGenerale, setMoyenneGenerale] = useState<number | null>(null);
  const [selectedSemestre, setSelectedSemestre] = useState<"all" | 1 | 2>("all");
  const [tauxReussite, setTauxReussite] = useState<number | null>(null);

  const isAdminPedagogique = hasRole("admin_pedagogique");
  const canManagePromotions = isAdminPedagogique;

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

      let moyenneValue: number | null = null;
      if (selectedSemestre === "all") {
        const [m1, m2] = await Promise.all([
          getPromotionMoyenne(promotionId, 1),
          getPromotionMoyenne(promotionId, 2),
        ]);
        if (m1.moyenne !== null && m2.moyenne !== null) {
          moyenneValue = (m1.moyenne + m2.moyenne) / 2;
        } else {
          moyenneValue = m1.moyenne ?? m2.moyenne;
        }
      } else {
        const m = await getPromotionMoyenne(promotionId, selectedSemestre);
        moyenneValue = m.moyenne;
      }

      setPromotion(promotionData);
      setEtudiants(etudiantsData);
      setGroupes(groupesData);
      setMoyenneGenerale(moyenneValue);
      setTauxReussite(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger la promotion.");
    } finally {
      setLoading(false);
    }
  }, [promotionId, selectedSemestre]);

  useEffect(() => {
    if (!authLoading && canManagePromotions) {
      queueMicrotask(() => void loadPromotion());
    }
  }, [authLoading, canManagePromotions, loadPromotion, selectedSemestre]);

  const filteredEtudiants = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return etudiants;

    return etudiants.filter((etudiant) =>
      formatStudentName(etudiant.prenom, etudiant.nom).toLowerCase().includes(value)
    );
  }, [etudiants, search]);

  const filteredGroupes = useMemo(() => {
    if (selectedSemestre === "all") return groupes;
    return groupes.filter((g) => g.semestre === selectedSemestre);
  }, [groupes, selectedSemestre]);

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
      await createPromotionGroupe(promotionId, nomGroupe.trim(), semestreGroupe, coeffGroupe);
      setDialogGroupeOpen(false);
      setNomGroupe("");
      setSemestreGroupe(1);
      setCoeffGroupe(1);
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
    setEditSemestre(groupe.semestre);
    setEditCoefficient(groupe.coefficient);
    setActionError(null);
  };

  const closeEditDialog = () => {
    setEditingEtudiant(null);
    setEditingGroupe(null);
    setEditNom("");
    setEditPrenom("");
    setEditSemestre(1);
    setEditCoefficient(1);
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
          semestre: editSemestre,
          coefficient: editCoefficient,
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

      <div className="flex items-center gap-3">
        <label htmlFor="semestre-select" className="text-sm font-medium text-slate-600">Semestre :</label>
        <select
          id="semestre-select"
          value={selectedSemestre}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedSemestre(val === "all" ? "all" : Number(val) as 1 | 2);
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm"
        >
          <option value="all">Semestre 1 et 2</option>
          <option value={1}>Semestre 1</option>
          <option value={2}>Semestre 2</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Étudiants" value={loading ? "…" : String(etudiants.length)} icon={<Users />} />
        <StatCard title="Groupes" value={loading ? "…" : String(filteredGroupes.length)} icon={<GraduationCap />} />
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
                    <div className="space-y-2">
                      <label htmlFor="semestre-create" className="text-sm font-medium text-slate-700">Semestre</label>
                      <select
                        id="semestre-create"
                        value={semestreGroupe}
                        onChange={(event) => setSemestreGroupe(Number(event.target.value))}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        <option value={1}>Semestre 1</option>
                        <option value={2}>Semestre 2</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="coefficient-create" className="text-sm font-medium text-slate-700">Coefficient</label>
                      <Input
                        id="coefficient-create"
                        type="number"
                        min="0.01"
                        step="0.1"
                        value={coeffGroupe}
                        onChange={(event) => setCoeffGroupe(parseFloat(event.target.value) || 1)}
                      />
                    </div>
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
                       <TableHead>Semestre</TableHead>
                       <TableHead>Coef.</TableHead>
                       <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <LoadingRow colSpan={4} label="Chargement des groupes…" />
                    ) : filteredGroupes.length > 0 ? (
                      filteredGroupes.map((groupe) => (
                        <TableRow key={groupe.id}>
                          <TableCell className="font-medium text-slate-900">{groupe.nom}</TableCell>
                            <TableCell><span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{groupe.semestre}</span></TableCell>
                            <TableCell className="text-sm text-slate-600">{groupe.coefficient.toFixed(1)}</TableCell>
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
                      <EmptyRow colSpan={4} label="Aucun groupe dans cette promotion." />
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
            {editingGroupe ? (
              <div className="space-y-2">
                <label htmlFor="semestre-edit" className="text-sm font-medium text-slate-700">Semestre</label>
                <select
                  id="semestre-edit"
                  value={editSemestre}
                  onChange={(event) => setEditSemestre(Number(event.target.value))}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value={1}>Semestre 1</option>
                  <option value={2}>Semestre 2</option>
                </select>
              </div>
            ) : null}
            {editingGroupe ? (
              <div className="space-y-2">
                <label htmlFor="coefficient-edit" className="text-sm font-medium text-slate-700">Coefficient</label>
                <Input
                  id="coefficient-edit"
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={editCoefficient}
                  onChange={(event) => setEditCoefficient(parseFloat(event.target.value) || 1)}
                />
              </div>
            ) : null}
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
