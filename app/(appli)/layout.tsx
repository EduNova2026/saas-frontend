"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
import { AuthProvider } from "@/hooks/useAuth"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-slate-50">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-6">
              <SidebarTrigger className="text-slate-600 hover:text-slate-900" />
              <div className="h-4 w-[1px] bg-slate-200" />
              <span className="font-semibold text-sm text-slate-700">Espace Edunova</span>
            </header>
            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      </SidebarProvider>
    </AuthProvider>
  )
}
