import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { isAuthenticated, studioSlug, setStudioSlug } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom =
    (location.state as { from?: string } | null)?.from?.trim() || "/";
  const from = rawFrom.startsWith("/login") ? "/" : rawFrom;

  const [slugDraft, setSlugDraft] = useState(studioSlug);

  useEffect(() => {
    setSlugDraft(studioSlug);
  }, [studioSlug]);

  const goAfterAuth = () => {
    navigate(from, { replace: true });
  };

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">SITE INDEX</h1>
          <p className="text-sm text-muted-foreground">
            Iniciá sesión para ver tus proyectos y datos en vivo.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="space-y-2 max-w-md mx-auto">
            <Label htmlFor="login-studio-slug">
              Slug del estudio (header X-Studio-Slug)
            </Label>
            <Input
              id="login-studio-slug"
              value={slugDraft}
              onChange={(e) => setSlugDraft(e.target.value)}
              onBlur={() => setStudioSlug(slugDraft.trim().toLowerCase())}
              placeholder="ej. acme"
              className="font-mono"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <LoginForm studioSlug={slugDraft} onSuccess={goAfterAuth} />
            <RegisterForm onSuccess={goAfterAuth} />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          La app requiere sesión para todas las rutas excepto esta.
        </p>
      </div>
    </div>
  );
}
