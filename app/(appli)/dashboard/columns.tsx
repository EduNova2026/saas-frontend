import { ColumnDef } from "@tanstack/react-table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Structure globale d'un étudiant partagée dans l'app
export type Etudiant = {
  id: string
  nom: string
  prenom: string
  classe: string
  moyenne: number
  derniereNote: string
  scoreRisque: number | null
  statut: "Non évalué" | "OK" | "Suivre" | "Risque"
  matiere: string
}

// Configuration des colonnes du tableau
export const columns: ColumnDef<Etudiant>[] = [
  {
    id: "etudiant",
    header: "ÉTUDIANT",
    cell: ({ row }) => {
      const { nom, prenom, classe } = row.original
      const initiales = `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase()

      return (
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-slate-900">{`${nom} ${prenom}`}</span>
            <span className="text-xs text-muted-foreground">{classe}</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "moyenne",
    header: "MOYENNE",
    cell: ({ row }) => {
      const moyenne = row.original.moyenne
      const colorClass = moyenne < 10 ? "text-red-600" : moyenne < 12 ? "text-amber-600" : "text-emerald-600"
      return <span className={`font-bold ${colorClass}`}>{moyenne.toFixed(1)}</span>
    },
  },
  {
    accessorKey: "derniereNote",
    header: "DERNIÈRE NOTE",
    cell: ({ row }) => <span className="text-slate-600 text-sm">{row.original.derniereNote}</span>,
  },
  {
    id: "scoreRisque",
    header: "SCORE RISQUE",
    cell: ({ row }) => {
      const score = row.original.scoreRisque
      if (score === null) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-slate-50 text-slate-500 border-slate-200">—</span>
      }

      let label = "Faible"
      let bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200"

      if (score >= 70) {
        label = "Élevé"
        bgClass = "bg-red-50 text-red-700 border-red-200"
      } else if (score >= 40) {
        label = "Moyen"
        bgClass = "bg-amber-50 text-amber-700 border-amber-200"
      }

      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${bgClass}`}>
          {label} · {score}
        </span>
      )
    },
  },
  {
    accessorKey: "statut",
    header: "STATUT",
    cell: ({ row }) => {
      const statut = row.original.statut
      
      const styles = {
        OK: "bg-emerald-100 text-emerald-800 border-emerald-300",
        Risque: "bg-red-100 text-red-800 border-red-300",
        Suivre: "bg-amber-100 text-amber-800 border-amber-300",
        "Non évalué": "bg-slate-100 text-slate-600 border-slate-300",
      }

      const labels = {
        OK: "✓ OK",
        Risque: "⚠ Risque",
        Suivre: "~ Suivre",
        "Non évalué": "— N/E",
      }

      return (
        <Badge variant="outline" className={`${styles[statut]} font-medium rounded-md px-2 py-0.5`}>
          {labels[statut]}
        </Badge>
      )
    },
  },
]