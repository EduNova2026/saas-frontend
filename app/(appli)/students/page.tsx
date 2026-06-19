"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useReactTable, getCoreRowModel, flexRender, ColumnDef, getFilteredRowModel } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Mail, Search, User, ListTodo, GraduationCap, Loader2, ShieldAlert, AlertCircle, Layers } from "lucide-react"

// Importations complétées depuis scolarite.ts
import { 
  getEtudiants, 
  getEtudiantMoyenne,
  getNotes, 
  getPromotions, 
  getGroupes, 
  getGroupeEtudiants, 
  type EtudiantOut, 
  type MoyenneOut,
  type PromotionOut, 
  type GroupeOut 
} from "@/lib/api/scolarite"
import { useAuth } from "@/hooks/useAuth"
import type { NoteOut } from "@/types/scolarite"

interface EtudiantComplet {
  id: string
  nom: string
  prenom: string
  classe: string
  promotionIdBrut: string
  moyenne: number | null
  derniereNote: string
  scoreRisque: number
  statut: "OK" | "Risque" | "Suivre"
  aDesNotes: boolean
}

function formatAverage(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}/20`
}

const formatEmailPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "")

export default function StudentsPage() {
  const [etudiantsRaw, setEtudiantsRaw] = useState<EtudiantOut[]>([])
  const [notesRaw, setNotesRaw] = useState<NoteOut[]>([])
  const [promotionsRaw, setPromotionsRaw] = useState<PromotionOut[]>([])
  const [groupesRaw, setGroupesRaw] = useState<GroupeOut[]>([])
  const [idsEtudiantsDuGroupe, setIdsEtudiantsDuGroupe] = useState<string[]>([])
  const [moyennesByEtudiant, setMoyennesByEtudiant] = useState<Record<string, MoyenneOut | null>>({})
  
  const [recherche, setRecherche] = useState("")
  const [etudiantSelectionneId, setEtudiantSelectionneId] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [loadingGroupe, setLoadingGroupe] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Variables de filtrage globales
  const [promoSelectionnee, setPromoSelectionnee] = useState<string>("TOUTES")
  const [groupeSelectionne, setGroupeSelectionne] = useState<string>("TOUS")
  const [selectedSemestre, setSelectedSemestre] = useState<number>(1)

  const { hasRole, loading: authLoading } = useAuth()
  const canAccessStudents = hasRole("responsable_pedagogique") || hasRole("admin_pedagogique")

  // 1. Chargement de l'ensemble des registres depuis la base PostgreSQL
  useEffect(() => {
    if (authLoading || !canAccessStudents) {
      setLoading(false)
      return
    }

    let actif = true

    async function chargerDonneesScolarite() {
      try {
        setLoading(true)
        setError(null)
        
        const [resEtudiants, resNotes, resPromotions, resGroupes] = await Promise.all([
          getEtudiants(),
          getNotes(),
          getPromotions(),
          getGroupes()
        ])

        if (actif) {
          setEtudiantsRaw(resEtudiants.items ?? [])
          setNotesRaw(resNotes ?? [])
          setPromotionsRaw(resPromotions ?? [])
          setGroupesRaw(resGroupes ?? [])
        }
      } catch {
        if (actif) {
          setError("Impossible de charger les dossiers d'étudiants.")
        }
      } finally {
        if (actif) setLoading(false)
      }
    }

    void chargerDonneesScolarite()

    return () => { actif = false }
  }, [authLoading, canAccessStudents])

  // 2. Interrogation asynchrone des liaisons de groupes
  useEffect(() => {
    if (groupeSelectionne === "TOUS") {
      setIdsEtudiantsDuGroupe([])
      return
    }

    let actif = true

    async function chargerEtudiantsDuGroupe() {
      try {
        setLoadingGroupe(true)
        const etudiantsDuGroupe = await getGroupeEtudiants(groupeSelectionne)
        if (actif) {
          setIdsEtudiantsDuGroupe(etudiantsDuGroupe.map(e => e.id))
        }
      } catch (err) {
        console.error("Erreur de récupération du groupe :", err)
      } finally {
        if (actif) setLoadingGroupe(false)
      }
    }

    void chargerEtudiantsDuGroupe()

    return () => { actif = false }
  }, [groupeSelectionne])

  // Dictionnaires de résolution pour l'interface graphique (Évite les UUID)
  const dictionnairePromotions = useMemo(() => {
    const map: Record<string, string> = {}
    promotionsRaw.forEach(p => { map[p.id] = p.nom })
    return map
  }, [promotionsRaw])

  const dictionnaireGroupes = useMemo(() => {
    const map: Record<string, string> = {}
    groupesRaw.forEach(g => { map[g.id] = g.nom })
    return map
  }, [groupesRaw])

  // Gestion de la cascade de filtrage
  const listeGroupesFiltrés = useMemo(() => {
    if (promoSelectionnee === "TOUTES") return groupesRaw
    return groupesRaw.filter(g => g.promotion_id === promoSelectionnee)
  }, [groupesRaw, promoSelectionnee])

  useEffect(() => {
    setGroupeSelectionne("TOUS")
    setSelectedSemestre(1)
  }, [promoSelectionnee])

  function handleGroupeSelectionChange(groupeId: string) {
    setGroupeSelectionne(groupeId)
    setSelectedSemestre(groupesRaw.find(groupe => groupe.id === groupeId)?.semestre ?? 1)
  }

  const etudiantsFiltres = useMemo(() => {
    return etudiantsRaw.filter(etudiant => {
      if (promoSelectionnee !== "TOUTES" && etudiant.promotion_id !== promoSelectionnee) return false
      if (groupeSelectionne !== "TOUS" && !idsEtudiantsDuGroupe.includes(etudiant.id)) return false
      return true
    })
  }, [etudiantsRaw, promoSelectionnee, groupeSelectionne, idsEtudiantsDuGroupe])

  useEffect(() => {
    if (etudiantsFiltres.length === 0) {
      setMoyennesByEtudiant({})
      return
    }

    let actif = true

    async function chargerMoyennesEtudiants() {
      const resultats = await Promise.allSettled(
        etudiantsFiltres.map(async etudiant => ({
          etudiantId: etudiant.id,
          moyenne: await getEtudiantMoyenne(etudiant.id, selectedSemestre ?? 1),
        }))
      )

      if (!actif) return

      const moyennes: Record<string, MoyenneOut | null> = {}
      resultats.forEach((resultat, index) => {
        const etudiantId = etudiantsFiltres[index]?.id
        if (!etudiantId) return
        moyennes[etudiantId] = resultat.status === "fulfilled" ? resultat.value.moyenne : null
      })

      setMoyennesByEtudiant(moyennes)
    }

    void chargerMoyennesEtudiants()

    return () => { actif = false }
  }, [etudiantsFiltres, selectedSemestre])

  // 3. Calculs des fiches académiques filtrées et ordonnées
  const etudiantsFormates = useMemo<EtudiantComplet[]>(() => {
    return etudiantsFiltres
      .map((etudiant) => {
        const notesEtudiant = notesRaw.filter(note => note.etudiant_id === etudiant.id)
        const notesValides = notesEtudiant.filter(n => !n.absent && n.valeur !== undefined && n.valeur !== null)
        
        const totalNotes = notesValides.length
        const moyenneValue = moyennesByEtudiant[etudiant.id]?.moyenne ?? null

        const derniereNoteObj = notesValides[notesValides.length - 1]
        const derniereNoteStr = derniereNoteObj ? `${derniereNoteObj.valeur?.toFixed(1)}/20` : "—"

        let scoreRisque = 15
        if (moyenneValue === null) scoreRisque = 0 
        else if (moyenneValue < 10) scoreRisque = 85 
        else if (moyenneValue < 12) scoreRisque = 45

        let statut: "OK" | "Risque" | "Suivre" = "OK"
        if (scoreRisque >= 70) statut = "Risque"
        else if (scoreRisque >= 40) statut = "Suivre"

        const idPromo = etudiant.promotion_id || ""

        return {
          id: etudiant.id,
          nom: etudiant.nom,
          prenom: etudiant.prenom,
          classe: dictionnairePromotions[idPromo] || "Non définie",
          promotionIdBrut: idPromo,
          moyenne: moyenneValue,
          derniereNote: derniereNoteStr,
          scoreRisque: scoreRisque,
          statut: statut,
          aDesNotes: totalNotes > 0
        }
      })
  }, [etudiantsFiltres, notesRaw, moyennesByEtudiant, dictionnairePromotions])

  // Synchronisation de l'élève sélectionné à droite
  const etudiantSelectionne = useMemo(() => {
    return etudiantsFormates.find(e => e.id === etudiantSelectionneId) || null
  }, [etudiantsFormates, etudiantSelectionneId])

  useEffect(() => {
    if (etudiantSelectionneId && !etudiantsFormates.some(e => e.id === etudiantSelectionneId)) {
      setEtudiantSelectionneId(null)
    }
  }, [etudiantsFormates, etudiantSelectionneId])

  // Relevé de notes croisé avec le nom lisible des groupes
  const detailNotesEtudiant = useMemo(() => {
    if (!etudiantSelectionneId) return []
    return notesRaw
      .filter(note => note.etudiant_id === etudiantSelectionneId)
      .map(note => {
        const idDuGroupe = note.examen?.enseignement_id || ""
        const nomDuGroupeLisible = dictionnaireGroupes[idDuGroupe] || "Général"

        return {
          id: note.id,
          nomGroupe: nomDuGroupeLisible,
          nomExamen: note.examen?.nom || "Évaluation",
          noteAffichage: note.absent ? "Absent" : `${note.valeur?.toFixed(1)}/20`,
          isAbsent: note.absent
        }
      })
  }, [notesRaw, etudiantSelectionneId, dictionnaireGroupes])

  // 4. Configuration des colonnes TanStack Table
  const columnsTable = useMemo<ColumnDef<EtudiantComplet>[]>(() => [
    {
      id: "etudiant",
      header: "ÉTUDIANT",
      cell: ({ row }) => {
        const { nom, prenom, classe } = row.original
        const initiales = `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase()

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border">
              <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-xs">{initiales}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              {/* Classe capitalize pour forcer la propreté graphique des noms en minuscules */}
              <span className="font-semibold text-sm text-slate-900 capitalize">{`${prenom} ${nom}`}</span>
              <span className="text-xs text-slate-500">{classe}</span>
            </div>
          </div>
        )
      },
    },
    {
      id: "moyenne",
      header: "MOYENNE",
      cell: ({ row }) => {
        const moyenneValue = row.original.moyenne
        return <span className={`font-bold ${moyenneValue === null ? "text-slate-400" : "text-slate-800"}`}>{formatAverage(moyenneValue)}</span>
      },
    },
    {
      id: "risque",
      header: "RISQUE",
      cell: ({ row }) => <span className="font-medium text-slate-600">{row.original.scoreRisque}%</span>,
    },
    {
      id: "statut",
      header: "STATUT",
      cell: ({ row }) => {
        const { statut } = row.original
        const styles = {
          Risque: "bg-red-100 text-red-700 border-red-200",
          Suivre: "bg-amber-100 text-amber-700 border-amber-200",
          OK: "bg-green-100 text-green-700 border-green-200",
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[statut]}`}>
            {statut}
          </span>
        )
      },
    },
  ], [])

  const table = useReactTable<EtudiantComplet>({
    data: etudiantsFormates,
    columns: columnsTable,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter: recherche },
    globalFilterFn: (row, columnId, filterValue) => {
      const search = String(filterValue).toLowerCase()
      const student = row.original
      return student.nom.toLowerCase().includes(search) || student.prenom.toLowerCase().includes(search)
    },
  })

  const emailPlaceholder = etudiantSelectionne
    ? `${formatEmailPart(etudiantSelectionne.prenom)}.${formatEmailPart(etudiantSelectionne.nom)}@student.junia.com`
    : ""

  if (authLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    )
  }

  if (!canAccessStudents) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="border-amber-200 bg-amber-50/60 max-w-md w-full mx-auto shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="text-sm text-slate-600 mt-1">
                Votre rôle ne permet pas d&apos;accéder à la gestion des étudiants. Seuls les responsables pédagogiques peuvent consulter cette page.
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
    <main className="p-10 bg-slate-50 min-h-screen space-y-6">
      {/* En-tête de page unifiée contenant le double sélecteur de filtrage */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Étudiants</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registre académique complet et dossiers de scolarité.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {/* Sélecteur de Promotion */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-60 shadow-2xs">
            <GraduationCap className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={promoSelectionnee}
              onChange={(e) => setPromoSelectionnee(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 outline-none w-full cursor-pointer"
            >
              <option value="TOUTES">Toutes les promotions</option>
              {promotionsRaw.map(p => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>

          {/* Sélecteur de Groupe */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-60 shadow-2xs">
            <Layers className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={groupeSelectionne}
              onChange={(e) => handleGroupeSelectionChange(e.target.value)}
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

      {error && (
        <Card className="border-red-200 bg-red-50/50 shadow-xs">
          <CardContent className="py-4 text-sm text-red-700 font-medium">{error}</CardContent>
        </Card>
      )}

      {/* Barre de recherche par saisie textuelle */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher un étudiant par son nom ou prénom..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="pl-10 bg-white border-slate-200 shadow-2xs"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Tableau principal des fiches d'élèves */}
        <Card className="lg:col-span-2 shadow-xs border overflow-hidden h-[500px] flex flex-col bg-white rounded-xl">
          <ScrollArea className="h-full w-full">
            <Table>
              <TableHeader className="bg-slate-50 border-b sticky top-0 z-10 shadow-3xs">
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
                    <TableCell colSpan={columnsTable.length} className="text-center py-20 text-sm text-slate-400 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        Compilation des critères de scolarité…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => {
                    const estSelectionne = etudiantSelectionneId === row.original.id
                    return (
                      <TableRow
                        key={row.id}
                        className={`cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${
                          estSelectionne ? "bg-blue-50/70 hover:bg-blue-50" : "hover:bg-slate-50/80"
                        }`}
                        onClick={() => setEtudiantSelectionneId(row.original.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3.5">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnsTable.length} className="text-center py-20 text-sm text-slate-400 font-medium">
                      Aucun étudiant ne correspond à cette combinaison de critères.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>

        {/* Panneau latéral droit : Dossier complet de l'élève ciblé */}
        <Card className="shadow-xs border h-[500px] flex flex-col bg-white overflow-hidden rounded-xl">
          {etudiantSelectionne ? (
            <div className="p-6 flex flex-col h-full justify-between overflow-y-auto">
              <div className="space-y-5">
                {/* Entête Fiche Élève */}
                <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 gap-1">
                  <Avatar className="h-14 w-14 text-lg border shadow-2xs">
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                      {`${etudiantSelectionne.nom.charAt(0)}${etudiantSelectionne.prenom.charAt(0)}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 capitalize">{`${etudiantSelectionne.prenom} ${etudiantSelectionne.nom}`}</h2>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full inline-block mt-1 border border-blue-100">
                      {etudiantSelectionne.classe}
                    </span>
                  </div>
                </div>

                {/* Métriques et coordonnées de contact */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg border">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-slate-700">{emailPlaceholder}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg border text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Moyenne</p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">
                        {formatAverage(etudiantSelectionne.moyenne)}
                      </p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Suivi</p>
                      <p className={`text-base font-bold mt-0.5 ${etudiantSelectionne.statut === "Risque" ? "text-red-600" : "text-slate-700"}`}>
                        {etudiantSelectionne.statut}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Relevé de notes détaillé */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="h-3.5 w-3.5 text-slate-500" /> Relevé de Notes par Groupe
                  </h3>

                  <ScrollArea className="h-[140px] rounded-lg border bg-slate-50/50 p-2">
                    {detailNotesEtudiant.length > 0 ? (
                      <div className="space-y-2">
                        {detailNotesEtudiant.map((n) => (
                          <div key={n.id} className="flex items-center justify-between p-2 bg-white rounded-md border text-xs shadow-2xs">
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-bold text-slate-800 truncate">{n.nomGroupe}</span>
                              <span className="text-[10px] text-slate-400 truncate">{n.nomExamen}</span>
                            </div>
                            <span className={`font-bold shrink-0 ${n.isAbsent ? "text-red-500 text-[10px]" : "text-slate-700"}`}>
                              {n.noteAffichage}
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
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 gap-2">
              <User className="h-10 w-10 text-slate-300 stroke-[1.5]" />
              <div className="space-y-0.5">
                <p className="font-medium text-sm text-slate-700">Aucun étudiant sélectionné</p>
                <p className="text-xs text-slate-400 max-w-[200px]">Cliquez sur un élève de la liste pour afficher son dossier complet.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
