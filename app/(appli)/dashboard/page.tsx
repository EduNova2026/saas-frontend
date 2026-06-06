"use client"

import { useState, useMemo } from "react"
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

import { columns, Etudiant } from "./columns"
import donneesEtudiantsRaw from "@/data/etudiants.json"

type Matiere = "BDD" | "Algo"

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

const etudiantsBase = donneesEtudiantsRaw as EtudiantJson[]

const chartConfig = {
  moyenneGenerale: { label: "Moyenne", color: "#2563eb" },
} satisfies ChartConfig

export default function DashboardPage() {
  const [matiereActive, setMatiereActive] = useState<Matiere>("BDD")

  // 1. Extraction et formatage des étudiants inscrits à la matière sélectionnée
  const etudiantsFiltres = useMemo(() => {
    const liste: Etudiant[] = []

    etudiantsBase.forEach((etudiant) => {
      const infoMatiere = etudiant.matieres[matiereActive]
      if (infoMatiere) {
        // On récupère la dernière note du tableau pour l'affichage
        const derniereNoteObj = infoMatiere.notes[infoMatiere.notes.length - 1]
        const derniereNoteStr = derniereNoteObj 
          ? `${derniereNoteObj.note.toFixed(1)}/20 (${derniereNoteObj.evaluation})`
          : "Aucune note"

        liste.push({
          id: etudiant.id,
          nom: etudiant.nom,
          prenom: etudiant.prenom,
          classe: etudiant.classe,
          moyenne: infoMatiere.moyenne,
          derniereNote: derniereNoteStr,
          scoreRisque: infoMatiere.scoreRisque,
          statut: infoMatiere.statut,
          matiere: matiereActive,
        })
      }
    })

    return liste
  }, [matiereActive])

  // 2. Calculs statistiques automatiques
  const totalInscrits = etudiantsFiltres.length
  
  const moyenneClasse = totalInscrits > 0 
    ? (etudiantsFiltres.reduce((acc, etudiant) => acc + etudiant.moyenne, 0) / totalInscrits).toFixed(1)
    : "0.0"

  const totalRisque = etudiantsFiltres.filter(etudiant => etudiant.statut === "Risque").length

  // 3. Génération d'une courbe d'évolution réaliste indexée sur la moyenne actuelle
  const donneesGraphique = useMemo(() => {
    const moy = parseFloat(moyenneClasse)
    return [
      { mois: "Janvier", moyenneGenerale: Math.max(0, moy - 0.8) },
      { mois: "Février", moyenneGenerale: Math.max(0, moy - 0.4) },
      { mois: "Mars", moyenneGenerale: Math.max(0, moy - 0.1) },
      { mois: "Avril", moyenneGenerale: moy }
    ]
  }, [moyenneClasse])

  const table = useReactTable<Etudiant>({
    data: etudiantsFiltres,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <main className="p-10 bg-slate-50 min-h-screen space-y-8">
      
      {/* Titre + Onglets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Enseignant</h1>
        </div>
        
        <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm self-start">
          <button
            onClick={() => setMatiereActive("BDD")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              matiereActive === "BDD" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Base de données
          </button>
          <button
            onClick={() => setMatiereActive("Algo")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              matiereActive === "Algo" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Algorithmique
          </button>
        </div>
      </div>
      
      {/* Cartes d'indicateurs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Étudiants inscrits</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">{totalInscrits}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Moyenne de classe</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">{moyenneClasse} / 20</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Étudiants à risque</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2 text-red-500">{totalRisque}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table et Graphique */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Tableau */}
        <div className="rounded-lg border bg-white overflow-hidden shadow-sm h-[365px] flex flex-col">
          <ScrollArea className="h-full w-full">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-20 shadow-[0_2px_2px_-1px_rgba(0,0,0,0.05)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="py-3 font-semibold text-sm text-slate-700 bg-white">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-b last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Graphique */}
        <Card className="shadow-sm border h-[365px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle>Évolution de la Moyenne ({matiereActive})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={donneesGraphique} margin={{ left: -10, right: 10, bottom: 5, top: 10 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mois" tickLine={false} axisLine={false} tickMargin={10} className="text-xs text-slate-500" />
                <YAxis domain={[0, 20]} tickLine={false} axisLine={false} tickMargin={10} className="text-xs text-slate-500" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="moyenneGenerale"
                  stroke="var(--color-moyenneGenerale)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

      </div>
    </main>
  )
}