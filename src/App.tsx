import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Computos from "@/pages/Computos";
import Certificacion from "@/pages/Certificacion";
import Supuestos from "@/pages/Supuestos";
import Dosificaciones from "@/pages/Dosificaciones";
import SettingsPage from "@/pages/Settings";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
                <Route path="/computos" element={<Computos />} />
                <Route path="/dosificaciones" element={<Dosificaciones />} />
                <Route path="/certificacion" element={<Certificacion />} />
                <Route path="/supuestos" element={<Supuestos />} />
                <Route path="/configuracion" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
