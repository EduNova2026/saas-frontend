"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, GraduationCap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Identifiants invalides.");
      }

      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">EDU&apos;NOVA</CardTitle>
          <p className="text-sm text-slate-500">Plateforme de suivi pédagogique</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Mot de passe</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
            )}
            <Button type="submit" disabled={loading || !email || !password} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}