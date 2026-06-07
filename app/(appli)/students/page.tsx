"use client"

import { useEffect, useMemo, useState } from "react"
import { useReactTable, getCoreRowModel, flexRender, ColumnDef, getFilteredRowModel } from "@tanstack/react-table"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Mail, Search, User, ListTodo, GraduationCap, Loader2, ShieldAlert } from "lucide-react"
import { getEtudiants, EtudiantOut } from "@/lib/api/scolarite"
import { useAuth } from "@/hooks/useAuth"

const formatEmailPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "")

export default function StudentsPage() {
  const [etudiants, setEtudiants] = useState<EtudiantOut[]>([])
  const [recherche, setRecherche] = useState("")
  const [etudiantSelectionne, setEtudiantSelectionne] = useState<EtudiantOut | null>(null)
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

  useEffect(() => {
    if (etudiantSelectionne && !etudiants.some((etudiant) => etudiant.id === etudiantSelectionne.id)) {
      setEtudiantSelectionne(null)
    }
  }, [etudiants, etudiantSelectionne])

  const columnsTable = useMemo<ColumnDef<EtudiantOut>[]>(() => [
    {
      id: "etudiant",
      header: "ÉTUDIANT",
      cell: ({ row }) => {
        const { nom, prenom, promotion_id } = row.original
        const initiales = `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase()

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-slate-200 text-slate-700 font-semibold text-xs">{initiales}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-slate-900">{`${nom} ${prenom}`}</span>
              <span className="text-xs text-slate-500">Promotion : {promotion_id}</span>
            </div>
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
      id: "risque",
      header: "RISQUE",
      cell: () => <span className="font-medium text-slate-500">—</span>,
    },
    {
      id: "statut",
      header: "STATUT",
      cell: () => <span className="font-medium text-slate-500">—</span>,
    },
  ], [])

  const table = useReactTable<EtudiantOut>({
    data: etudiants,
    columns: columnsTable,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: recherche,
    },
    globalFilterFn: (row, columnId, filterValue) => {
      const search = String(filterValue).toLowerCase()
      const student = row.original
      return student.nom.toLowerCase().includes(search) || student.prenom.toLowerCase().includes(search)
    },
  })

  const emailPlaceholder = etudiantSelectionne
    ? `${formatEmailPart(etudiantSelectionne.prenom)}.${formatEmailPart(etudiantSelectionne.nom)}@univ-edunova.fr`
    : ""

  return (
    <main className="p-10 bg-slate-50 min-h-screen space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Étudiants</h1>
          <p className="text-sm text-slate-500">Un profil unique par étudiant, données d'évaluation à venir.</p>
        </div>
      </div>

      {authLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-500 text-sm">Chargement…</p>
        </div>
      ) : !hasRole("responsable_pedagogique") ? (
        <Card className="border-amber-200 bg-amber-50/60 max-w-md mx-auto">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Accès non autorisé</h2>
              <p className="text-sm text-slate-600 mt-1">
                Votre rôle ne permet pas d'accéder à la gestion des étudiants. Seuls les responsables pédagogiques peuvent consulter cette page.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
      {error ? (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher un étudiant par son nom ou prénom..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="pl-10 bg-white border-slate-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columnsTable.length} className="text-center py-10 text-sm text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement des étudiants…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length > 0 ? (
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

        <Card className="shadow-sm border h-[500px] flex flex-col bg-white">
          {etudiantSelectionne ? (
            <div className="p-6 flex flex-col h-full justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center pb-3 border-b border-slate-100 gap-1">
                  <Avatar className="h-12 w-12 text-base">
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                      {`${etudiantSelectionne.nom.charAt(0)}${etudiantSelectionne.prenom.charAt(0)}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{`${etudiantSelectionne.prenom} ${etudiantSelectionne.nom}`}</h2>
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      Promotion : {etudiantSelectionne.promotion_id}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{emailPlaceholder}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-800 bg-blue-50/50 p-2 rounded border border-blue-100/50">
                    <GraduationCap className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Données d'évaluation à venir</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="h-3.5 w-3.5" /> Relevé de notes
                  </h3>

                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-xs text-slate-500">
                    Les notes, moyennes et indicateurs de risque ne sont pas encore disponibles depuis le backend.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border flex gap-2.5 mt-2 bg-slate-50/80 border-slate-100 text-slate-600">
                <GraduationCap className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs">Données d'évaluation à venir</span>
                  <span className="text-[11px] opacity-90 leading-tight">
                    Le backend fournit actuellement l'identité de l'étudiant et sa promotion.
                  </span>
                </div>
              </div>
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
        </>
      )}
    </main>
  )
}
