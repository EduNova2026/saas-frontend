"use client";

import type { ImportJobOut, ImportErrorDetail } from "@/lib/api/imports";
import { Button } from "@/components/ui/button";
import { UserPlus, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

function groupErrors(
  errors: ImportErrorDetail[],
): { horsGroupe: ImportErrorDetail[]; introuvables: ImportErrorDetail[]; autres: ImportErrorDetail[] } {
  return {
    horsGroupe: errors.filter((e) => e.code === "hors_groupe"),
    introuvables: errors.filter((e) => e.code === "etudiant_introuvable"),
    autres: errors.filter(
      (e) => e.code !== "hors_groupe" && e.code !== "etudiant_introuvable",
    ),
  };
}

interface ImportCsvResultProps {
  job: ImportJobOut;
  canAddToGroup?: boolean;
  onAddToGroup?: (etudiantId: string) => void;
  addingIds?: Set<string>;
}

export function ImportCsvResult({ job, canAddToGroup, onAddToGroup, addingIds }: ImportCsvResultProps) {
  const errors = job.erreurs_detail;
  const lignesOk = job.lignes_ok ?? 0;
  const lignesErreur = job.lignes_erreur ?? (errors?.length ?? 0);
  const lignesTotal = job.lignes_total ?? (lignesOk + lignesErreur);

  if (!errors || errors.length === 0) {
    if (job.statut === "succes") {
      return (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Import réussi : {lignesOk} note{lignesOk !== 1 ? "s" : ""} importée{lignesOk !== 1 ? "s" : ""}.</span>
        </div>
      );
    }
    return (
      <p className="text-sm text-slate-600">Import CSV {job.statut?.toLowerCase() ?? "lancé"}.</p>
    );
  }

  const { horsGroupe, introuvables, autres } = groupErrors(errors);

  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>{lignesTotal} ligne{lignesTotal !== 1 ? "s" : ""} dans le fichier</span>
        <span className="flex items-center gap-1 text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          {lignesOk} acceptée{lignesOk !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1 text-red-700">
          <XCircle className="h-3 w-3" />
          {lignesErreur} rejetée{lignesErreur !== 1 ? "s" : ""}
        </span>
      </div>

      {horsGroupe.length > 0 && (
        <ErrorGroup
          title="Présents dans EDU'NOVA mais absents du groupe"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
          errors={horsGroupe}
          canAddToGroup={canAddToGroup}
          onAddToGroup={onAddToGroup}
          addingIds={addingIds}
          hint="Ces étudiants existent dans la base mais ne sont pas inscrits dans ce groupe. Vérifiez l'initialisation du groupe."
        />
      )}

      {introuvables.length > 0 && (
        <ErrorGroup
          title="Étudiants introuvables en base"
          icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
          errors={introuvables}
          hint="Ces noms ne correspondent à aucun étudiant dans EDU'NOVA."
        />
      )}

      {autres.length > 0 && (
        <ErrorGroup
          title="Autres erreurs"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-slate-500" />}
          errors={autres}
        />
      )}
    </div>
  );
}

function ErrorGroup({
  title,
  icon,
  errors,
  hint,
  canAddToGroup,
  onAddToGroup,
  addingIds,
}: {
  title: string;
  icon: React.ReactNode;
  errors: ImportErrorDetail[];
  hint?: string;
  canAddToGroup?: boolean;
  onAddToGroup?: (etudiantId: string) => void;
  addingIds?: Set<string>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        {icon}
        {title} ({errors.length})
      </div>
      {hint ? (
        <p className="text-[11px] text-slate-500">{hint}</p>
      ) : null}
      <div className="max-h-40 overflow-y-auto rounded border border-amber-100 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-slate-500">
              <th className="px-2 py-1 font-medium">Ligne</th>
              <th className="px-2 py-1 font-medium">Nom</th>
              <th className="px-2 py-1 font-medium">Prénom</th>
              <th className="px-2 py-1 font-medium">Raison</th>
              {canAddToGroup ? <th className="px-2 py-1 font-medium"></th> : null}
            </tr>
          </thead>
          <tbody>
            {errors.map((err, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-2 py-1 text-slate-500">{err.ligne}</td>
                <td className="px-2 py-1 font-medium text-slate-800">{err.nom}</td>
                <td className="px-2 py-1 text-slate-700">{err.prenom}</td>
                <td className="px-2 py-1 text-slate-500">{err.raison}</td>
                {canAddToGroup && onAddToGroup ? (
                  <td className="px-2 py-0.5">
                    {err.etudiant_id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 px-2 text-[11px]"
                        disabled={addingIds?.has(err.etudiant_id)}
                        onClick={() => onAddToGroup(err.etudiant_id!)}
                      >
                        <UserPlus className="h-3 w-3" />
                        {addingIds?.has(err.etudiant_id!) ? "Ajout..." : "Ajouter au groupe"}
                      </Button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
