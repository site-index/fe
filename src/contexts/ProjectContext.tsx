import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export interface Project {
  id: string;
  name: string;
}

/** Demo projects when not authenticated (dashboard mock data targets these ids). */
export const PROJECTS: Project[] = [
  { id: "torre-belgrano", name: "Torre Belgrano 2024" },
  { id: "nordelta-ph3", name: "Complejo Nordelta Ph3" },
];

const EMPTY_PROJECT: Project = { id: "__empty__", name: "Sin proyectos" };

export type ProjectsSource = "api" | "demo";

const LS_ACTIVE = "siteindex_active_project_id";

interface ProjectContextType {
  activeProject: Project;
  setActiveProject: (p: Project) => void;
  projects: Project[];
  projectsSource: ProjectsSource;
  projectsLoading: boolean;
  projectsError: Error | null;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { accessToken, studioSlug, isAuthenticated } = useAuth();

  const {
    data: apiProjects,
    isPending: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["projects", accessToken, studioSlug],
    queryFn: () =>
      apiFetch<Array<{ id: string; name: string }>>("/v1/projects", {
        token: accessToken,
        studioSlug,
      }),
    enabled: Boolean(isAuthenticated && accessToken && studioSlug.trim()),
  });

  const projects = useMemo<Project[]>(() => {
    if (!isAuthenticated) {
      return PROJECTS;
    }
    if (apiProjects?.length) {
      return apiProjects.map((p) => ({ id: p.id, name: p.name }));
    }
    return [];
  }, [apiProjects, isAuthenticated]);

  const projectsSource: ProjectsSource = isAuthenticated ? "api" : "demo";

  const [selectedId, setSelectedId] = useState<string | null>(() =>
    localStorage.getItem(LS_ACTIVE)
  );

  const activeProject = useMemo(() => {
    if (!projects.length) {
      return isAuthenticated ? EMPTY_PROJECT : PROJECTS[0];
    }
    const id =
      selectedId && projects.some((p) => p.id === selectedId)
        ? selectedId
        : projects[0].id;
    return projects.find((p) => p.id === id) ?? projects[0];
  }, [projects, selectedId, isAuthenticated]);

  const setActiveProjectPersist = (p: Project) => {
    setSelectedId(p.id);
    localStorage.setItem(LS_ACTIVE, p.id);
  };

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        setActiveProject: setActiveProjectPersist,
        projects,
        projectsSource,
        projectsLoading,
        projectsError: projectsError as Error | null,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be inside ProjectProvider");
  return ctx;
}
