import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import AppLayout from '@/components/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProjectProvider } from '@/contexts/ProjectContext'
import Assumptions from '@/pages/Assumptions'
import BudgetLines from '@/pages/BudgetLines'
import Certification from '@/pages/Certification'
import Dashboard from '@/pages/Dashboard'
import ItemYields from '@/pages/ItemYields'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import SettingsPage from '@/pages/Settings'

const queryClient = new QueryClient()

const App = () => (
    <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="site-index-theme"
    >
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <AuthProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter
                        future={{
                            v7_startTransition: true,
                            v7_relativeSplatPath: true,
                        }}
                    >
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
                                    <Route path="/" element={<Dashboard />} />
                                    <Route
                                        path="/budget-lines"
                                        element={<BudgetLines />}
                                    />
                                    <Route
                                        path="/item-yields"
                                        element={<ItemYields />}
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
                    </BrowserRouter>
                </AuthProvider>
            </TooltipProvider>
        </QueryClientProvider>
    </ThemeProvider>
)

export default App
