"use client"

import { useEffect, useMemo, useState } from "react"
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getEtudiants, EtudiantOut } from "@/lib/api/scolarite"
import { useAuth } from "@/hooks/useAuth"
import { ShieldAlert } from "lucide-react"

const chartConfig = {
  moyenneGenerale: { label: "Moyenne", color: "#2563eb" },
} satisfies ChartConfig

const donneesGraphique = [
  { mois: "Janvier", moyenneGenerale: 0 },
  { mois: "Février", moyenneGenerale: 0 },
  { mois: "Mars", moyenneGenerale: 0 },
  { mois: "Avril", moyenneGenerale: 0 },
]

export default function DashboardPage() {
  const [etudiants, setEtudiants] = useState<EtudiantOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { hasRole, loading: authLoading } = useAuth()

  useEffect(() => {
    let actif = true

    async function chargerEtudiants() {
      try {
        setLoading(true)
        setError(null)
        const response = await getEtudiants()

        if (actif) {
          setEtudiants(response.items ?? [])
        }
      } catch {
        if (actif) {
          setError("Impossible de charger les étudiants.")
        }
      } finally {
        if (actif) {
          setLoading(false)
        }
      }
    }

    chargerEtudiants()

    return () => {
      actif = false
    }
  }, [])

  const columns = useMemo<ColumnDef<EtudiantOut>[]>(() => [
    {
      id: "etudiant",
      header: "ÉTUDIANT",
      cell: ({ row }) => {
        const { nom, prenom, promotion_id } = row.original

        return (
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-slate-900">{`${nom} ${prenom}`}</span>
            <span className="text-xs text-muted-foreground">Promotion : {promotion_id}</span>
          </div>
        )
      },
    },
    {
      id: "moyenne",
      header: "MOYENNE",
      cell: () => <span className="font-bold text-slate-500">N/A</span>,
    },
    {
      id: "derniereNote",
      header: "DERNIÈRE NOTE",
      cell: () => <span className="text-slate-500 text-sm">—</span>,
    },
    {
      id: "scoreRisque",
      header: "SCORE RISQUE",
      cell: () => <span className="text-slate-500 text-sm">—</span>,
    },
    {
      id: "statut",
      header: "STATUT",
      cell: () => <span className="text-slate-500 text-sm">—</span>,
    },
  ], [])

  const table = useReactTable<EtudiantOut>({
    data: etudiants,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (authLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-500 text-sm">Chargement…</p>
      </main>
    )
  }

  if (!hasRole("responsable_pedagogique")) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="border-amber-200 bg-amber-50/60 max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="text-sm text-slate-600 mt-1">
                Votre rôle ne permet pas d'accéder au dashboard. Seuls les responsables pédagogiques peuvent consulter cette page.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="p-10 bg-slate-50 min-h-screen space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Responsable</h1>
          <p className="text-sm text-slate-500">Données issues du backend scolarité.</p>
        </div>
      </div>

      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Étudiants inscrits</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">{loading ? "…" : (etudiants ?? []).length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Moyenne de classe</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">N/A</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Étudiants à risque</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2 text-red-500">—</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-10 text-sm text-slate-500">
                      Chargement des étudiants…
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="border-b last:border-0">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-10 text-sm text-slate-500">
                      Aucun étudiant trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <Card className="shadow-sm border h-[365px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle>Évolution de la Moyenne</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0 relative">
            <ChartContainer config={chartConfig} className="h-full w-full opacity-30">
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
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="rounded-lg bg-white/90 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm border">
                Données d'évaluation indisponibles
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
