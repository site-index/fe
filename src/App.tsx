import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectProvider } from "@/contexts/ProjectContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Computos from "@/pages/Computos";
import Certificacion from "@/pages/Certificacion";
import Supuestos from "@/pages/Supuestos";
import Dosificaciones from "@/pages/Dosificaciones";
import Configuracion from "@/pages/Configuracion";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ProjectProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/computos" element={<Computos />} />
              <Route path="/dosificaciones" element={<Dosificaciones />} />
              <Route path="/certificacion" element={<Certificacion />} />
              <Route path="/supuestos" element={<Supuestos />} />
              <Route path="/configuracion" element={<Configuracion />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
