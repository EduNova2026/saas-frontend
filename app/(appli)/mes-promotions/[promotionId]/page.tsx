"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, GraduationCap, Loader2, Pencil, Plus, Search, ShieldAlert, Users } from "lucide-react";
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
import { getUsers } from "@/lib/api/admin";
import {
  assignEnseignantToGroupe,
  createGroupe,
  getGroupeEnseignants,
  getPromotion,
  getPromotionEtudiants,
  getPromotionGroupes,
  getPromotionMoyenne,
  getResponsablePromotions,
  removeEtudiantFromPromotion,
  unassignEnseignantFromGroupe,
  updateGroupe,
  type EnseignantGroupeOut,
  type EtudiantOut,
  type GroupeOut,
  type PromotionOut,
} from "@/lib/api/scolarite";
import type { UtilisateurOut } from "@/types/admin";

type Tab = "groupes" | "etudiants";

function getParamValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatAverage(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}/20`;
}

function formatStudentName(prenom: string, nom: string): string {
  return `${nom.toUpperCase()} ${prenom.charAt(0).toUpperCase()}${prenom.slice(1).toLowerCase()}`;
}

export default function MesPromotionDetailPage() {
  const params = useParams<{ promotionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const promotionId = getParamValue(params.promotionId);
  const activeTab: Tab = searchParams.get("tab") === "etudiants" ? "etudiants" : "groupes";
  const { user, hasRole, loading: authLoading } = useAuth();

  const [promotion, setPromotion] = useState<PromotionOut | null>(null);
  const [groupes, setGroupes] = useState<GroupeOut[]>([]);
  const [etudiants, setEtudiants] = useState<EtudiantOut[]>([]);
  const [enseignantsByGroupe, setEnseignantsByGroupe] = useState<Record<string, EnseignantGroupeOut[]>>({});
  const [availableTeachers, setAvailableTeachers] = useState<UtilisateurOut[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogGroupeOpen, setDialogGroupeOpen] = useState(false);
  const [nomGroupe, setNomGroupe] = useState("");
  const [semestreGroupe, setSemestreGroupe] = useState(1);
  const [coeffGroupe, setCoeffGroupe] = useState(1);
  const [createGroupeTeacherId, setCreateGroupeTeacherId] = useState("");
  const [editingGroupe, setEditingGroupe] = useState<GroupeOut | null>(null);
  const [editNomGroupe, setEditNomGroupe] = useState("");
  const [editSemestre, setEditSemestre] = useState(1);
  const [editCoefficient, setEditCoefficient] = useState(1);
  const [isAssigned, setIsAssigned] = useState<boolean | null>(null);
  const [moyenneGenerale, setMoyenneGenerale] = useState<number | null>(null);
  const [selectedSemestre, setSelectedSemestre] = useState(1);

  const isAdminPedagogique = hasRole("admin_pedagogique");
  const canAccess = hasRole("responsable_pedagogique") || isAdminPedagogique;
  const userId = user?.id;

  const loadPromotion = useCallback(async () => {
    if (!promotionId || !userId) return;

    try {
      setLoading(true);
      setError(null);
      setActionError(null);

      const assignments = await getResponsablePromotions(userId);
      const assignedToPromotion = assignments.some((assignment) => assignment.promotion_id === promotionId);
      setIsAssigned(assignedToPromotion || isAdminPedagogique);

      if (!assignedToPromotion && !isAdminPedagogique) {
        setPromotion(null);
        setGroupes([]);
        setEtudiants([]);
        setEnseignantsByGroupe({});
        setMoyenneGenerale(null);
        return;
      }

      const [promotionData, groupesData, etudiantsData, teachersData] = await Promise.all([
        getPromotion(promotionId),
        getPromotionGroupes(promotionId),
        getPromotionEtudiants(promotionId),
        getUsers({ role: "enseignant", actif: true }),
      ]);

      const groupTeacherEntries = await Promise.all(
        groupesData.map(async (groupe) => [groupe.id, await getGroupeEnseignants(groupe.id)] as const)
      );
      const moyenne = await getPromotionMoyenne(promotionId, selectedSemestre);

      setPromotion(promotionData);
      setGroupes(groupesData);
      setEtudiants(etudiantsData);
      setAvailableTeachers(teachersData);
      setEnseignantsByGroupe(Object.fromEntries(groupTeacherEntries));
      setMoyenneGenerale(moyenne.moyenne);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger la promotion.");
    } finally {
      setLoading(false);
    }
  }, [isAdminPedagogique, promotionId, selectedSemestre, userId]);

  useEffect(() => {
    if (authLoading) return;

    if (!canAccess || !userId) {
      return;
    }

    queueMicrotask(() => void loadPromotion());
  }, [authLoading, canAccess, loadPromotion, selectedSemestre, userId]);

  const teachersById = useMemo(
    () => new Map(availableTeachers.map((teacher) => [teacher.id, teacher])),
    [availableTeachers]
  );

  const assignedTeacherCount = useMemo(() => {
    const ids = new Set<string>();
    Object.values(enseignantsByGroupe).forEach((assignments) => {
      assignments.forEach((assignment) => ids.add(assignment.enseignant_id));
    });
    return ids.size;
  }, [enseignantsByGroupe]);

  const filteredEtudiants = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return etudiants;

    return etudiants.filter((etudiant) =>
      formatStudentName(etudiant.prenom, etudiant.nom).toLowerCase().includes(value)
    );
  }, [etudiants, search]);

  const changeTab = (tab: Tab) => {
    router.replace(`/mes-promotions/${promotionId}?tab=${tab}`);
  };

  const handleCreateGroupe = async () => {
    if (!nomGroupe.trim()) return;
    setSaving(true);
    setActionError(null);

    try {
      const groupe = await createGroupe(promotionId, nomGroupe.trim(), semestreGroupe, coeffGroupe);
      if (createGroupeTeacherId) {
        await assignEnseignantToGroupe(groupe.id, createGroupeTeacherId);
      }
      setDialogGroupeOpen(false);
      setNomGroupe("");
      setSemestreGroupe(1);
      setCoeffGroupe(1);
      setCreateGroupeTeacherId("");
      await loadPromotion();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de créer le groupe.");
    } finally {
      setSaving(false);
    }
  };

  const openGroupeEdit = (groupe: GroupeOut) => {
    setEditingGroupe(groupe);
    setEditNomGroupe(groupe.nom);
    setEditSemestre(groupe.semestre);
    setEditCoefficient(groupe.coefficient);
    setActionError(null);
  };

  const closeGroupeEdit = () => {
    setEditingGroupe(null);
    setEditNomGroupe("");
    setEditSemestre(1);
    setEditCoefficient(1);
  };

  const handleUpdateGroupe = async () => {
    if (!editingGroupe || !editNomGroupe.trim()) return;
    setSaving(true);
    setActionError(null);

    try {
      await updateGroupe(editingGroupe.id, {
        nom: editNomGroupe.trim(),
        promotion_id: editingGroupe.promotion_id,
        semestre: editSemestre,
        coefficient: editCoefficient,
      });
      closeGroupeEdit();
      await loadPromotion();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de modifier le groupe.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (groupeId: string, enseignantId: string) => {
    if (!enseignantId) return;
    setSaving(true);
    setActionError(null);

    try {
      await assignEnseignantToGroupe(groupeId, enseignantId);
      await loadPromotion();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible d'ajouter l'enseignant.");
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceTeacher = async (
    groupeId: string,
    currentTeacherIds: string[],
    enseignantId: string
  ) => {
    if (!enseignantId) return;
    setSaving(true);
    setActionError(null);

    try {
      await Promise.all(
        currentTeacherIds.map((currentTeacherId) =>
          unassignEnseignantFromGroupe(groupeId, currentTeacherId)
        )
      );
      await assignEnseignantToGroupe(groupeId, enseignantId);
      await loadPromotion();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de remplacer l'enseignant.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (groupeId: string, enseignantId: string) => {
    setSaving(true);
    setActionError(null);

    try {
      await unassignEnseignantFromGroupe(groupeId, enseignantId);
      await loadPromotion();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de retirer l'enseignant.");
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

  if (!canAccess || isAssigned === false) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="mt-1 text-sm text-slate-600">
                Cette promotion n&apos;est pas assignée à votre compte responsable pédagogique.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/mes-promotions">Retour à mes promotions</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-10">
      <Button asChild variant="ghost" className="w-fit gap-2 px-0 text-slate-600">
        <Link href="/mes-promotions">
          <ArrowLeft className="h-4 w-4" />
          Mes promotions
        </Link>
      </Button>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">{promotion ? promotion.nom : "Promotion"}</h1>
        <p className="text-sm text-slate-500">{promotion ? promotion.annee_scolaire : "Groupes et étudiants assignés."}</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label htmlFor="semestre-select" className="text-sm font-medium text-slate-600">Semestre :</label>
        <select
          id="semestre-select"
          value={selectedSemestre}
          onChange={(e) => setSelectedSemestre(Number(e.target.value))}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm"
        >
          <option value={1}>Semestre 1</option>
          <option value={2}>Semestre 2</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Groupes" value={loading ? "…" : String(groupes.length)} icon={<GraduationCap />} />
        <StatCard title="Étudiants" value={loading ? "…" : String(etudiants.length)} icon={<Users />} />
        <StatCard title="Enseignants assignés" value={loading ? "…" : String(assignedTeacherCount)} icon={<Users />} />
        <StatCard title="Moyenne de la promotion" value={loading ? "…" : formatAverage(moyenneGenerale)} icon={<GraduationCap />} />
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
                    <label className="block text-sm font-medium text-slate-700">Enseignant</label>
                    <select
                      className="mb-4 mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-slate-300"
                      value={createGroupeTeacherId}
                      onChange={(event) => setCreateGroupeTeacherId(event.target.value)}
                    >
                      <option value="">Aucun enseignant</option>
                      {availableTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.prenom} {teacher.nom}
                        </option>
                      ))}
                    </select>
                    <label className="block text-sm font-medium text-slate-700">Semestre</label>
                    <select
                      className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-slate-300"
                      value={semestreGroupe}
                      onChange={(event) => setSemestreGroupe(Number(event.target.value))}
                    >
                      <option value={1}>Semestre 1</option>
                      <option value={2}>Semestre 2</option>
                    </select>
                    <label htmlFor="coefficient-create" className="block text-sm font-medium text-slate-700">Coefficient</label>
                    <Input
                      id="coefficient-create"
                      type="number"
                      min="0.01"
                      step="0.1"
                      value={coeffGroupe}
                      onChange={(event) => setCoeffGroupe(parseFloat(event.target.value) || 1)}
                    />
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

              <div className="space-y-3">
                {loading ? (
                  <Card>
                    <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des groupes…
                    </CardContent>
                  </Card>
                ) : groupes.length > 0 ? (
                  groupes.map((groupe) => {
                    const enseignants = enseignantsByGroupe[groupe.id] ?? [];
                    const assignedIds = new Set(enseignants.map((enseignant) => enseignant.enseignant_id));
                    const unassignedTeachers = availableTeachers.filter((teacher) => !assignedIds.has(teacher.id));
                    const teacherNames = enseignants.map((assignment) => {
                      const teacher = teachersById.get(assignment.enseignant_id);
                      return teacher ? `${teacher.prenom} ${teacher.nom}` : "Enseignant non trouvé";
                    });

                    return (
                      <Card key={groupe.id}>
                        <CardContent className="space-y-4 p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
<p className="font-medium text-slate-900">{groupe.nom}</p>
                                 <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">S{groupe.semestre}</span>
                                 <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Coef. {groupe.coefficient.toFixed(1)}</span>
                              </div>
                              <p className="text-sm text-slate-500">
                                Enseignants : {teacherNames.length > 0 ? teacherNames.join(", ") : "Aucun"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <select
                                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
                                disabled={saving || availableTeachers.length === 0}
                                onChange={(event) => {
                                  const selected = event.target.value;
                                  if (!selected) return;
                                  if (enseignants.length > 0) {
                                    void handleReplaceTeacher(
                                      groupe.id,
                                      enseignants.map((assignment) => assignment.enseignant_id),
                                      selected
                                    );
                                  } else {
                                    void handleAssign(groupe.id, selected);
                                  }
                                }}
                                value=""
                              >
                                <option value="">{enseignants.length > 0 ? "Changer d'enseignant..." : "Ajouter un enseignant..."}</option>
                                {availableTeachers.map((teacher) => (
                                  <option key={teacher.id} value={teacher.id}>
                                    {teacher.prenom} {teacher.nom}
                                  </option>
                                ))}
                              </select>
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => openGroupeEdit(groupe)}>
                                <Pencil className="h-4 w-4" />
                                Modifier
                              </Button>
                              <Button asChild size="sm" variant="outline" className="gap-2">
                                <Link href={`/mes-groupes/${groupe.id}?tab=eleves`}>
                                  <Eye className="h-4 w-4" />
                                  Voir
                                </Link>
                              </Button>
                            </div>
                          </div>

                          {enseignants.length > 0 ? (
                            <div className="flex flex-wrap gap-2 border-t pt-3">
                              {enseignants.map((assignment) => {
                                const teacher = teachersById.get(assignment.enseignant_id);
                                return (
                                  <div key={assignment.enseignant_id} className="flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-sm text-slate-700">
                                    <span>{teacher ? `${teacher.prenom} ${teacher.nom}` : "Enseignant non trouvé"}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                      disabled={saving}
                                      onClick={() => void handleUnassign(groupe.id, assignment.enseignant_id)}
                                    >
                                      Retirer
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-slate-500">
                      Aucun groupe dans cette promotion.
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un étudiant..." className="pl-10" />
              </div>
              <ScrollArea className="h-[430px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 border-b bg-slate-50">
                    <TableRow>
                      <TableHead>Étudiant</TableHead>
                      <TableHead>Promotion</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <LoadingRow colSpan={3} label="Chargement des étudiants…" />
                    ) : filteredEtudiants.length > 0 ? (
                      filteredEtudiants.map((etudiant) => (
                        <TableRow key={etudiant.id}>
                          <TableCell className="font-medium text-slate-900">{formatStudentName(etudiant.prenom, etudiant.nom)}</TableCell>
                          <TableCell className="text-sm text-slate-600">{promotion?.nom ?? "Promotion"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={saving}
                              onClick={() => void handleRemoveStudent(etudiant)}
                            >
                              Retirer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center text-sm text-slate-500">
                          Aucun étudiant dans cette promotion.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingGroupe !== null} onOpenChange={(open) => !open && closeGroupeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le groupe</DialogTitle>
            <DialogDescription>Le nom du groupe sera mis à jour.</DialogDescription>
          </DialogHeader>
          <Input value={editNomGroupe} onChange={(event) => setEditNomGroupe(event.target.value)} placeholder="Nom du groupe" />
          <label className="block text-sm font-medium text-slate-700">Semestre</label>
          <select
            className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-slate-300"
            value={editSemestre}
            onChange={(event) => setEditSemestre(Number(event.target.value))}
          >
            <option value={1}>Semestre 1</option>
            <option value={2}>Semestre 2</option>
          </select>
          <label htmlFor="coefficient-edit" className="block text-sm font-medium text-slate-700">Coefficient</label>
          <Input
            id="coefficient-edit"
            type="number"
            min="0.01"
            step="0.1"
            value={editCoefficient}
            onChange={(event) => setEditCoefficient(parseFloat(event.target.value) || 1)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeGroupeEdit} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleUpdateGroupe} disabled={!editNomGroupe.trim() || saving}>
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
