import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        {/* Ta sidebar fixe ou repliable */}
        <AppSidebar />
        
        {/* Zone de contenu principal */}
        <div className="flex-1 flex flex-col">
          
          {/* BARRE SUPÉRIEURE (HEADER) : Parfaite pour caler le bouton de pliage */}
          <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-6">
            {/* Ce bouton gère tout le travail de pliage automatiquement avec l'animation */}
            <SidebarTrigger className="text-slate-600 hover:text-slate-900" />
            
            <div className="h-4 w-[1px] bg-slate-200" /> {/* Petit séparateur visuel */}
            <span className="font-semibold text-sm text-slate-700">Espace Enseignant</span>
          </header>
          
          {/* Les pages du dashboard viennent se glisser ici */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}