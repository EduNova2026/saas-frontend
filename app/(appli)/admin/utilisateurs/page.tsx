"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Search, ShieldAlert, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getUsers, updateUserActivation } from "@/lib/api/admin";
import type { UtilisateurOut } from "@/types/admin";

function StatusBadge({ actif }: { actif: boolean }) {
  return actif ? (
    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Actif</Badge>
  ) : (
    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
      Inactif
    </Badge>
  );
}

export default function AdminUtilisateursPage() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const canAccessUsers = hasRole("admin_pedagogique");
  const [users, setUsers] = useState<UtilisateurOut[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const chargerUtilisateurs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !canAccessUsers) return;

    queueMicrotask(() => void chargerUtilisateurs());
  }, [authLoading, canAccessUsers, chargerUtilisateurs, user]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return users;

    return users.filter(
      (utilisateur) =>
        utilisateur.nom.toLowerCase().includes(normalizedSearch) ||
        utilisateur.prenom.toLowerCase().includes(normalizedSearch) ||
        utilisateur.email.toLowerCase().includes(normalizedSearch)
    );
  }, [search, users]);

  const handleToggleActivation = async (userId: string, currentActif: boolean) => {
    setToggleError(null);
    setTogglingUserId(userId);
    setUsers((prev) =>
      prev.map((utilisateur) =>
        utilisateur.id === userId ? { ...utilisateur, actif: !currentActif } : utilisateur
      )
    );

    try {
      await updateUserActivation(userId, !currentActif);
    } catch (err) {
      setUsers((prev) =>
        prev.map((utilisateur) =>
          utilisateur.id === userId ? { ...utilisateur, actif: currentActif } : utilisateur
        )
      );
      setToggleError(
        err instanceof Error ? err.message : "Impossible de modifier le statut de l'utilisateur."
      );
    } finally {
      setTogglingUserId(null);
    }
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  if (!user || !canAccessUsers) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="mt-1 text-sm text-slate-600">
                Votre rôle ne permet pas d&apos;accéder à la gestion des utilisateurs.
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des utilisateurs</h1>
          <p className="text-sm text-slate-500">
            Recherchez les comptes, consultez les profils et gérez leur activation.
          </p>
        </div>
      </div>

      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      {toggleError ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{toggleError}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5 text-blue-600" />
            Utilisateurs
          </CardTitle>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Rechercher par nom, prénom ou email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[560px] w-full">
            <Table>
              <TableHeader className="sticky top-0 z-10 border-b bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nom
                  </TableHead>
                  <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Prénom
                  </TableHead>
                  <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Email
                  </TableHead>
                  <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Statut
                  </TableHead>
                  <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement des utilisateurs…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((utilisateur) => (
                    <TableRow
                      key={utilisateur.id}
                      className="border-b transition-colors last:border-0 hover:bg-slate-50/80"
                    >
                      <TableCell className="py-4 font-semibold text-slate-900">
                        {utilisateur.nom || "Non renseigné"}
                      </TableCell>
                      <TableCell className="py-4 text-slate-700">
                        {utilisateur.prenom || "Non renseigné"}
                      </TableCell>
                      <TableCell className="py-4 text-slate-700">{utilisateur.email}</TableCell>
                      <TableCell className="py-4">
                        <StatusBadge actif={utilisateur.actif} />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={utilisateur.actif ? "destructive" : "outline"}
                            disabled={togglingUserId === utilisateur.id}
                            onClick={() => handleToggleActivation(utilisateur.id, utilisateur.actif)}
                          >
                            {togglingUserId === utilisateur.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {utilisateur.actif ? "Désactiver" : "Activer"}
                          </Button>
                          <Button asChild size="sm" variant="outline" className="gap-2">
                            <Link href={`/admin/utilisateurs/${utilisateur.id}`}>
                              <Eye className="h-4 w-4" />
                              Voir
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                      {search.trim()
                        ? "Aucun utilisateur ne correspond à cette recherche."
                        : "Aucun utilisateur trouvé."}
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
