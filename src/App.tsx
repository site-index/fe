import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import AppLayout from '@/components/AppLayout'
import ErrorBoundary from '@/components/ErrorBoundary'
import OfflineStatusIndicator from '@/components/OfflineStatusIndicator'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PwaUpdateBanner } from '@/components/PwaUpdateBanner'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProjectProvider } from '@/contexts/ProjectContext'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const BudgetLines = lazy(() => import('@/pages/BudgetLines'))
const ResourceDemand = lazy(() => import('@/pages/ResourceDemand'))
const ItemYields = lazy(() => import('@/pages/ItemYields'))
const StudioCatalogItems = lazy(() => import('@/pages/StudioCatalogItems'))
const Certification = lazy(() => import('@/pages/Certification'))
const Assumptions = lazy(() => import('@/pages/Assumptions'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const Login = lazy(() => import('@/pages/Login'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 2 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

function PageLoader() {
    return (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Cargando…
        </div>
    )
}

const App = () => (
    <ErrorBoundary>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="site-index-theme"
        >
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <Sonner />
                    <OfflineStatusIndicator />
                    <PwaUpdateBanner />
                    <BrowserRouter>
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route element={<ProtectedRoute />}>
                                    <Route
                                        element={
                                            <ProjectProvider>
                                                <AppLayout />
                                            </ProjectProvider>
                                        }
                                    >
                                        <Route
                                            path="/"
                                            element={<Dashboard />}
                                        />
                                        <Route
                                            path="/budget-lines"
                                            element={<BudgetLines />}
                                        />
                                        <Route
                                            path="/resource-demand"
                                            element={<ResourceDemand />}
                                        />
                                        <Route
                                            path="/item-yields"
                                            element={<ItemYields />}
                                        />
                                        <Route
                                            path="/studio-catalog-items"
                                            element={<StudioCatalogItems />}
                                        />
                                        <Route
                                            path="/certifications"
                                            element={<Certification />}
                                        />
                                        <Route
                                            path="/assumptions"
                                            element={<Assumptions />}
                                        />
                                        <Route
                                            path="/settings"
                                            element={<SettingsPage />}
                                        />
                                    </Route>
                                </Route>
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </Suspense>
                    </BrowserRouter>
                </AuthProvider>
            </QueryClientProvider>
        </ThemeProvider>
    </ErrorBoundary>
)

export default App
