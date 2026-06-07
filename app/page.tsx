import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-sm text-center shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-800">Edunova</CardTitle>
          <CardDescription>Bienvenue sur l'application</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Ce lien Next.js simule le bouton de connexion */}
          <Link 
            href="/dashboard" 
            className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Entrer dans le Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}