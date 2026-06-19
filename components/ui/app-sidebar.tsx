"use client";

import Link from "next/link"
import { LayoutDashboard, Users, GraduationCap, LogOut, UserRound, BookOpen, School, Shield } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"
import { logout } from "@/lib/api/auth"
import { useMemo } from "react"

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const allNavItems: NavItem[] = [
  { title: "Mon profil", url: "/profile", icon: UserRound },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["responsable_pedagogique"] },
  { title: "Étudiants", url: "/students", icon: Users, roles: ["responsable_pedagogique", "admin_pedagogique"] },
  { title: "Promotions", url: "/promotions", icon: GraduationCap, roles: ["admin_pedagogique"] },
  { title: "Mes groupes", url: "/mes-groupes", icon: BookOpen, roles: ["enseignant"] },
  { title: "Mes promotions", url: "/mes-promotions", icon: School, roles: ["responsable_pedagogique"] },
  { title: "Utilisateurs", url: "/admin/utilisateurs", icon: Shield, roles: ["admin_pedagogique"] },
]

function roleLabel(roles: string[]): string {
  if (roles.includes("responsable_pedagogique")) return "Espace Responsable"
  if (roles.includes("enseignant")) return "Espace Enseignant"
  return "Espace Edunova"
}

export function AppSidebar() {
  const { user, hasRole } = useAuth()

  const navigationItems = useMemo(
    () => allNavItems.filter((item) => !item.roles || item.roles.some((r) => hasRole(r))),
    [hasRole]
  )

  const label = user?.roles?.length ? roleLabel(user.roles) : "Espace Edunova"

  return (
    <Sidebar className="border-r border-slate-200 bg-white">
      <SidebarHeader className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-900">Edunova</span>
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild className="text-slate-600 hover:text-slate-900">
                <Link href={item.url}>
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

      <SidebarFooter className="p-4 border-t border-slate-100">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              className="flex w-full items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
