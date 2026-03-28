import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { useIsMobile } from '@/hooks/use-mobile'

import AppSidebar from './AppSidebar'
import SidebarContent from './SidebarContent'
import SiteLogo from './SiteLogo'
import { Sheet, SheetContent, SheetTitle } from './ui/sheet'

export default function AppLayout() {
    const isMobile = useIsMobile()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex min-h-screen">
            {/* Desktop sidebar */}
            <AppSidebar />

            <div className="flex-1 md:ml-60 flex flex-col">
                {/* Mobile header */}
                {isMobile && (
                    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Abrir menú"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <SiteLogo invertOnDark className="h-8 w-auto" />
                    </header>
                )}

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
                    <Outlet />
                </main>
            </div>

            {/* Mobile drawer */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent
                    side="left"
                    className="w-60 p-0 bg-sidebar border-sidebar-border"
                >
                    <SheetTitle className="sr-only">
                        Menú de navegación
                    </SheetTitle>
                    <SidebarContent onNavigate={() => setSidebarOpen(false)} />
                </SheetContent>
            </Sheet>
        </div>
    )
}
