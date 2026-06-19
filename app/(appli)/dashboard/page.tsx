"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useAuth } from "@/hooks/useAuth"
import { ShieldAlert, GraduationCap, Layers, Loader2} from "lucide-react"

// Importations complétées depuis scolarite.ts
import { 
  getEtudiants, 
  getPromotions, 
  getGroupes, 
  getGroupeEtudiants, 
  getPromotionEtudiantsMoyennes,
  getGroupeEtudiantsMoyennes,
  getPromotionMoyenne,
  getEnseignementMoyenne,
  type EtudiantOut, 
  type MoyenneParEtudiant,
  type MoyenneOut,
  type GroupeOut 
} from "@/lib/api/scolarite"

const chartConfig = {
  moyenneGenerale: { label: "Moyenne", color: "#2563eb" },
} satisfies ChartConfig

function formatAverage(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}/20`;
}

export default function DashboardPage() {
  const [etudiants, setEtudiants] = useState<EtudiantOut[]>([])
  const [promotionMap, setPromotionMap] = useState<Map<string, string>>(new Map())
  const [groupesRaw, setGroupesRaw] = useState<GroupeOut[]>([])
  const [idsEtudiantsDuGroupe, setIdsEtudiantsDuGroupe] = useState<string[]>([])
  const [moyennesByEtudiant, setMoyennesByEtudiant] = useState<Record<string, MoyenneParEtudiant | null>>({})
  const [moyenneScope, setMoyenneScope] = useState<MoyenneOut | null>(null)
  const [semestreSelectionne, setSemestreSelectionne] = useState<number>(1)
  
  const [loading, setLoading] = useState(true)
  const [loadingGroupe, setLoadingGroupe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Variables d'état pour capturer les sélections des listes déroulantes
  const [promoSelectionnee, setPromoSelectionnee] = useState<string>("TOUTES")
  const [groupeSelectionne, setGroupeSelectionne] = useState<string>("TOUS")

  const { hasRole, loading: authLoading } = useAuth()
  const canAccessDashboard = hasRole("responsable_pedagogique")

  // 1. Chargement initial unifié de l'ensemble de la scolarité (Étudiants + Promotions + Groupes)
  useEffect(() => {
    if (authLoading || !canAccessDashboard) {
      setLoading(false)
      return
    }

    let actif = true

    async function chargerDonneesGlobales() {
      try {
        setLoading(true)
        setError(null)
        const [response, promotions, groupes] = await Promise.all([
          getEtudiants(), 
          getPromotions(),
          getGroupes()
        ])
        const etudiantsCharges = response.items ?? []
        const moyennesParEtudiant = etudiantsCharges.reduce<Record<string, MoyenneParEtudiant | null>>(
          (acc, etudiant) => {
            acc[etudiant.id] = null
            return acc
          },
          {}
        )

        if (groupeSelectionne !== "TOUS") {
          const groupe = groupes.find((groupe) => groupe.id === groupeSelectionne)
          const moyennesGroupe = await getGroupeEtudiantsMoyennes(
            groupeSelectionne,
            groupe?.semestre ?? 1
          ).catch(() => [])

          moyennesGroupe.forEach((moyenne) => {
            moyennesParEtudiant[moyenne.etudiant_id] = moyenne
          })
        } else if (promoSelectionnee !== "TOUTES") {
          const moyennesPromotion = await getPromotionEtudiantsMoyennes(
            promoSelectionnee,
            semestreSelectionne
          ).catch(() => [])

          moyennesPromotion.forEach((moyenne) => {
            moyennesParEtudiant[moyenne.etudiant_id] = moyenne
          })
        } else {
          const moyennesParPromotion = await Promise.all(
            promotions.map((promotion) =>
              getPromotionEtudiantsMoyennes(promotion.id, semestreSelectionne).catch(() => [])
            )
          )

          moyennesParPromotion.flat().forEach((moyenne) => {
            moyennesParEtudiant[moyenne.etudiant_id] = moyenne
          })
        }

        let moyenneCible: MoyenneOut | null = null
        if (groupeSelectionne !== "TOUS") {
          const groupe = groupes.find((groupe) => groupe.id === groupeSelectionne)
          moyenneCible = await getEnseignementMoyenne(groupeSelectionne, groupe?.semestre ?? 1).catch(() => null)
        } else if (promoSelectionnee !== "TOUTES") {
          moyenneCible = await getPromotionMoyenne(promoSelectionnee, 1).catch(() => null)
        } else {
          const moyennesValides = Object.values(moyennesParEtudiant)
            .map((moyenne) => moyenne?.moyenne ?? null)
            .filter((moyenne): moyenne is number => moyenne !== null)
          moyenneCible = {
            moyenne: moyennesValides.length > 0
              ? moyennesValides.reduce((total, moyenne) => total + moyenne, 0) / moyennesValides.length
              : null,
            semestre: semestreSelectionne,
            note_count: Object.values(moyennesParEtudiant).reduce(
              (total, moyenne) => total + (moyenne?.note_count ?? 0),
              0
            ),
            coefficient_total: Object.values(moyennesParEtudiant).reduce(
              (total, moyenne) => total + (moyenne?.coefficient_total ?? 0),
              0
            ),
          }
        }

        if (actif) {
          setEtudiants(etudiantsCharges)
          setPromotionMap(new Map(promotions.map((promotion) => [promotion.id, promotion.nom])))
          setGroupesRaw(groupes ?? [])
          setMoyennesByEtudiant(moyennesParEtudiant)
          setMoyenneScope(moyenneCible)
        }
      } catch {
        if (actif) {
          setError("Impossible de charger le registre global de la scolarité.")
        }
      } finally {
        if (actif) {
          setLoading(false)
        }
      }
    }

    void chargerDonneesGlobales()

    return () => {
      actif = false
    }
  }, [authLoading, canAccessDashboard, semestreSelectionne, promoSelectionnee, groupeSelectionne])

  // 2. Interrogation dynamique de la table pivot d'attribution dès qu'un groupe est ciblé
  useEffect(() => {
    if (groupeSelectionne === "TOUS") {
      setIdsEtudiantsDuGroupe([])
      return
    }

    let actif = true

    async function filtrerParIdentifiantsGroupe() {
      try {
        setLoadingGroupe(true)
        const etudiantsDuGroupe = await getGroupeEtudiants(groupeSelectionne)
        if (actif) {
          setIdsEtudiantsDuGroupe(etudiantsDuGroupe.map(e => e.id))
        }
      } catch (err) {
        console.error("Erreur d'interrogation de la liste du groupe :", err)
      } finally {
        if (actif) setLoadingGroupe(false)
      }
    }

    void filtrerParIdentifiantsGroupe()

    return () => {
      actif = false
    }
  }, [groupeSelectionne])

  // 3. Cascade de filtres : recalcule la liste des groupes dépendants de la promotion choisie
  const listeGroupesFiltrés = useMemo(() => {
    if (promoSelectionnee === "TOUTES") return groupesRaw
    return groupesRaw.filter(g => g.promotion_id === promoSelectionnee)
  }, [groupesRaw, promoSelectionnee])

  // Réinitialisation automatique du groupe enfant si la promotion parente change
  useEffect(() => {
    setGroupeSelectionne("TOUS")
  }, [promoSelectionnee])

  // 4. Entonnoir de filtrage virtuel appliqué avant TanStack Table (Garde les originaux intacts)
  const etudiantsFiltrés = useMemo(() => {
    return etudiants.filter(etudiant => {
      if (promoSelectionnee !== "TOUTES" && etudiant.promotion_id !== promoSelectionnee) return false
      if (groupeSelectionne !== "TOUS" && !idsEtudiantsDuGroupe.includes(etudiant.id)) return false
      return true
    })
  }, [etudiants, promoSelectionnee, groupeSelectionne, idsEtudiantsDuGroupe])

  const etudiantsAnalysés = useMemo(() => {
    return etudiantsFiltrés.filter((etudiant) => (moyennesByEtudiant[etudiant.id]?.note_count ?? 0) > 0).length
  }, [etudiantsFiltrés, moyennesByEtudiant])

  const etudiantsARisque = useMemo(() => {
    return etudiantsFiltrés.filter((etudiant) => {
      const moyenne = moyennesByEtudiant[etudiant.id]?.moyenne
      return moyenne !== null && moyenne !== undefined && moyenne < 10
    }).length
  }, [etudiantsFiltrés, moyennesByEtudiant])

  const donneesGraphique = useMemo(() => [
    { scope: "Moyenne", moyenneGenerale: moyenneScope?.moyenne ?? 0 },
  ], [moyenneScope])

  // Construction des colonnes du tableau
  const columns = useMemo<ColumnDef<EtudiantOut>[]>(() => [
    {
      id: "etudiant",
      header: "ÉTUDIANT",
      cell: ({ row }) => {
        const { nom, prenom, promotion_id } = row.original

        return (
          <div className="flex flex-col">
            {/* Ajout de la classe capitalize pour nettoyer les données brutes du backend */}
            <span className="font-semibold text-sm text-slate-900 capitalize">{`${nom} ${prenom}`}</span>
            <span className="text-xs text-muted-foreground">
              Promotion : {promotion_id ? (promotionMap.get(promotion_id) ?? "Promotion inconnue") : "Non assignée"}
            </span>
          </div>
        )
      },
    },
    {
      id: "moyenne",
      header: "MOYENNE",
      cell: ({ row }) => {
        const m = moyennesByEtudiant[row.original.id];
        return <span className="font-bold text-slate-500">{formatAverage(m?.moyenne ?? null)}</span>;
      },
    },
    {
      id: "derniereNote",
      header: "DERNIÈRE NOTE",
      cell: () => <span className="text-slate-500 text-sm">—</span>,
    },
    {
      id: "scoreRisque",
      header: "SCORE RISQUE",
      cell: ({ row }) => {
        const m = moyennesByEtudiant[row.original.id];
        if (!m || m.moyenne === null) return <span className="text-slate-500 text-sm">—</span>;
        return <span className={m.moyenne < 10 ? "text-red-500 font-bold text-sm" : "text-green-600 text-sm"}>{m.moyenne < 10 ? "À risque" : "OK"}</span>;
      },
    },
    {
      id: "statut",
      header: "STATUT",
      cell: ({ row }) => {
        const m = moyennesByEtudiant[row.original.id];
        if (!m) return <span className="text-slate-500 text-sm">—</span>;
        return <span className="text-sm text-slate-600">{m.note_count} notes</span>;
      },
    },
  ], [promotionMap, moyennesByEtudiant])

  // Raccordement de la table TanStack aux données filtrées à la volée
  const table = useReactTable<EtudiantOut>({
    data: etudiantsFiltrés,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (authLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </main>
    )
  }

  if (!canAccessDashboard) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="border-amber-200 bg-amber-50/60 max-w-md w-full shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="text-sm text-slate-600 mt-1">
                Votre rôle ne permet pas d&apos;accéder au dashboard. Seuls les responsables pédagogiques peuvent consulter cette page.
              </p>
            </div>
            <Button asChild variant="outline" className="shadow-xs">
              <Link href="/profile">Retour à mon profil</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="p-10 bg-slate-50 min-h-screen space-y-8">
      {/* En-tête modernisé intégrant le bloc de sélection double en cascade */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Responsable</h1>
          <p className="text-sm text-slate-500 mt-0.5">Données consolidées issues du backend de scolarité.</p>
        </div>

        {/* Bloc graphique de filtrage à deux niveaux */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {/* Menu déroulant des Promotions */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-60 shadow-2xs">
            <GraduationCap className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={promoSelectionnee}
              onChange={(e) => setPromoSelectionnee(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 outline-none w-full cursor-pointer"
            >
              <option value="TOUTES">Toutes les promotions</option>
              {Array.from(promotionMap.entries()).map(([id, nom]) => (
                <option key={id} value={id}>{nom}</option>
              ))}
            </select>
          </div>

          {/* Menu déroulant des Groupes */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-60 shadow-2xs">
            <Layers className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={groupeSelectionne}
              onChange={(e) => setGroupeSelectionne(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 outline-none w-full cursor-pointer"
              disabled={loadingGroupe}
            >
              <option value="TOUS">{loadingGroupe ? "Mise à jour..." : "Tous les groupes"}</option>
              {listeGroupesFiltrés.map(g => (
                <option key={g.id} value={g.id}>{g.nom} (S{g.semestre})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/50 shadow-xs">
          <CardContent className="py-4 text-sm text-red-700 font-medium">{error}</CardContent>
        </Card>
      ) : null}

      {/* Cartes d'indicateurs dynamiques indexées sur la sélection filtrée */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-xs border bg-white rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Étudiants inscrits</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{loading || loadingGroupe ? "…" : etudiantsFiltrés.length}</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border bg-white rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Étudiants analysés</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{loading || loadingGroupe ? "…" : etudiantsAnalysés}</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border bg-white rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Étudiants à risque</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500 tracking-tight">{loading || loadingGroupe ? "…" : etudiantsARisque}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grille principale de données */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="shadow-xs border bg-white rounded-xl overflow-hidden h-[365px] flex flex-col">
          <ScrollArea className="h-full w-full">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50/90 z-20 shadow-2xs border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="py-3 font-bold text-xs text-slate-500 uppercase tracking-wider">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading || loadingGroupe ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-20 text-sm text-slate-400 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        Calcul de la segmentation de scolarité…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-20 text-sm text-slate-400 font-medium">
                      Aucun étudiant ne correspond aux filtres actifs.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>

        <Card className="shadow-xs border bg-white rounded-xl h-[365px] flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold text-slate-600 tracking-tight">Moyenne actuelle — Semestre {semestreSelectionne}</CardTitle>
            <select
              value={semestreSelectionne}
              onChange={(e) => setSemestreSelectionne(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 outline-none cursor-pointer shadow-2xs"
            >
              <option value={1}>Semestre 1</option>
              <option value={2}>Semestre 2</option>
            </select>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0 relative">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={donneesGraphique} margin={{ left: -10, right: 10, bottom: 5, top: 10 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="scope" tickLine={false} axisLine={false} tickMargin={10} className="text-xs text-slate-500" />
                <YAxis domain={[0, 20]} tickLine={false} axisLine={false} tickMargin={10} className="text-xs text-slate-500" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="moyenneGenerale"
                  fill="var(--color-moyenneGenerale)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
