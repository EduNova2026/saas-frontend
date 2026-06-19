"use client";

import Link from "next/link";
import { BadgeCheck, Loader2, Mail, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { allNavItems } from "@/config/navigation";
import { useMemo } from "react";

function formatRole(role: string): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ProfilePage() {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md border-amber-200 bg-amber-50/60 text-center">
          <CardContent className="space-y-4 py-8">
            <Shield className="mx-auto h-10 w-10 text-amber-600" />
            <div>
              <h1 className="text-base font-semibold text-slate-900">Session expirée</h1>
              <p className="mt-1 text-sm text-slate-600">
                Votre session n&apos;est plus active. Reconnectez-vous pour consulter votre profil.
              </p>
            </div>
            <Button asChild>
              <Link href="/">Retour à la connexion</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const accessiblePages = useMemo(
    () =>
      allNavItems.filter(
        (item) => item.title !== "Mon profil" && (!item.roles || item.roles.some((r) => hasRole(r)))
      ),
    [hasRole]
  );

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>
        <p className="text-sm text-slate-500">
          Bienvenue sur votre espace personnel
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="h-5 w-5 text-blue-600" />
              Identité utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nom</p>
              <p className="mt-1 font-semibold text-slate-900">{user.nom || "Non renseigné"}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Prénom</p>
              <p className="mt-1 font-semibold text-slate-900">{user.prenom || "Non renseigné"}</p>
            </div>
            <div className="rounded-lg border bg-white p-4 sm:col-span-2">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Mail className="h-3.5 w-3.5" />
                Email
              </p>
              <p className="mt-1 font-semibold text-slate-900">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-blue-600" />
                Rôles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <span key={role} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                      {formatRole(role)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Aucun rôle associé.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BadgeCheck className="h-5 w-5 text-blue-600" />
                Statut
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>
                Compte : <span className="font-semibold text-slate-900">{user.actif ? "Actif" : "Inactif"}</span>
              </p>
              <p>
                Premier login : <span className="font-semibold text-slate-900">{user.premier_login ? "Oui" : "Non"}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accès disponibles</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {accessiblePages.length > 0 ? (
            accessiblePages.map((item) => (
              <Button key={item.url} asChild variant="outline">
                <Link href={item.url}>{item.title}</Link>
              </Button>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Aucun module métier n&apos;est disponible pour votre rôle actuellement.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
