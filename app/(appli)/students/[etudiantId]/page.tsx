"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Loader2,
  Pencil,
  ShieldAlert,
  Users,
  AlertTriangle,
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
  getEtudiant,
  getEtudiantGroupes,
  getNotes,
  updateEtudiant,
  type EtudiantOut,
  type GroupeOut,
} from "@/lib/api/scolarite";
import type { NoteOut } from "@/types/scolarite";

type RouteParams = {
  etudiantId?: string | string[];
};

function getParamValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getStatutRisque(moyenne: number | null, absences: number): string {
  if (moyenne === null) {
    return "Sans note";
  }

  if (absences > 0 || moyenne < 8) {
    return "Risque";
  }

  if (moyenne < 12) {
    return "À surveiller";
  }

  return "Satisfaisant";
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export default function StudentProfilePage() {
  const params = useParams() as RouteParams;
  const etudiantId = getParamValue(params.etudiantId);
  const { hasRole, loading: authLoading } = useAuth();
  const canAccessStudents =
    hasRole("responsable_pedagogique") ||
    hasRole("admin") ||
    hasRole("admin_pedagogique");

  const [etudiant, setEtudiant] = useState<EtudiantOut | null>(null);
  const [groupes, setGroupes] = useState<GroupeOut[]>([]);
  const [notes, setNotes] = useState<NoteOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");

  const loadStudent = useCallback(async () => {
    if (!etudiantId) return;

    try {
      setLoading(true);
      setError(null);
      const [etudiantData, etudiantGroupes, etudiantNotes] = await Promise.all([
        getEtudiant(etudiantId),
        getEtudiantGroupes(etudiantId),
        getNotes({ etudiant_id: etudiantId }),
      ]);

      setEtudiant(etudiantData);
      setGroupes(etudiantGroupes);
      setNotes(etudiantNotes);
      setNom(etudiantData.nom);
      setPrenom(etudiantData.prenom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le profil étudiant.");
    } finally {
      setLoading(false);
    }
  }, [etudiantId]);

  useEffect(() => {
    if (authLoading || !canAccessStudents) {
      return;
    }

    queueMicrotask(() => void loadStudent());
  }, [authLoading, canAccessStudents, loadStudent]);

  const notesValides = useMemo(
    () => notes.filter((note) => note.valeur !== null),
    [notes]
  );

  const moyenne = useMemo(() => {
    if (notesValides.length === 0) return null;
    return (
      notesValides.reduce((sum, note) => sum + (note.valeur ?? 0), 0) /
      notesValides.length
    );
  }, [notesValides]);

  const absences = useMemo(
    () => notes.filter((note) => note.absent).length,
    [notes]
  );

  const statutRisque = getStatutRisque(moyenne, absences);

  const handleUpdateStudent = async () => {
    if (!etudiant) return;
    setSaving(true);
    setActionError(null);

    try {
      await updateEtudiant(etudiant.id, {
        nom: nom.trim(),
        prenom: prenom.trim(),
      });
      setEditOpen(false);
      await loadStudent();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de modifier l'étudiant.");
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

  if (!canAccessStudents) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="mt-1 text-sm text-slate-600">
                Votre rôle ne permet pas d&apos;accéder au profil étudiant.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/students">Retour aux étudiants</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-10">
      <Button asChild variant="ghost" className="w-fit gap-2 px-0 text-slate-600">
        <Link href="/students">
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "Profil étudiant"}
          </h1>
          <p className="text-sm text-slate-500">
            Fiche détaillée, notes et groupe(s) affecté(s).
          </p>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Modifier l'étudiant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'étudiant</DialogTitle>
              <DialogDescription>
                Mettez à jour le prénom et le nom de l'étudiant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="student-prenom" className="text-sm font-medium text-slate-700">
                  Prénom
                </label>
                <Input
                  id="student-prenom"
                  value={prenom}
                  onChange={(event) => setPrenom(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="student-nom" className="text-sm font-medium text-slate-700">
                  Nom
                </label>
                <Input
                  id="student-nom"
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                />
              </div>
              {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleUpdateStudent} disabled={saving || !nom.trim() || !prenom.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Moyenne générale</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">
                  {loading ? "…" : moyenne === null ? "N/A" : moyenne.toFixed(2)}
                </p>
                <p className="text-sm text-slate-500">Basée sur les notes saisies</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Notes saisies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{loading ? "…" : notes.length}</p>
                <p className="text-sm text-slate-500">Total des enregistrements</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Statut</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {loading ? "…" : statutRisque}
                </span>
                <p className="text-sm text-slate-500 mt-2">Indicateur de risque simple</p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle>Notes et évaluations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[420px] w-full">
                <Table>
                  <TableHeader className="bg-slate-50 border-b sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Évaluation</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Absence</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-sm text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement des notes…
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : notes.length > 0 ? (
                      notes.map((note) => (
                        <TableRow key={note.id} className="border-b last:border-0">
                          <TableCell>{note.examen.nom}</TableCell>
                          <TableCell>
                            {note.absent ? "—" : note.valeur?.toFixed(2) ?? "N/A"}
                          </TableCell>
                          <TableCell>{note.absent ? "Oui" : "Non"}</TableCell>
                          <TableCell>{note.motif_absence ?? "—"}</TableCell>
                          <TableCell>{formatDate(note.date_saisie)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-sm text-slate-500">
                          Aucune note disponible pour cet étudiant.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Promotion</p>
                <p className="mt-1 font-semibold text-slate-900">{etudiant?.promotion_id ?? "N/A"}</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Identifiant interne</p>
                <p className="mt-1 font-mono text-sm text-slate-700 break-all">{etudiant?.id ?? "N/A"}</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Utilisateur lié</p>
                <p className="mt-1 font-semibold text-slate-900">{etudiant?.utilisateur_id ?? "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle>Groupes</CardTitle>
            </CardHeader>
            <CardContent>
              {groupes.length > 0 ? (
                <div className="space-y-2">
                  {groupes.map((groupe) => (
                    <div
                      key={groupe.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <Link
                        href={`/promotions/${etudiant?.promotion_id ?? ""}/groupes/${groupe.id}`}
                        className="text-sm font-semibold text-slate-900"
                      >
                        {groupe.nom}
                      </Link>
                      <p className="text-xs text-slate-500">ID : {groupe.id}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Aucun groupe associé pour le moment.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
