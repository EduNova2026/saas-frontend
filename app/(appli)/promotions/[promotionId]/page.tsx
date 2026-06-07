"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  GraduationCap,
  Import,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Users,
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
  assignGroupeToPromotion,
  createEtudiant,
  createPromotionGroupe,
  getPromotion,
  getPromotionEtudiants,
  getPromotionGroupes,
  getGroupes,
  importEtudiants,
  type EtudiantOut,
  type GroupeOut,
  type PromotionOut,
} from "@/lib/api/scolarite";

type Onglet = "etudiants" | "groupes";

function getParamValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseImportEtudiants(value: string): Array<{ nom: string; prenom: string }> {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[;,]/).map((part) => part.trim()).filter(Boolean))
    .map(([nom, prenom]) => ({ nom: nom ?? "", prenom: prenom ?? "" }))
    .filter((etudiant) => etudiant.nom && etudiant.prenom);
}

export default function PromotionManagementPage() {
  const params = useParams<{ promotionId: string }>();
  const promotionId = getParamValue(params.promotionId);
  const { hasRole, loading: authLoading } = useAuth();
  const [ongletActif, setOngletActif] = useState<Onglet>("etudiants");
  const [promotion, setPromotion] = useState<PromotionOut | null>(null);
  const [etudiants, setEtudiants] = useState<EtudiantOut[]>([]);
  const [groupes, setGroupes] = useState<GroupeOut[]>([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogGroupeOpen, setDialogGroupeOpen] = useState(false);
  const [dialogEtudiantOpen, setDialogEtudiantOpen] = useState(false);
  const [dialogImportOpen, setDialogImportOpen] = useState(false);
  const [dialogAssignOpen, setDialogAssignOpen] = useState(false);
  const [nomGroupe, setNomGroupe] = useState("");
  const [nomEtudiant, setNomEtudiant] = useState("");
  const [prenomEtudiant, setPrenomEtudiant] = useState("");
  const [importValue, setImportValue] = useState("");
  const [groupesDisponibles, setGroupesDisponibles] = useState<GroupeOut[]>([]);
  const [selectedGroupeId, setSelectedGroupeId] = useState("");
  const [creatingGroupe, setCreatingGroupe] = useState(false);
  const [creatingEtudiant, setCreatingEtudiant] = useState(false);
  const [importingEtudiants, setImportingEtudiants] = useState(false);
  const [assigningGroupe, setAssigningGroupe] = useState(false);
  const [loadingGroupesDisponibles, setLoadingGroupesDisponibles] = useState(false);
  const [createGroupeError, setCreateGroupeError] = useState<string | null>(null);
  const [createEtudiantError, setCreateEtudiantError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const isAdminPedagogique = hasRole("admin") || hasRole("admin_pedagogique");
  const canManagePromotions = hasRole("responsable_pedagogique") || isAdminPedagogique;

  const chargerPromotion = useCallback(async () => {
    if (!promotionId) return;

    try {
      setLoading(true);
      setError(null);
      const [promotionData, etudiantsData, groupesData] = await Promise.all([
        getPromotion(promotionId),
        getPromotionEtudiants(promotionId),
        getPromotionGroupes(promotionId),
      ]);
      setPromotion(promotionData);
      setEtudiants(etudiantsData);
      setGroupes(groupesData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger la promotion."
      );
    } finally {
      setLoading(false);
    }
  }, [promotionId]);

  useEffect(() => {
    if (!authLoading && canManagePromotions) {
      void chargerPromotion();
    }
  }, [authLoading, canManagePromotions, chargerPromotion]);

  const etudiantsFiltres = useMemo(() => {
    const search = recherche.trim().toLowerCase();
    if (!search) return etudiants;

    return etudiants.filter((etudiant) =>
      `${etudiant.prenom} ${etudiant.nom}`.toLowerCase().includes(search)
    );
  }, [etudiants, recherche]);

  const groupesAttribuables = useMemo(
    () => groupesDisponibles.filter((groupe) => groupe.promotion_id !== promotionId),
    [groupesDisponibles, promotionId]
  );

  const chargerGroupesDisponibles = useCallback(async () => {
    try {
      setLoadingGroupesDisponibles(true);
      setAssignError(null);
      const data = await getGroupes();
      setGroupesDisponibles(data);
      setSelectedGroupeId(data.find((groupe) => groupe.promotion_id !== promotionId)?.id ?? "");
    } catch (err) {
      setAssignError(
        err instanceof Error ? err.message : "Impossible de charger les groupes disponibles."
      );
    } finally {
      setLoadingGroupesDisponibles(false);
    }
  }, [promotionId]);

  const handleAddEtudiant = async () => {
    setCreateEtudiantError(null);
    setCreatingEtudiant(true);

    try {
      await createEtudiant(promotionId, nomEtudiant.trim(), prenomEtudiant.trim());
      setDialogEtudiantOpen(false);
      setNomEtudiant("");
      setPrenomEtudiant("");
      await chargerPromotion();
    } catch (err) {
      setCreateEtudiantError(
        err instanceof Error ? err.message : "Erreur lors de l'ajout de l'étudiant."
      );
    } finally {
      setCreatingEtudiant(false);
    }
  };

  const handleImportEtudiants = async () => {
    const parsed = parseImportEtudiants(importValue);
    setImportError(null);

    if (parsed.length === 0) {
      setImportError("Ajoutez au moins une ligne au format Nom;Prénom.");
      return;
    }

    setImportingEtudiants(true);

    try {
      await importEtudiants(promotionId, parsed);
      setDialogImportOpen(false);
      setImportValue("");
      await chargerPromotion();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Erreur lors de l'import des étudiants."
      );
    } finally {
      setImportingEtudiants(false);
    }
  };

  const handleAssignGroupe = async () => {
    const groupe = groupesAttribuables.find((item) => item.id === selectedGroupeId);
    setAssignError(null);

    if (!groupe) {
      setAssignError("Sélectionnez un groupe à attribuer.");
      return;
    }

    setAssigningGroupe(true);

    try {
      await assignGroupeToPromotion(groupe, promotionId);
      setDialogAssignOpen(false);
      setSelectedGroupeId("");
      await chargerPromotion();
    } catch (err) {
      setAssignError(
        err instanceof Error ? err.message : "Erreur lors de l'attribution du groupe."
      );
    } finally {
      setAssigningGroupe(false);
    }
  };

  const handleCreateGroupe = async () => {
    setCreateGroupeError(null);
    setCreatingGroupe(true);

    try {
      await createPromotionGroupe(promotionId, nomGroupe.trim());
      setDialogGroupeOpen(false);
      setNomGroupe("");
      await chargerPromotion();
    } catch (err) {
      setCreateGroupeError(
        err instanceof Error ? err.message : "Erreur lors de la création du groupe."
      );
    } finally {
      setCreatingGroupe(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  if (!canManagePromotions) {
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
                Votre rôle ne permet pas d&apos;accéder à la gestion de cette
                promotion.
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
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" className="w-fit gap-2 px-0 text-slate-600">
          <Link href="/promotions">
            <ArrowLeft className="h-4 w-4" />
            Retour aux promotions
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Gestion de la promotion
            </h1>
            <p className="text-sm text-slate-500">
              {promotion
                ? `${promotion.nom} · ${promotion.annee_scolaire}`
                : "Étudiants et groupes rattachés à la promotion."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Card className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Étudiants</p>
                  <p className="font-bold text-slate-900">
                    {loading ? "…" : etudiants.length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="px-4 py-3">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Groupes</p>
                  <p className="font-bold text-slate-900">
                    {loading ? "…" : groupes.length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm border">
        <CardHeader className="border-b pb-0">
          <div className="flex gap-2">
            <Button
              variant={ongletActif === "etudiants" ? "default" : "ghost"}
              onClick={() => setOngletActif("etudiants")}
            >
              Étudiants
            </Button>
            <Button
              variant={ongletActif === "groupes" ? "default" : "ghost"}
              onClick={() => setOngletActif("groupes")}
            >
              Groupes
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {ongletActif === "etudiants" ? (
            <section className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher un étudiant..."
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    className="pl-10 bg-white border-slate-200"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Dialog open={dialogEtudiantOpen} onOpenChange={setDialogEtudiantOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Ajouter un étudiant
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ajouter un étudiant</DialogTitle>
                        <DialogDescription>
                          L&apos;étudiant sera créé et rattaché à cette promotion.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="etudiant-nom" className="text-sm font-medium text-slate-700">
                            Nom
                          </label>
                          <Input
                            id="etudiant-nom"
                            value={nomEtudiant}
                            onChange={(e) => setNomEtudiant(e.target.value)}
                            placeholder="ex: Dupont"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="etudiant-prenom" className="text-sm font-medium text-slate-700">
                            Prénom
                          </label>
                          <Input
                            id="etudiant-prenom"
                            value={prenomEtudiant}
                            onChange={(e) => setPrenomEtudiant(e.target.value)}
                            placeholder="ex: Élodie"
                          />
                        </div>
                        {createEtudiantError ? (
                          <p className="sm:col-span-2 text-sm text-red-600">{createEtudiantError}</p>
                        ) : null}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDialogEtudiantOpen(false);
                            setCreateEtudiantError(null);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={handleAddEtudiant}
                          disabled={!nomEtudiant.trim() || !prenomEtudiant.trim() || creatingEtudiant}
                        >
                          {creatingEtudiant ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Ajout…
                            </>
                          ) : (
                            "Ajouter"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={dialogImportOpen} onOpenChange={setDialogImportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Import className="h-4 w-4" />
                        Importer des étudiants
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Importer des étudiants</DialogTitle>
                        <DialogDescription>
                          Collez une ligne par étudiant au format Nom;Prénom ou Nom,Prénom.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <label htmlFor="import-etudiants" className="text-sm font-medium text-slate-700">
                          Liste des étudiants
                        </label>
                        <textarea
                          id="import-etudiants"
                          value={importValue}
                          onChange={(e) => setImportValue(e.target.value)}
                          placeholder={"Dupont;Élodie\nMartin;Arthur"}
                          className="min-h-40 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        />
                        {importError ? (
                          <p className="text-sm text-red-600">{importError}</p>
                        ) : null}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDialogImportOpen(false);
                            setImportError(null);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button onClick={handleImportEtudiants} disabled={!importValue.trim() || importingEtudiants}>
                          {importingEtudiants ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Import…
                            </>
                          ) : (
                            "Importer"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <ScrollArea className="h-[430px] w-full rounded-md border">
                <Table>
                  <TableHeader className="bg-slate-50 border-b sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Étudiant</TableHead>
                      <TableHead>Identifiant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-10 text-sm text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement des étudiants…
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : etudiantsFiltres.length > 0 ? (
                      etudiantsFiltres.map((etudiant) => (
                        <TableRow key={etudiant.id}>
                          <TableCell className="py-4 font-medium text-slate-900">
                            {etudiant.prenom} {etudiant.nom}
                          </TableCell>
                          <TableCell className="py-4 text-sm text-slate-500">
                            {etudiant.id}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-10 text-sm text-slate-500">
                          Aucun étudiant trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Dialog open={dialogGroupeOpen} onOpenChange={setDialogGroupeOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Créer un groupe
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un groupe</DialogTitle>
                      <DialogDescription>
                        Le groupe sera rattaché à cette promotion.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <label htmlFor="groupe-nom" className="text-sm font-medium text-slate-700">
                        Nom du groupe
                      </label>
                      <Input
                        id="groupe-nom"
                        placeholder="ex: Groupe A"
                        value={nomGroupe}
                        onChange={(e) => setNomGroupe(e.target.value)}
                      />
                      {createGroupeError ? (
                        <p className="text-sm text-red-600">{createGroupeError}</p>
                      ) : null}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDialogGroupeOpen(false);
                          setCreateGroupeError(null);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleCreateGroupe}
                        disabled={!nomGroupe.trim() || creatingGroupe}
                      >
                        {creatingGroupe ? (
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
                <Dialog
                  open={dialogAssignOpen}
                  onOpenChange={(open) => {
                    setDialogAssignOpen(open);
                    if (open) {
                      void chargerGroupesDisponibles();
                    } else {
                      setAssignError(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">Attribuer un groupe existant</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Attribuer un groupe existant</DialogTitle>
                      <DialogDescription>
                        Sélectionnez un groupe puis rattachez-le à cette promotion.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <label htmlFor="groupe-existing" className="text-sm font-medium text-slate-700">
                        Groupe
                      </label>
                      <select
                        id="groupe-existing"
                        value={selectedGroupeId}
                        onChange={(e) => setSelectedGroupeId(e.target.value)}
                        disabled={loadingGroupesDisponibles || groupesAttribuables.length === 0}
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50"
                      >
                        {loadingGroupesDisponibles ? (
                          <option>Chargement…</option>
                        ) : groupesAttribuables.length > 0 ? (
                          groupesAttribuables.map((groupe) => (
                            <option key={groupe.id} value={groupe.id}>
                              {groupe.nom}
                            </option>
                          ))
                        ) : (
                          <option>Aucun groupe disponible</option>
                        )}
                      </select>
                      {assignError ? (
                        <p className="text-sm text-red-600">{assignError}</p>
                      ) : null}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogAssignOpen(false)}>
                        Annuler
                      </Button>
                      <Button
                        onClick={handleAssignGroupe}
                        disabled={!selectedGroupeId || assigningGroupe || loadingGroupesDisponibles}
                      >
                        {assigningGroupe ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Attribution…
                          </>
                        ) : (
                          "Attribuer"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[430px] w-full rounded-md border">
                <Table>
                  <TableHeader className="bg-slate-50 border-b sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Groupe</TableHead>
                      <TableHead>Promotion</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-sm text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement des groupes…
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : groupes.length > 0 ? (
                      groupes.map((groupe) => (
                        <TableRow key={groupe.id}>
                          <TableCell className="py-4 font-medium text-slate-900">
                            {groupe.nom}
                          </TableCell>
                          <TableCell className="py-4 text-sm text-slate-500">
                            {promotion?.nom ?? groupe.promotion_id}
                          </TableCell>
                          <TableCell className="py-4">
                            <Button asChild size="sm" variant="outline" className="gap-2">
                              <Link href={`/promotions/${promotionId}/groupes/${groupe.id}`}>
                                <Pencil className="h-4 w-4" />
                                Gérer
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-sm text-slate-500">
                          Aucun groupe trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
