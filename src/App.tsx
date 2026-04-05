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
import { ScopeProvider } from '@/contexts/ScopeContext'

const BudgetLines = lazy(() => import('@/pages/budget-lines'))
const BudgetLineYieldEditor = lazy(
    () => import('@/pages/BudgetLineYieldEditor')
)
const SettingsPage = lazy(() => import('@/pages/Settings'))
const Login = lazy(() => import('@/pages/Login'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const QUERY_STALE_MINUTES = 2
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime:
                QUERY_STALE_MINUTES *
                SECONDS_PER_MINUTE *
                MILLISECONDS_PER_SECOND,
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
                                            <ScopeProvider>
                                                <ProjectProvider>
                                                    <AppLayout />
                                                </ProjectProvider>
                                            </ScopeProvider>
                                        }
                                    >
                                        <Route
                                            path="/"
                                            element={<BudgetLines />}
                                        />
                                        <Route
                                            path="/budget-lines"
                                            element={<BudgetLines />}
                                        />
                                        <Route
                                            path="/budget-lines/:budgetLineId/yield"
                                            element={<BudgetLineYieldEditor />}
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
