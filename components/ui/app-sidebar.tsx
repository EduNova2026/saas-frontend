import Link from "next/link"
import { LayoutDashboard, Users, Settings, GraduationCap, LogOut } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Étudiants", url: "/students", icon: Users },
  { title: "Paramètres", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-slate-200 bg-white">
      {/* 1. En-tête */}
      <SidebarHeader className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-900">Edunova</span>
            <span className="text-xs text-slate-500">Espace Enseignant</span>
          </div>
        </div>
      </SidebarHeader>

      {/* 2. Menu de navigation corrigé */}
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {/* Le bouton prend le style, mais s'efface au profit du Link */}
              <SidebarMenuButton asChild className="text-slate-600 hover:text-slate-900">
                <Link href={item.url}>
                  {/* On met une balise 'a' classique pour porter le contenu. Next.js adore ça ! */}
                  <span className="flex items-center gap-3 w-full px-3 py-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* 3. Pied de page */}
      <SidebarFooter className="p-4 border-t border-slate-100">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="flex w-full items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 hover:text-red-600 transition-colors">
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}