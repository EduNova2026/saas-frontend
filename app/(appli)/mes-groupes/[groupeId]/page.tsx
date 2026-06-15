"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, FileUp, Loader2, Search, ShieldAlert } from "lucide-react";
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
  createNote,
  deleteNote,
  getEnseignantGroupes,
  getExamens,
  getGroupe,
  getGroupeEtudiants,
  getNotes,
  getPromotions,
  updateNote,
} from "@/lib/api/scolarite";
import type { EtudiantOut, ExamenOut, GroupeOut, NoteOut } from "@/types/scolarite";

type Tab = "eleves" | "examens";

type StudentAverage = {
  average: number | null;
  absences: number;
};

function getParamValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatStudentName(prenom: string, nom: string): string {
  return `${nom.toUpperCase()} ${prenom.charAt(0).toUpperCase()}${prenom.slice(1).toLowerCase()}`;
}

function normalizeNote(note: NoteOut): number | null {
  if (note.absent || note.valeur === null || note.examen.note_max <= 0) return null;
  return (note.valeur / note.examen.note_max) * 20;
}

function formatAverage(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}/20`;
}

function formatImportStatus(job: ImportJobOut): string {
  if (job.statut) return `Import CSV ${job.statut.toLowerCase()}.`;
  return "Import CSV en cours...";
}

export default function MesGroupeDashboardPage() {
  const params = useParams<{ groupeId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupeId = getParamValue(params.groupeId);
  const activeTab: Tab = searchParams.get("tab") === "examens" ? "examens" : "eleves";
  const { hasRole, loading: authLoading, user } = useAuth();

  const [isAssigned, setIsAssigned] = useState(false);
  const [assignmentChecked, setAssignmentChecked] = useState(false);
  const [groupe, setGroupe] = useState<GroupeOut | null>(null);
  const [promotionName, setPromotionName] = useState("Promotion inconnue");
  const [etudiants, setEtudiants] = useState<EtudiantOut[]>([]);
  const [examens, setExamens] = useState<ExamenOut[]>([]);
  const [allNotes, setAllNotes] = useState<NoteOut[]>([]);
  const [notes, setNotes] = useState<NoteOut[]>([]);
  const [search, setSearch] = useState("");
  const [selectedExamen, setSelectedExamen] = useState<ExamenOut | null>(null);
  const [dialogCsvOpen, setDialogCsvOpen] = useState(false);
  const [noteEtudiantId, setNoteEtudiantId] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [noteAbsent, setNoteAbsent] = useState(false);
  const [noteMotif, setNoteMotif] = useState("");
  const [editingNote, setEditingNote] = useState<NoteOut | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [lastImportStatus, setLastImportStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const hasTeacherRole = hasRole("enseignant");
  const userId = user?.id;

  const loadData = useCallback(async () => {
    if (!userId || !groupeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setActionError(null);

      const assignments = await getEnseignantGroupes(userId);
      const assigned = assignments.some((assignment) => assignment.groupe_id === groupeId);
      setIsAssigned(assigned);
      setAssignmentChecked(true);

      if (!assigned) {
        setGroupe(null);
        setEtudiants([]);
        setExamens([]);
        setAllNotes([]);
        return;
      }

      const [groupeData, etudiantsData, promotions, examensData] = await Promise.all([
        getGroupe(groupeId),
        getGroupeEtudiants(groupeId),
        getPromotions(),
        getExamens(),
      ]);
      const notesData = (await Promise.all(examensData.map((examen) => getNotes({ examen_id: examen.id })))).flat();
      const promotion = promotions.find((item) => item.id === groupeData.promotion_id);

      setGroupe(groupeData);
      setPromotionName(promotion?.nom ?? "Promotion inconnue");
      setEtudiants(etudiantsData);
      setExamens(examensData);
      setAllNotes(notesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le groupe.");
      setAssignmentChecked(true);
    } finally {
      setLoading(false);
    }
  }, [groupeId, userId]);

  useEffect(() => {
    if (authLoading) return;
    if (!hasTeacherRole) return;

    queueMicrotask(() => void loadData());
  }, [authLoading, hasTeacherRole, loadData]);

  const filteredEtudiants = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return etudiants;

    return etudiants.filter((etudiant) =>
      formatStudentName(etudiant.prenom, etudiant.nom).toLowerCase().includes(value)
    );
  }, [etudiants, search]);

  const studentAverages = useMemo(() => {
    const result = new Map<string, StudentAverage>();

    for (const etudiant of etudiants) {
      const studentNotes = allNotes.filter((note) => note.etudiant_id === etudiant.id);
      const normalized = studentNotes
        .map(normalizeNote)
        .filter((value): value is number => value !== null);
      const absences = studentNotes.filter((note) => note.absent).length;

      result.set(etudiant.id, {
        average: normalized.length > 0 ? normalized.reduce((sum, value) => sum + value, 0) / normalized.length : null,
        absences,
      });
    }

    return result;
  }, [allNotes, etudiants]);

  const groupAverage = useMemo(() => {
    const normalized = allNotes.map(normalizeNote).filter((value): value is number => value !== null);
    if (normalized.length === 0) return null;
    return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
  }, [allNotes]);

  const absenceCount = useMemo(() => allNotes.filter((note) => note.absent).length, [allNotes]);

  const etudiantsSansNote = useMemo(() => {
    if (!selectedExamen) return etudiants;
    return etudiants.filter(
      (etudiant) =>
        !notes.some((note) => note.examen_id === selectedExamen.id && note.etudiant_id === etudiant.id) ||
        editingNote?.etudiant_id === etudiant.id
    );
  }, [editingNote, etudiants, notes, selectedExamen]);

  const changeTab = (tab: Tab) => {
    router.replace(`/mes-groupes/${groupeId}?tab=${tab}`);
  };

  const resetNoteForm = () => {
    setEditingNote(null);
    setNoteEtudiantId("");
    setNoteValue("");
    setNoteAbsent(false);
    setNoteMotif("");
  };

  const refreshAllNotes = async () => {
    const notesData = (await Promise.all(examens.map((examen) => getNotes({ examen_id: examen.id })))).flat();
    setAllNotes(notesData);
  };

  const loadNotesForExamen = async (examen: ExamenOut) => {
    setSelectedExamen(examen);
    setActionError(null);
    resetNoteForm();

    try {
      setLoadingNotes(true);
      setNotes(await getNotes({ examen_id: examen.id }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de charger les notes.");
    } finally {
      setLoadingNotes(false);
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
      await refreshAllNotes();
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
      await refreshAllNotes();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de supprimer la note.");
    } finally {
      setSaving(false);
    }
  };

  const openCsvDialog = (examen: ExamenOut) => {
    setSelectedExamen(examen);
    setDialogCsvOpen(true);
    setActionError(null);
    setUploadFile(null);
  };

  const handleUploadCsv = async () => {
    if (!uploadFile || !selectedExamen) {
      setActionError("Sélectionnez un examen et un fichier CSV.");
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      const job = await uploadNotesCsv({ examenId: selectedExamen.id, file: uploadFile });
      setLastImportStatus(formatImportStatus(job));
      setUploadFile(null);
      await loadNotesForExamen(selectedExamen);
      await refreshAllNotes();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible d'importer les notes.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (hasTeacherRole && !assignmentChecked)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  if (!hasTeacherRole || (hasTeacherRole && assignmentChecked && !isAssigned)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="mt-1 text-sm text-slate-600">
                Votre rôle ou votre affectation ne permet pas d&apos;accéder à ce groupe.
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
        <Link href="/mes-groupes">
          <ArrowLeft className="h-4 w-4" />
          Retour aux groupes
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{groupe ? groupe.nom : "Groupe"}</h1>
        <p className="text-sm text-slate-500">{promotionName}</p>
      </div>

      {error || actionError ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error ?? actionError}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Étudiants inscrits</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{loading ? "…" : etudiants.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Moyenne du groupe</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{loading ? "…" : formatAverage(groupAverage)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Absences</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{loading ? "…" : absenceCount}</p></CardContent>
        </Card>
      </div>

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
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un élève..." className="pl-10" />
              </div>

              <ScrollArea className="h-[500px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 border-b bg-slate-50">
                    <TableRow>
                      <TableHead>Élève</TableHead>
                      <TableHead>Moyenne</TableHead>
                      <TableHead>Absences</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <LoadingRow colSpan={3} label="Chargement des élèves…" />
                    ) : filteredEtudiants.length > 0 ? (
                      filteredEtudiants.map((etudiant) => {
                        const stats = studentAverages.get(etudiant.id);
                        return (
                          <TableRow key={etudiant.id}>
                            <TableCell className="font-medium text-slate-900">{formatStudentName(etudiant.prenom, etudiant.nom)}</TableCell>
                            <TableCell>{formatAverage(stats?.average ?? null)}</TableCell>
                            <TableCell>{stats?.absences ?? 0}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <EmptyRow colSpan={3} label="Aucun élève trouvé." />
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          ) : (
            <section className="space-y-4">
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
                    {loading ? (
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
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => openCsvDialog(examen)}>
                                <FileUp className="h-4 w-4" />
                                Importer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <EmptyRow colSpan={4} label="Aucun examen disponible." />
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogCsvOpen} onOpenChange={(open) => !open && setDialogCsvOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importer les notes CSV</DialogTitle>
            <DialogDescription>
              Importez un fichier CSV pour l'examen {selectedExamen?.nom}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="file" accept=".csv,text/csv" onChange={(event: ChangeEvent<HTMLInputElement>) => setUploadFile(event.target.files?.[0] ?? null)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogCsvOpen(false)} disabled={saving}>Annuler</Button>
              <Button onClick={handleUploadCsv} disabled={!uploadFile || saving || !selectedExamen}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Importer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedExamen !== null} onOpenChange={(open) => !open && setSelectedExamen(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Notes de {selectedExamen?.nom}</DialogTitle>
            <DialogDescription>Ajoutez les notes manuellement ou importez un CSV pour cet examen.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader><CardTitle className="text-base">Saisie manuelle</CardTitle></CardHeader>
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
                  {editingNote && selectedExamen ? <Button variant="outline" onClick={() => void loadNotesForExamen(selectedExamen)}>Annuler</Button> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Import CSV</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">Le fichier sera importé pour l&apos;examen sélectionné.</p>
                <Input type="file" accept=".csv,text/csv" onChange={(event: ChangeEvent<HTMLInputElement>) => setUploadFile(event.target.files?.[0] ?? null)} />
                <Button variant="outline" className="gap-2" onClick={handleUploadCsv} disabled={!uploadFile || saving || !selectedExamen}>
                  <FileUp className="h-4 w-4" />
                  Importer le CSV
                </Button>
                {lastImportStatus ? <p className="text-sm text-slate-600">{lastImportStatus}</p> : null}
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
                {loadingNotes ? (
                  <LoadingRow colSpan={4} label="Chargement des notes…" />
                ) : notes.length > 0 ? (
                  notes.map((note) => {
                    const etudiant = etudiants.find((item) => item.id === note.etudiant_id);
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
