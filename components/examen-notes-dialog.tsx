"use client";

import { ChangeEvent } from "react";
import { FileUp, Loader2, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ImportCsvResult } from "@/components/import-csv-result";
import type { ImportJobOut } from "@/lib/api/imports";
import type { EtudiantOut, ExamenOut, NoteOut } from "@/types/scolarite";

export interface StudentSearchConfig {
  query: string;
  results: EtudiantOut[];
  loading: boolean;
  onSearchChange: (value: string) => void;
  onAddStudent: (etudiantId: string) => void;
  assigningId: string | null;
}

interface ExamenNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examen: ExamenOut | null;
  actionError: string | null;

  // Note form
  noteEtudiantId: string;
  noteValue: string;
  noteAbsent: boolean;
  noteMotif: string;
  editingNote: NoteOut | null;
  etudiantsSansNote: EtudiantOut[];
  onNoteEtudiantIdChange: (value: string) => void;
  onNoteValueChange: (value: string) => void;
  onNoteAbsentChange: (value: boolean) => void;
  onNoteMotifChange: (value: string) => void;
  onSaveNote: () => void;
  onCancelEditNote: () => void;
  saving: boolean;

  // CSV import
  uploadFile: File | null;
  onUploadFileChange: (file: File | null) => void;
  onUploadCsv: () => void;
  lastImportJob: ImportJobOut | null;

  // Notes table
  notes: NoteOut[];
  allStudents: EtudiantOut[];
  loadingNotes: boolean;
  onEditNote: (note: NoteOut) => void;
  onDeleteNote: (note: NoteOut) => void;
  formatStudentName: (prenom: string, nom: string) => string;

  // Optional student search (promotions page only)
  studentSearch?: StudentSearchConfig;
}

export function ExamenNotesDialog({
  open,
  onOpenChange,
  examen,
  actionError,
  noteEtudiantId,
  noteValue,
  noteAbsent,
  noteMotif,
  editingNote,
  etudiantsSansNote,
  onNoteEtudiantIdChange,
  onNoteValueChange,
  onNoteAbsentChange,
  onNoteMotifChange,
  onSaveNote,
  onCancelEditNote,
  saving,
  uploadFile,
  onUploadFileChange,
  onUploadCsv,
  lastImportJob,
  notes,
  allStudents,
  loadingNotes,
  onEditNote,
  onDeleteNote,
  formatStudentName,
  studentSearch,
}: ExamenNotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl h-[65vh] max-h-[65vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Notes de {examen?.nom}</DialogTitle>
          <DialogDescription>
            Recherchez un élève, saisissez une note, ou importez un CSV.
          </DialogDescription>
        </DialogHeader>

        {actionError ? (
          <p className="text-sm text-red-600 shrink-0">{actionError}</p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Manual entry card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Saisie manuelle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={editingNote ? editingNote.etudiant_id : noteEtudiantId}
                onChange={(event) => onNoteEtudiantIdChange(event.target.value)}
                disabled={editingNote !== null || etudiantsSansNote.length === 0}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50"
              >
                <option value="">Sélectionner un élève</option>
                {etudiantsSansNote.map((etudiant) => (
                  <option key={etudiant.id} value={etudiant.id}>
                    {formatStudentName(etudiant.prenom, etudiant.nom)}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min="0"
                max={examen?.note_max ?? 20}
                step="0.1"
                value={noteValue}
                onChange={(event) => onNoteValueChange(event.target.value)}
                placeholder="Valeur"
                disabled={noteAbsent}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={noteAbsent}
                  onChange={(event) => onNoteAbsentChange(event.target.checked)}
                />
                Élève absent
              </label>
              <Input
                value={noteMotif}
                onChange={(event) => onNoteMotifChange(event.target.value)}
                placeholder="Motif d'absence optionnel"
              />
              <div className="flex gap-2">
                <Button
                  onClick={onSaveNote}
                  disabled={saving || (!editingNote && !noteEtudiantId)}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingNote ? "Modifier" : "Ajouter"}
                </Button>
                {editingNote ? (
                  <Button variant="outline" onClick={onCancelEditNote}>
                    Annuler
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Student search card (promotions page only) */}
          {studentSearch ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ajouter un élève</CardTitle>
                <CardDescription>
                  Recherchez un élève de la promotion pour l&apos;ajouter au groupe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nom ou prénom..."
                    value={studentSearch.query}
                    onChange={(e) => studentSearch.onSearchChange(e.target.value)}
                    className="h-9"
                  />
                </div>
                {studentSearch.loading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                ) : studentSearch.results.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {studentSearch.results.map((etudiant) => (
                      <div
                        key={etudiant.id}
                        className="flex items-center justify-between p-2 bg-white rounded-md border text-xs"
                      >
                        <span className="font-medium text-slate-800 truncate">
                          {formatStudentName(etudiant.prenom, etudiant.nom)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => studentSearch.onAddStudent(etudiant.id)}
                          disabled={studentSearch.assigningId === etudiant.id}
                        >
                          {studentSearch.assigningId === etudiant.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserPlus className="h-3 w-3" />
                          )}
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : studentSearch.query.trim() ? (
                  <p className="text-xs text-slate-400 py-2 text-center">
                    Aucun élève trouvé.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* CSV import card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onUploadFileChange(event.target.files?.[0] ?? null)
                }
              />
              <Button
                variant="outline"
                className="gap-2"
                onClick={onUploadCsv}
                disabled={!uploadFile || saving}
              >
                <FileUp className="h-4 w-4" />
                Importer le CSV
              </Button>
              {lastImportJob ? <ImportCsvResult job={lastImportJob} /> : null}
            </CardContent>
          </Card>

          {/* Notes table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Notes enregistrées
            </h3>
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
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-400">
                        <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                        Chargement des notes…
                      </TableCell>
                    </TableRow>
                  ) : notes.length > 0 ? (
                    notes.map((note) => {
                      const etudiant = allStudents.find(
                        (item) => item.id === note.etudiant_id,
                      );
                      return (
                        <TableRow key={note.id}>
                          <TableCell className="font-medium text-slate-900">
                            {etudiant
                              ? formatStudentName(etudiant.prenom, etudiant.nom)
                              : "Étudiant inconnu"}
                          </TableCell>
                          <TableCell>
                            {note.absent
                              ? "Absent"
                              : `${note.valeur}/${note.examen.note_max}`}
                          </TableCell>
                          <TableCell>{note.motif_absence ?? "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEditNote(note)}
                              >
                                Modifier
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => onDeleteNote(note)}
                              >
                                Supprimer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-slate-400"
                      >
                        Aucune note pour cet examen.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
