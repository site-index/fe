import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";

const LS_TOKEN = "siteindex_access_token";
const LS_SLUG = "siteindex_studio_slug";

type AuthContextValue = {
  accessToken: string | null;
  studioSlug: string;
  setStudioSlug: (slug: string) => void;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    studioSlugOverride?: string
  ) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    studioSlug: string;
    studioName: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(LS_TOKEN)
  );
  const [studioSlug, setStudioSlugState] = useState(() => {
    const fromLs = localStorage.getItem(LS_SLUG);
    if (fromLs) return fromLs;
    return import.meta.env.VITE_STUDIO_SLUG?.trim() ?? "";
  });

  useEffect(() => {
    const s = studioSlug.trim().toLowerCase();
    if (s) localStorage.setItem(LS_SLUG, s);
    else localStorage.removeItem(LS_SLUG);
  }, [studioSlug]);

  const setStudioSlug = useCallback((slug: string) => {
    setStudioSlugState(slug.trim().toLowerCase());
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      studioSlugOverride?: string
    ) => {
      const slug = (studioSlugOverride ?? studioSlug).trim().toLowerCase();
      if (!slug) {
        throw new Error("Definí el slug del estudio antes de iniciar sesión.");
      }
      setStudioSlugState(slug);
      localStorage.setItem(LS_SLUG, slug);
      const res = await apiFetch<{ accessToken: string }>("/v1/auth/login", {
        method: "POST",
        body: { email, password },
        studioSlug: slug,
      });
      setAccessToken(res.accessToken);
      localStorage.setItem(LS_TOKEN, res.accessToken);
    },
    [studioSlug]
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      studioSlug: string;
      studioName: string;
    }) => {
      const res = await apiFetch<{
        accessToken: string;
        studio: { slug: string };
      }>("/v1/auth/register", {
        method: "POST",
        body: payload,
      });
      const slug = res.studio.slug;
      setStudioSlugState(slug);
      localStorage.setItem(LS_SLUG, slug);
      setAccessToken(res.accessToken);
      localStorage.setItem(LS_TOKEN, res.accessToken);
    },
    []
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem(LS_TOKEN);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      studioSlug,
      setStudioSlug,
      isAuthenticated: Boolean(accessToken),
      login,
      register,
      logout,
    }),
    [accessToken, studioSlug, setStudioSlug, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
