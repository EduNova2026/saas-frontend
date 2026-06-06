"use client"

import { useState, useMemo } from "react"
import { useReactTable, getCoreRowModel, flexRender, ColumnDef, getFilteredRowModel } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Mail, BookOpen, AlertTriangle, CheckCircle, Search, User, ListTodo, GraduationCap } from "lucide-react"

import { columns } from "../dashboard/columns"
import donneesEtudiantsRaw from "@/data/etudiants.json"

type Matiere = "BDD" | "Algo"
type FiltreMatiere = "Tous" | Matiere

interface NoteDetail {
  evaluation: string
  note: number
}

interface MatiereInfo {
  moyenne: number
  scoreRisque: number
  statut: "OK" | "Risque" | "Suivre"
  notes: NoteDetail[]
}

interface EtudiantJson {
  id: string
  nom: string
  prenom: string
  classe: string
  matieres: {
    [key in Matiere]?: MatiereInfo
  }
}

// Structure d'un étudiant unique regroupé pour le tableau
interface EtudiantUnique {
  id: string
  nom: string
  prenom: string
  classe: string
  moyenneGlobale: number
  scoreRisqueMax: number
  statutGlobal: "OK" | "Risque" | "Suivre"
  etudiantComplet: EtudiantJson
}

const etudiantsBase = donneesEtudiantsRaw as EtudiantJson[]

export default function StudentsPage() {
  const [matiereActive, setMatiereActive] = useState<FiltreMatiere>("Tous")
  const [recherche, setRecherche] = useState("")
  const [etudiantSelectionne, setEtudiantSelectionne] = useState<EtudiantUnique | null>(null)

  // 1. Regroupement des étudiants pour n'avoir qu'une seule ligne par personne
  const etudiantsTraites = useMemo(() => {
    return etudiantsBase.map((etudiant) => {
      const matieresInscrites = Object.values(etudiant.matieres) as MatiereInfo[]
      
      // Calcul de la moyenne globale de toutes ses matières
      const moyenneGlobale = matieresInscrites.length > 0
        ? matieresInscrites.reduce((acc, m) => acc + m.moyenne, 0) / matieresInscrites.length
        : 0

      // Récupération du pire score de risque
      const scoreRisqueMax = matieresInscrites.length > 0
        ? Math.max(...matieresInscrites.map((m) => m.scoreRisque))
        : 0

      // Statut global (priorité au Risque, puis Suivre, puis OK)
      let statutGlobal: "OK" | "Risque" | "Suivre" = "OK"
      if (matieresInscrites.some((m) => m.statut === "Risque")) {
        statutGlobal = "Risque"
      } else if (matieresInscrites.some((m) => m.statut === "Suivre")) {
        statutGlobal = "Suivre"
      }

      return {
        id: etudiant.id,
        nom: etudiant.nom,
        prenom: etudiant.prenom,
        classe: etudiant.classe,
        moyenneGlobale,
        scoreRisqueMax,
        statutGlobal,
        etudiantComplet: etudiant
      }
    })
  }, [])

  // 2. Filtrage des lignes selon l'onglet matière sélectionné
  const etudiantsFiltrés = useMemo(() => {
    if (matiereActive === "Tous") return etudiantsTraites
    return etudiantsTraites.filter(e => matiereActive in e.etudiantComplet.matieres)
  }, [etudiantsTraites, matiereActive])

  // 3. Définition des colonnes du tableau
const columnsTable = useMemo<ColumnDef<EtudiantUnique>[]>(() => [
  {
    id: "etudiant",
    header: "ÉTUDIANT",
    cell: ({ row }) => {
      const { nom, prenom, classe, etudiantComplet } = row.original
      const initiales = `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase()
      const matieres = Object.keys(etudiantComplet.matieres).join(", ")
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-slate-200 text-slate-700 font-semibold text-xs">{initiales}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-slate-900">{`${nom} ${prenom}`}</span>
            <span className="text-xs text-slate-500">{classe} • <span className="text-slate-400 italic">{matieres}</span></span>
          </div>
        </div>
      )
    },
  },
  {
    id: "moyenne",
    header: () => <span>{matiereActive === "Tous" ? "MOY. GÉNÉRALE" : "MOYENNE"}</span>,
    cell: ({ row }) => {
      const moyenne = matiereActive === "Tous" 
        ? row.original.moyenneGlobale 
        : row.original.etudiantComplet.matieres[matiereActive]?.moyenne || 0
        
      const colorClass = moyenne < 10 ? "text-red-600" : moyenne < 12 ? "text-amber-600" : "text-emerald-600"
      return <span className={`font-bold ${colorClass}`}>{moyenne.toFixed(1)} / 20</span>
    },
  },
  {
    id: "scoreRisque",
    header: "RISQUE",
    cell: ({ row }) => {
      const risque = matiereActive === "Tous"
        ? row.original.scoreRisqueMax
        : row.original.etudiantComplet.matieres[matiereActive]?.scoreRisque || 0
      return <span className="font-medium text-slate-700">{risque}%</span>
    },
  },
  {
    id: "statut",
    header: "STATUT",
    cell: ({ row }) => {
      const statut = matiereActive === "Tous"
        ? row.original.statutGlobal
        : row.original.etudiantComplet.matieres[matiereActive]?.statut || "OK"

      const styles = {
        OK: "bg-emerald-100 text-emerald-800 border-emerald-300",
        Risque: "bg-red-100 text-red-800 border-red-300",
        Suivre: "bg-amber-100 text-amber-800 border-amber-300"
      }
      return (
        <Badge variant="outline" className={`${styles[statut]} font-medium rounded-md text-[11px] px-2 py-0`}>
          {statut === "OK" ? "Stable" : statut === "Risque" ? "Danger" : "Suivre"}
        </Badge>
      )
    },
  },
], [matiereActive])

  const table = useReactTable<EtudiantUnique>({
    data: etudiantsFiltrés,
    columns: columnsTable,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: recherche,
    },
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      const student = row.original
      return student.nom.toLowerCase().includes(search) || student.prenom.toLowerCase().includes(search)
    },
  })

  return (
    <main className="p-10 bg-slate-50 min-h-screen space-y-6">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Étudiants</h1>
          <p className="text-sm text-slate-500">Un profil unique par étudiant, fiches d'évaluations complètes.</p>
        </div>

        <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm self-start">
          {(["Tous", "BDD", "Algo"] as FiltreMatiere[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMatiereActive(m)
                setEtudiantSelectionne(null) // Reset la sélection pour synchroniser les données
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                matiereActive === m ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {m === "Tous" ? "Tous" : m === "BDD" ? "Base de données" : "Algorithmique"}
            </button>
          ))}
        </div>
      </div>

      {/* Barre de Recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher un étudiant par son nom ou prénom..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="pl-10 bg-white border-slate-200"
        />
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* TABLEAU */}
        <Card className="lg:col-span-2 shadow-sm border overflow-hidden h-[500px] flex flex-col">
          <ScrollArea className="h-full w-full">
            <Table>
              <TableHeader className="bg-slate-50 border-b sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => {
                    const estSelectionne = etudiantSelectionne?.id === row.original.id
                    return (
                      <TableRow 
                        key={row.id} 
                        className={`cursor-pointer transition-colors border-b last:border-0 ${
                          estSelectionne ? "bg-blue-50/70 hover:bg-blue-50" : "hover:bg-slate-50/80"
                        }`}
                        onClick={() => setEtudiantSelectionne(row.original)}
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
                    <TableCell colSpan={columnsTable.length} className="text-center py-10 text-sm text-slate-500">
                      Aucun étudiant trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>

        {/* FICHE PROFIL AVEC TOUTES LES NOTES ET MOYENNE GÉNÉRALE */}
        <Card className="shadow-sm border h-[500px] flex flex-col bg-white">
          {etudiantSelectionne ? (
            <div className="p-6 flex flex-col h-full justify-between overflow-y-auto">
              
              <div className="space-y-4">
                {/* En-tête profil */}
                <div className="flex flex-col items-center text-center pb-3 border-b border-slate-100 gap-1">
                  <Avatar className="h-12 w-12 text-base">
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                      {`${etudiantSelectionne.nom.charAt(0)}${etudiantSelectionne.prenom.charAt(0)}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{`${etudiantSelectionne.prenom} ${etudiantSelectionne.nom}`}</h2>
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      {etudiantSelectionne.classe}
                    </span>
                  </div>
                </div>

                {/* Email + Moyenne Générale */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{`${etudiantSelectionne.prenom.toLowerCase()}.${etudiantSelectionne.nom.toLowerCase()}@univ-edunova.fr`}</span>
                  </div>
                  
                  {/* AJOUT : Ligne Moyenne Générale Globale */}
                  <div className="flex items-center gap-2 text-slate-800 bg-blue-50/50 p-2 rounded border border-blue-100/50">
                    <GraduationCap className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Moyenne Générale : <strong className="text-blue-700">{etudiantSelectionne.moyenneGlobale.toFixed(1)} / 20</strong></span>
                  </div>
                </div>

                {/* HISTORIQUE DES NOTES */}
                <div className="space-y-2 pt-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="h-3.5 w-3.5" /> Relevé de notes
                  </h3>
                  
                  <ScrollArea className="h-[150px] pr-2">
                    <div className="space-y-3">
                      {Object.entries(etudiantSelectionne.etudiantComplet.matieres)
                        // On filtre les blocs de notes si un onglet matière précis est actif
                        .filter(([nomMatiere]) => matiereActive === "Tous" || nomMatiere === matiereActive)
                        .map(([nomMatiere, infoMatiere]) => (
                          <div key={nomMatiere} className="space-y-1.5 border-l-2 border-slate-200 pl-3 py-0.5">
                            <div className="flex justify-between items-center text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                              <span>{nomMatiere}</span>
                              <span className="text-slate-500 normal-case">Moy: {infoMatiere?.moyenne.toFixed(1)}/20</span>
                            </div>
                            
                            {infoMatiere?.notes.map((noteObj, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                                <span className="text-slate-600 truncate max-w-[130px]">{noteObj.evaluation}</span>
                                <span className={`font-bold ${noteObj.note < 10 ? "text-red-600" : "text-slate-900"}`}>{noteObj.note.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Alerte Risque */}
              {(() => {
                const risque = matiereActive === "Tous" ? etudiantSelectionne.scoreRisqueMax : etudiantSelectionne.etudiantComplet.matieres[matiereActive]?.scoreRisque || 0
                return (
                  <div className={`p-3 rounded-lg border flex gap-2.5 mt-2 ${
                    risque >= 50 ? "bg-red-50/50 border-red-100 text-red-800" : "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                  }`}>
                    {risque >= 50 ? (
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs">{risque >= 50 ? "Suivi urgent" : "Profil stable"}</span>
                      <span className="text-[11px] opacity-90 leading-tight">
                        Risque {matiereActive !== "Tous" ? `en ${matiereActive}` : "maximal"} : {risque}%.
                      </span>
                    </div>
                  </div>
                )
              })()}

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 gap-2">
              <User className="h-10 w-10 text-slate-300 stroke-[1.5]" />
              <div className="space-y-0.5">
                <p className="font-medium text-sm text-slate-700">Aucun étudiant sélectionné</p>
                <p className="text-xs text-slate-400 max-w-[200px]">Sélectionnez un élève pour afficher son dossier complet.</p>
              </div>
            </div>
          )}
        </Card>

      </div>
    </main>
  )
}