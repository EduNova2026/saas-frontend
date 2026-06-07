"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  ShieldAlert,
  Loader2,
  Plus,
  Pencil,
} from "lucide-react";
import {
  getPromotions,
  createPromotion,
  type PromotionOut,
} from "@/lib/api/scolarite";
import { useAuth } from "@/hooks/useAuth";

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasRole, loading: authLoading } = useAuth();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [anneeScolaire, setAnneeScolaire] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const isAdminPedagogique = hasRole("admin") || hasRole("admin_pedagogique");
  const canAccessPromotions = hasRole("responsable_pedagogique") || isAdminPedagogique;

  const chargerPromotions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPromotions();
      setPromotions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de charger les promotions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !canAccessPromotions) {
      setLoading(false);
      return;
    }

    async function init() {
      await chargerPromotions();
    }

    init();
  }, [authLoading, canAccessPromotions, chargerPromotions]);

  const handleCreate = async () => {
    setCreateError(null);
    setCreating(true);

    try {
      await createPromotion(nom.trim(), anneeScolaire.trim());
      setDialogOpen(false);
      setNom("");
      setAnneeScolaire("");
      await chargerPromotions();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Erreur lors de la création."
      );
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  if (!canAccessPromotions) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="border-amber-200 bg-amber-50/60 max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Accès non autorisé
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Votre rôle ne permet pas d&apos;accéder à la gestion des
                promotions. Seuls les responsables pédagogiques peuvent
                consulter cette page.
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
    <main className="p-10 bg-slate-50 min-h-screen space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gestion des Promotions
          </h1>
          <p className="text-sm text-slate-500">
            {isAdminPedagogique
              ? "Toutes les promotions de l'établissement."
              : "Vos promotions assignées."}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une promotion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une promotion</DialogTitle>
              <DialogDescription>
                Renseignez le nom et l&apos;année scolaire de la nouvelle
                promotion.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="promotion-nom"
                  className="text-sm font-medium text-slate-700"
                >
                  Nom de la promotion
                </label>
                <Input
                  id="promotion-nom"
                  placeholder="ex: ISEN CIR3"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="promotion-annee"
                  className="text-sm font-medium text-slate-700"
                >
                  Année scolaire
                </label>
                <Input
                  id="promotion-annee"
                  placeholder="ex: 2025-2026"
                  value={anneeScolaire}
                  onChange={(e) => setAnneeScolaire(e.target.value)}
                />
              </div>

              {createError ? (
                <p className="text-sm text-red-600">{createError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setCreateError(null);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!nom.trim() || !anneeScolaire.trim() || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création…
                  </>
                ) : (
                  "Créer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">
            {error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total promotions
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "…" : promotions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border overflow-hidden">
        <ScrollArea className="h-[500px] w-full">
          <Table>
            <TableHeader className="bg-slate-50 border-b sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">
                  Promotion
                </TableHead>
                <TableHead className="py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">
                  Année scolaire
                </TableHead>
                <TableHead className="py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-10 text-sm text-slate-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des promotions…
                    </div>
                  </TableCell>
                </TableRow>
              ) : promotions.length > 0 ? (
                promotions.map((promo) => (
                  <TableRow
                    key={promo.id}
                    className="border-b last:border-0 hover:bg-slate-50/80 transition-colors"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-sm text-slate-900">
                          {promo.nom}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {promo.annee_scolaire}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Button asChild size="sm" variant="outline" className="gap-2">
                        <Link href={`/promotions/${promo.id}`}>
                          <Pencil className="h-4 w-4" />
                          Modifier
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-10 text-sm text-slate-500"
                  >
                    Aucune promotion trouvée.
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
