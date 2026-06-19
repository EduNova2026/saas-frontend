"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
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
import { uploadNotesCsv, type ImportJobOut } from "@/lib/api/imports";
import {
  assignEtudiantToGroupe,
  assignEnseignantToGroupe,
  createExamen,
  createNote,
  deleteNote,
  getExamens,
  getGroupe,
  getGroupeEnseignants,
  getGroupeEtudiants,
  getNotes,
  getPromotionEtudiants,
  unassignEtudiantFromGroupe,
  unassignEnseignantFromGroupe,
  updateNote,
  type EtudiantOut,
  type EnseignantGroupeOut,
  type GroupeOut,
} from "@/lib/api/scolarite";
import { getUsers } from "@/lib/api/admin";
import type { ExamenOut, NoteOut } from "@/types/scolarite";
import type { UtilisateurOut } from "@/types/admin";

type Tab = "eleves" | "examens";

function getParamValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatStudentName(prenom: string, nom: string): string {
  return `${nom.toUpperCase()} ${prenom.charAt(0).toUpperCase()}${prenom.slice(1).toLowerCase()}`;
}

export default function GroupeManagementPage() {
  const params = useParams<{ promotionId: string; groupeId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const promotionId = getParamValue(params.promotionId);
  const groupeId = getParamValue(params.groupeId);
  const activeTab: Tab = searchParams.get("tab") === "examens" ? "examens" : "eleves";
  const { hasRole, loading: authLoading } = useAuth();

  const [groupe, setGroupe] = useState<GroupeOut | null>(null);
  const [etudiantsGroupe, setEtudiantsGroupe] = useState<EtudiantOut[]>([]);
  const [etudiantsPromotion, setEtudiantsPromotion] = useState<EtudiantOut[]>([]);
  const [examens, setExamens] = useState<ExamenOut[]>([]);
  const [notes, setNotes] = useState<NoteOut[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEtudiantId, setSelectedEtudiantId] = useState("");
  const [dialogAddStudentOpen, setDialogAddStudentOpen] = useState(false);
  const [dialogExamenOpen, setDialogExamenOpen] = useState(false);
  const [selectedExamen, setSelectedExamen] = useState<ExamenOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingExamens, setLoadingExamens] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [examNom, setExamNom] = useState("");
  const [examType, setExamType] = useState("examen");
  const [examCoefficient, setExamCoefficient] = useState("1");
  const [examNoteMax, setExamNoteMax] = useState("20");
  const [examDate, setExamDate] = useState("");
  const [examCode, setExamCode] = useState("");
  const [noteEtudiantId, setNoteEtudiantId] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [noteAbsent, setNoteAbsent] = useState(false);
  const [noteMotif, setNoteMotif] = useState("");
  const [editingNote, setEditingNote] = useState<NoteOut | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [lastImportJob, setLastImportJob] = useState<ImportJobOut | null>(null);
  const [teachers, setTeachers] = useState<UtilisateurOut[]>([]);
  const [groupTeachers, setGroupTeachers] = useState<EnseignantGroupeOut[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const isAdminPedagogique = hasRole("admin_pedagogique");
  const canManagePromotions = isAdminPedagogique;

  const loadGroupe = useCallback(async () => {
    if (!promotionId || !groupeId) return;

    try {
      setLoading(true);
      setError(null);
      const [groupeData, groupeEtudiantsData, promotionEtudiantsData, teachersData, groupTeachersData] = await Promise.all([
        getGroupe(groupeId),
        getGroupeEtudiants(groupeId),
        getPromotionEtudiants(promotionId),
        getUsers({ role: "enseignant", actif: true }),
        getGroupeEnseignants(groupeId),
      ]);
      setGroupe(groupeData);
      setEtudiantsGroupe(groupeEtudiantsData);
      setEtudiantsPromotion(promotionEtudiantsData);
      setTeachers(teachersData);
      setGroupTeachers(groupTeachersData);
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

  const loadExamens = useCallback(async () => {
    if (!groupeId) {
      setExamens([]);
      return;
    }

    try {
      setLoadingExamens(true);
      setActionError(null);
      setExamens(await getExamens({ enseignement_id: groupeId }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de charger les examens.");
    } finally {
      setLoadingExamens(false);
    }
  }, [groupeId]);

  useEffect(() => {
    if (authLoading || !canManagePromotions) {
      return;
    }

    queueMicrotask(() => void loadGroupe());
  }, [authLoading, canManagePromotions, loadGroupe]);

  useEffect(() => {
    if (activeTab === "examens") {
      queueMicrotask(() => void loadExamens());
    }
  }, [activeTab, loadExamens]);

  const filteredEtudiants = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return etudiantsGroupe;

    return etudiantsGroupe.filter((etudiant) =>
      formatStudentName(etudiant.prenom, etudiant.nom).toLowerCase().includes(value)
    );
  }, [etudiantsGroupe, search]);

  const etudiantsDisponibles = useMemo(
    () => etudiantsPromotion.filter((etudiant) => !etudiantsGroupe.some((item) => item.id === etudiant.id)),
    [etudiantsGroupe, etudiantsPromotion]
  );

  const etudiantsSansNote = useMemo(() => {
    if (!selectedExamen) return etudiantsGroupe;
    return etudiantsGroupe.filter(
      (etudiant) =>
        !notes.some((note) => note.examen_id === selectedExamen.id && note.etudiant_id === etudiant.id) ||
        editingNote?.etudiant_id === etudiant.id
    );
  }, [editingNote, etudiantsGroupe, notes, selectedExamen]);

  const changeTab = (tab: Tab) => {
    router.replace(`/promotions/${promotionId}/groupes/${groupeId}?tab=${tab}`);
  };

  const loadNotesForExamen = async (examen: ExamenOut) => {
    setSelectedExamen(examen);
    setActionError(null);
    setEditingNote(null);
    setNoteEtudiantId("");
    setNoteValue("");
    setNoteAbsent(false);
    setNoteMotif("");

    try {
      setNotes(await getNotes({ examen_id: examen.id }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de charger les notes.");
    }
  };

  const handleAssignEtudiant = async () => {
    if (!selectedEtudiantId) {
      setActionError("Sélectionnez un étudiant à ajouter.");
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      await assignEtudiantToGroupe(selectedEtudiantId, groupeId);
      setDialogAddStudentOpen(false);
      await loadGroupe();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur lors de l'ajout de l'étudiant.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignEtudiant = async (etudiant: EtudiantOut) => {
    if (!window.confirm(`Retirer ${formatStudentName(etudiant.prenom, etudiant.nom)} du groupe ?`)) return;
    setSaving(true);
    setActionError(null);

    try {
      await unassignEtudiantFromGroupe(etudiant.id, groupeId);
      await loadGroupe();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur lors du retrait de l'étudiant.");
    } finally {
      setSaving(false);
    }
  };

  const currentTeacherIds = useMemo(
    () => groupTeachers.map((assignment) => assignment.enseignant_id),
    [groupTeachers]
  );

  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) {
      setActionError("Sélectionnez un enseignant.");
      return;
    }

    setSaving(true);
    setActionError(null);

  try {
      await assignEnseignantToGroupe(groupeId, selectedTeacherId);
      setSelectedTeacherId("");
      await loadGroupe();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible d'assigner l'enseignant.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignTeacher = async (enseignantId: string) => {
    setSaving(true);
    setActionError(null);

    try {
      await unassignEnseignantFromGroupe(groupeId, enseignantId);
      await loadGroupe();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de retirer l'enseignant.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExamen = async () => {
    const coefficient = Number(examCoefficient);
    const noteMax = Number(examNoteMax);

    if (!groupeId || !examNom.trim() || coefficient <= 0 || noteMax <= 0) {
      setActionError("Renseignez un nom, un coefficient et une note maximale valides.");
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      await createExamen({
        enseignement_id: groupeId,
        nom: examNom.trim(),
        type: examType.trim() || "examen",
        coefficient,
        note_max: noteMax,
        date_examen: examDate || null,
        code_aurion: examCode.trim() || null,
      });
      setDialogExamenOpen(false);
      setExamNom("");
      setExamType("examen");
      setExamCoefficient("1");
      setExamNoteMax("20");
      setExamDate("");
      setExamCode("");
      await loadExamens();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de créer l'examen.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedExamen) return;
    const numericValue = Number(noteValue);
    const value = noteAbsent ? null : numericValue;

    if (!noteAbsent && (noteValue.trim() === "" || Number.isNaN(numericValue) || numericValue < 0 || numericValue > selectedExamen.note_max)) {
      setActionError(`La note doit être comprise entre 0 et ${selectedExamen.note_max}.`);
      return;
    }

    const etudiantId = editingNote?.etudiant_id ?? noteEtudiantId;
    if (!etudiantId) {
      setActionError("Sélectionnez un étudiant.");
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          valeur: value,
          absent: noteAbsent,
          motif_absence: noteMotif.trim() || null,
        });
      } else {
        await createNote({
          examen_id: selectedExamen.id,
          etudiant_id: etudiantId,
          valeur: value,
          absent: noteAbsent,
          motif_absence: noteMotif.trim() || null,
        });
      }
      await loadNotesForExamen(selectedExamen);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible d'enregistrer la note.");
    } finally {
      setSaving(false);
    }
  };

  const openEditNote = (note: NoteOut) => {
    setEditingNote(note);
    setNoteEtudiantId(note.etudiant_id);
    setNoteValue(note.valeur === null ? "" : String(note.valeur));
    setNoteAbsent(note.absent);
    setNoteMotif(note.motif_absence ?? "");
  };

  const handleDeleteNote = async (note: NoteOut) => {
    if (!selectedExamen || !window.confirm("Supprimer cette note ?")) return;
    setSaving(true);
    setActionError(null);

    try {
      await deleteNote(note.id);
      await loadNotesForExamen(selectedExamen);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de supprimer la note.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCsv = async () => {
    if (!uploadFile || !groupeId || !selectedExamen) {
      setActionError("Sélectionnez un fichier CSV.");
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      setLastImportJob(await uploadNotesCsv({ examenId: selectedExamen.id, file: uploadFile }));
      setUploadFile(null);
      await loadNotesForExamen(selectedExamen);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible d'importer les notes.");
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
              <p className="mt-1 text-sm text-slate-600">Votre rôle ne permet pas d&apos;accéder à la gestion de ce groupe.</p>
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
        <Link href={`/promotions/${promotionId}`}>
          <ArrowLeft className="h-4 w-4" />
          Retour à la promotion
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {groupe ? groupe.nom : "Groupe"}{" "}
            {groupe ? <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 align-middle">S{groupe.semestre}</span> : null}
          </h1>
          <p className="text-sm text-slate-500">Élèves, examens et notes du groupe.</p>
        </div>
        <Card className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Élèves</p>
              <p className="font-bold text-slate-900">{loading ? "…" : etudiantsGroupe.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-700">Enseignant du groupe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {groupTeachers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {groupTeachers.map((assignment) => {
                const teacher = teachers.find((teacher) => teacher.id === assignment.enseignant_id);
                return (
                  <div key={assignment.enseignant_id} className="flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-sm text-slate-700">
                    <span>{teacher ? `${teacher.prenom} ${teacher.nom}` : assignment.enseignant_id}</span>
                    <Button size="xs" variant="ghost" className="text-red-600 hover:text-red-700" disabled={saving} onClick={() => void handleUnassignTeacher(assignment.enseignant_id)}>
                      Retirer
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucun enseignant assigné.</p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedTeacherId}
              onChange={(event) => setSelectedTeacherId(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <option value="">Sélectionner un enseignant</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.prenom} {teacher.nom}
                </option>
              ))}
            </select>
            <Button onClick={handleAssignTeacher} disabled={!selectedTeacherId || saving || teachers.length === 0}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {error || actionError ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error ?? actionError}</CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader className="border-b pb-0">
          <div className="flex gap-2">
            <Button variant={activeTab === "eleves" ? "default" : "ghost"} onClick={() => changeTab("eleves")}>
              Élèves
            </Button>
            <Button variant={activeTab === "examens" ? "default" : "ghost"} onClick={() => changeTab("examens")}>
              Examens
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {activeTab === "eleves" ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un élève..." className="pl-10" />
                </div>
                <Dialog open={dialogAddStudentOpen} onOpenChange={setDialogAddStudentOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter un élève
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un élève au groupe</DialogTitle>
                      <DialogDescription>Sélectionnez un élève de la promotion qui n&apos;est pas déjà dans le groupe.</DialogDescription>
                    </DialogHeader>
                    <select
                      value={selectedEtudiantId}
                      onChange={(event) => setSelectedEtudiantId(event.target.value)}
                      disabled={etudiantsDisponibles.length === 0}
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50"
                    >
                      {etudiantsDisponibles.length > 0 ? (
                        etudiantsDisponibles.map((etudiant) => (
                          <option key={etudiant.id} value={etudiant.id}>{formatStudentName(etudiant.prenom, etudiant.nom)}</option>
                        ))
                      ) : (
                        <option>Aucun élève disponible</option>
                      )}
                    </select>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogAddStudentOpen(false)} disabled={saving}>Annuler</Button>
                      <Button onClick={handleAssignEtudiant} disabled={!selectedEtudiantId || saving || etudiantsDisponibles.length === 0}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Ajouter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[500px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 border-b bg-slate-50">
                    <TableRow>
                      <TableHead>Élève</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <LoadingRow colSpan={2} label="Chargement des élèves…" />
                    ) : filteredEtudiants.length > 0 ? (
                      filteredEtudiants.map((etudiant) => (
                        <TableRow key={etudiant.id}>
                          <TableCell className="font-medium text-slate-900">{formatStudentName(etudiant.prenom, etudiant.nom)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="gap-2" disabled>
                                <Eye className="h-4 w-4" />
                                Voir à venir
                              </Button>
                              <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={() => void handleUnassignEtudiant(etudiant)} disabled={saving}>
                                <Trash2 className="h-4 w-4" />
                                Retirer du groupe
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={2} label="Aucun élève trouvé." />
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          ) : (
            <section className="space-y-4">
              <Card className="border-blue-100 bg-blue-50/50">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => void loadExamens()} disabled={!groupeId || loadingExamens}>
                      {loadingExamens ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Charger
                    </Button>
                    <Dialog open={dialogExamenOpen} onOpenChange={setDialogExamenOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2" disabled={!groupeId}>
                          <Plus className="h-4 w-4" />
                          Créer un examen
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input value={examNom} onChange={(event) => setExamNom(event.target.value)} placeholder="Nom" />
                          <Input value={examType} onChange={(event) => setExamType(event.target.value)} placeholder="Type" />
                          <Input type="number" min="0" step="0.1" value={examCoefficient} onChange={(event) => setExamCoefficient(event.target.value)} placeholder="Coefficient" />
                          <Input type="number" min="1" step="0.1" value={examNoteMax} onChange={(event) => setExamNoteMax(event.target.value)} placeholder="Note max" />
                          <Input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
                          <Input value={examCode} onChange={(event) => setExamCode(event.target.value)} placeholder="Code Aurion optionnel" />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDialogExamenOpen(false)} disabled={saving}>Annuler</Button>
                          <Button onClick={handleCreateExamen} disabled={!examNom.trim() || saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Créer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              <ScrollArea className="h-[500px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 border-b bg-slate-50">
                    <TableRow>
                      <TableHead>Examen</TableHead>
                      <TableHead>Barème</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingExamens ? (
                      <LoadingRow colSpan={4} label="Chargement des examens…" />
                    ) : examens.length > 0 ? (
                      examens.map((examen) => (
                        <TableRow key={examen.id}>
                          <TableCell>
                            <div className="font-medium text-slate-900">{examen.nom}</div>
                            <div className="text-xs text-slate-500">{examen.type}</div>
                          </TableCell>
                          <TableCell>{examen.note_max} pts · coef. {examen.coefficient}</TableCell>
                          <TableCell>{examen.date_examen ?? "Non renseignée"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => void loadNotesForExamen(examen)}>
                                <ClipboardList className="h-4 w-4" />
                                Notes
                              </Button>
                              <Button size="sm" variant="outline" className="gap-2" disabled>
                                <Pencil className="h-4 w-4" />
                                Modifier à venir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={4} label="Aucun examen pour ce groupe." />
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedExamen !== null} onOpenChange={(open) => !open && setSelectedExamen(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Notes de {selectedExamen?.nom}</DialogTitle>
            <DialogDescription>Ajoutez les notes manuellement ou importez un CSV via le service d&apos;import.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Saisie manuelle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={editingNote ? editingNote.etudiant_id : noteEtudiantId}
                  onChange={(event) => setNoteEtudiantId(event.target.value)}
                  disabled={editingNote !== null || etudiantsSansNote.length === 0}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50"
                >
                  <option value="">Sélectionner un élève</option>
                  {etudiantsSansNote.map((etudiant) => (
                    <option key={etudiant.id} value={etudiant.id}>{formatStudentName(etudiant.prenom, etudiant.nom)}</option>
                  ))}
                </select>
                <Input type="number" min="0" max={selectedExamen?.note_max ?? 20} step="0.1" value={noteValue} onChange={(event) => setNoteValue(event.target.value)} placeholder="Valeur" disabled={noteAbsent} />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={noteAbsent} onChange={(event) => setNoteAbsent(event.target.checked)} />
                  Élève absent
                </label>
                <Input value={noteMotif} onChange={(event) => setNoteMotif(event.target.value)} placeholder="Motif d'absence optionnel" />
                <div className="flex gap-2">
                  <Button onClick={handleSaveNote} disabled={saving || (!editingNote && !noteEtudiantId)}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingNote ? "Modifier" : "Ajouter"}
                  </Button>
                  {editingNote ? <Button variant="outline" onClick={() => void loadNotesForExamen(selectedExamen as ExamenOut)}>Annuler</Button> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import CSV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input type="file" accept=".csv,text/csv" onChange={(event: ChangeEvent<HTMLInputElement>) => setUploadFile(event.target.files?.[0] ?? null)} />
                <Button variant="outline" className="gap-2" onClick={handleUploadCsv} disabled={!uploadFile || saving || !groupeId}>
                  <FileUp className="h-4 w-4" />
                  Importer le CSV
                </Button>
                {lastImportJob ? <p className="text-sm text-slate-600">Import CSV lancé</p> : null}
              </CardContent>
            </Card>
          </div>

          <ScrollArea className="h-72 rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 border-b bg-slate-50">
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.length > 0 ? (
                  notes.map((note) => {
                    const etudiant = etudiantsGroupe.find((item) => item.id === note.etudiant_id);
                    return (
                      <TableRow key={note.id}>
                        <TableCell className="font-medium text-slate-900">{etudiant ? formatStudentName(etudiant.prenom, etudiant.nom) : "Étudiant inconnu"}</TableCell>
                        <TableCell>{note.absent ? "Absent" : `${note.valeur}/${note.examen.note_max}`}</TableCell>
                        <TableCell>{note.motif_absence ?? "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditNote(note)}>Modifier</Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => void handleDeleteNote(note)}>Supprimer</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <EmptyRow colSpan={4} label="Aucune note pour cet examen." />
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </main>
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
