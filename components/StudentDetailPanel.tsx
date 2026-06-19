"use client";

import { FileDown, Mail, ListTodo, AlertCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { EtudiantExport } from "@/types/scolarite";
import { useMemo } from "react";

interface StudentDetailPanelProps {
  data: EtudiantExport | null;
  loading: boolean;
  onExport?: () => void;
}

function formatAverage(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}/20`;
}

function formatEmailPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "");
}

function computeGlobalAverage(groupes: EtudiantExport["groupes"]): number | null {
  let weightedSum = 0;
  let totalCoefficient = 0;

  for (const groupe of groupes) {
    for (const note of groupe.notes) {
      if (note.note_absent || note.note_valeur === null) continue;
      const effectiveCoefficient = note.examen_coefficient * groupe.coefficient;
      weightedSum += (note.note_valeur / note.examen_note_max) * 20 * effectiveCoefficient;
      totalCoefficient += effectiveCoefficient;
    }
  }

  if (totalCoefficient === 0) return null;
  return weightedSum / totalCoefficient;
}

export default function StudentDetailPanel({
  data,
  loading,
  onExport,
}: StudentDetailPanelProps) {
  const allNotes = useMemo(() => {
    if (!data) return [];
    return data.groupes.flatMap((groupe) =>
      groupe.notes.map((note) => ({
        id: note.examen_id,
        groupeNom: groupe.groupe_nom,
        examNom: note.examen_nom,
        valeur: note.note_valeur,
        noteMax: note.examen_note_max,
        absent: note.note_absent,
        motif: note.note_motif_absence,
      }))
    );
  }, [data]);

  const globalAverage = useMemo(
    () => (data ? computeGlobalAverage(data.groupes) : null),
    [data]
  );

  const emailPlaceholder = data
    ? `${formatEmailPart(data.prenom)}.${formatEmailPart(data.nom)}@student.junia.com`
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 gap-2">
        <p className="font-medium text-sm text-slate-700">Aucune donnée</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 space-y-3">
        <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 gap-1">
          <Avatar className="h-14 w-14 text-lg border shadow-2xs">
            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
              {`${data.nom.charAt(0)}${data.prenom.charAt(0)}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-base font-bold text-slate-900 capitalize">
              {`${data.prenom.charAt(0).toUpperCase() + data.prenom.slice(1)} ${data.nom.toUpperCase()}`}
            </h2>
            {data.promotion_nom ? (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full inline-block mt-1 border border-blue-100">
                {data.promotion_nom}
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg border">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium text-slate-700">{emailPlaceholder}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 bg-slate-50 rounded-lg border text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Moyenne</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">
                {formatAverage(globalAverage)}
              </p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Groupes</p>
              <p className="text-base font-bold text-slate-700 mt-0.5">
                {data.groupes.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-2 mt-4 pb-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5 text-slate-500" /> Relevé de Notes par Groupe
        </h3>

        <ScrollArea className="h-full rounded-lg border bg-slate-50/50 p-2">
          {allNotes.length > 0 ? (
            <div className="space-y-2">
              {allNotes.map((n, i) => (
                <div
                  key={`${n.id}-${i}`}
                  className="flex items-center justify-between p-2 bg-white rounded-md border text-xs shadow-2xs"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold text-slate-800 truncate">{n.groupeNom}</span>
                    <span className="text-[10px] text-slate-400 truncate">{n.examNom}</span>
                  </div>
                  <span
                    className={`font-bold shrink-0 ${
                      n.absent ? "text-red-500 text-[10px]" : "text-slate-700"
                    }`}
                  >
                    {n.absent ? "Absent" : `${n.valeur}/${n.noteMax}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-slate-400 gap-1">
              <AlertCircle className="h-4 w-4 text-slate-300" />
              <p className="text-[11px]">Aucune note enregistrée pour cet élève.</p>
            </div>
          )}
        </ScrollArea>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="gap-2 mt-4 pt-3 border-t border-slate-100 flex-shrink-0"
        onClick={onExport}
      >
        <FileDown className="h-4 w-4" />
        Exporter le relevé
      </Button>
    </div>
  );
}
