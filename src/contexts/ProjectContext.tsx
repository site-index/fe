import { createContext, useContext, useState, ReactNode } from "react";

export interface Project {
  id: string;
  name: string;
}

export const PROJECTS: Project[] = [
  { id: "torre-belgrano", name: "Torre Belgrano 2024" },
  { id: "nordelta-ph3", name: "Complejo Nordelta Ph3" },
];

interface ProjectContextType {
  activeProject: Project;
  setActiveProject: (p: Project) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState(PROJECTS[0]);
  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be inside ProjectProvider");
  return ctx;
}
