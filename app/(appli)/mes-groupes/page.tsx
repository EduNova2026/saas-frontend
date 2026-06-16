"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  getEnseignementMoyenne,
  getEnseignantGroupes,
  getGroupe,
  getPromotions,
  type GroupeOut,
  type MoyenneOut,
} from "@/lib/api/scolarite";
import type { EnseignantGroupeOut } from "@/types/scolarite";

type GroupeRow = {
  assignment: EnseignantGroupeOut;
  groupe: GroupeOut;
  promotionName: string;
};

function formatAverage(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}/20`;
}

export default function MesGroupesPage() {
  const { hasRole, loading: authLoading, user } = useAuth();
  const [rows, setRows] = useState<GroupeRow[]>([]);
  const [groupesMoyennes, setGroupesMoyennes] = useState<Record<string, MoyenneOut | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = hasRole("enseignant");
  const userId = user?.id;

  const loadGroupes = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setGroupesMoyennes({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [assignments, promotions] = await Promise.all([
        getEnseignantGroupes(userId),
        getPromotions(),
      ]);
      const promotionNames = new Map(promotions.map((promotion) => [promotion.id, promotion.nom]));
      const groupes = await Promise.all(assignments.map((assignment) => getGroupe(assignment.groupe_id)));
      const moyenneResults = await Promise.allSettled(
        groupes.map((groupe) => getEnseignementMoyenne(groupe.id, groupe.semestre ?? 1))
      );

      setRows(
        assignments.map((assignment, index) => {
          const groupe = groupes[index];
          return {
            assignment,
            groupe,
            promotionName: promotionNames.get(groupe.promotion_id) ?? "Promotion inconnue",
          };
        })
      );
      setGroupesMoyennes(
        groupes.reduce<Record<string, MoyenneOut | null>>((acc, groupe, index) => {
          const result = moyenneResults[index];
          acc[groupe.id] = result.status === "fulfilled" ? result.value : null;
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger vos groupes.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccess) return;

    queueMicrotask(() => void loadGroupes());
  }, [authLoading, canAccess, loadGroupes]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.groupe.nom.localeCompare(b.groupe.nom, "fr")),
    [rows]
  );

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="mt-1 text-sm text-slate-600">
                Votre rôle ne permet pas d&apos;accéder à vos groupes enseignants.
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mes groupes</h1>
        <p className="text-sm text-slate-500">Consultez les groupes qui vous sont assignés et leurs informations principales.</p>
      </div>

      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <ScrollArea className="h-[520px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 border-b bg-white">
              <TableRow>
                <TableHead>Groupe</TableHead>
                <TableHead>Semestre</TableHead>
                <TableHead>Moyenne</TableHead>
                <TableHead>Promotion</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedRows.length > 0 ? (
                sortedRows.map(({ assignment, groupe, promotionName }) => (
                  <TableRow key={`${assignment.enseignant_id}-${assignment.groupe_id}`}>
                    <TableCell className="font-medium text-slate-900">{groupe.nom}</TableCell>
                    <TableCell><span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">S{groupe.semestre}</span></TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatAverage(groupesMoyennes[groupe.id]?.moyenne ?? null)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{promotionName}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/mes-groupes/${groupe.id}`}>Voir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                    Aucun groupe assigné.
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
