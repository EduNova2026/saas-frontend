"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, ShieldAlert } from "lucide-react";
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
  getPromotion,
  getResponsablePromotions,
  type PromotionOut,
} from "@/lib/api/scolarite";

export default function MesPromotionsPage() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [promotions, setPromotions] = useState<PromotionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = hasRole("responsable_pedagogique");
  const userId = user?.id;

  const loadPromotions = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const assignments = await getResponsablePromotions(userId);
      const loadedPromotions = await Promise.all(
        assignments.map((assignment) => getPromotion(assignment.promotion_id))
      );
      setPromotions(loadedPromotions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger vos promotions.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;

    if (!canAccess || !userId) {
      return;
    }

    queueMicrotask(() => void loadPromotions());
  }, [authLoading, canAccess, loadPromotions, userId]);

  const sortedPromotions = useMemo(
    () => [...promotions].sort((a, b) => a.nom.localeCompare(b.nom)),
    [promotions]
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
                Seuls les responsables pédagogiques peuvent consulter leurs promotions.
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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Mes promotions</h1>
        <p className="text-sm text-slate-500">Consultez les promotions qui vous sont assignées.</p>
      </div>

      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 border-b bg-slate-50">
                <TableRow>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Année</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement des promotions…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedPromotions.length > 0 ? (
                  sortedPromotions.map((promotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell className="font-medium text-slate-900">{promotion.nom}</TableCell>
                      <TableCell className="text-sm text-slate-600">{promotion.annee_scolaire}</TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline" className="gap-2">
                          <Link href={`/mes-promotions/${promotion.id}`}>
                            <Eye className="h-4 w-4" />
                            Voir
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-slate-500">
                      Aucune promotion assignée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </main>
  );
}
