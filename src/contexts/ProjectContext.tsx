import { useQuery } from '@tanstack/react-query'
import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
    useState,
} from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { qk } from '@/lib/query-keys'

export interface Project {
    id: string
    name: string
}

const EMPTY_PROJECT: Project = { id: '__empty__', name: 'Sin proyectos' }

const LS_ACTIVE = 'siteindex_active_project_id'

interface ProjectContextType {
    activeProject: Project
    setActiveProject: (p: Project) => void
    projects: Project[]
    projectsLoading: boolean
    projectsError: Error | null
}

const ProjectContext = createContext<ProjectContextType | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
    const { accessToken, studioSlug, isQueryReady } = useAuth()

    const {
        data: apiProjects,
        isPending: projectsLoading,
        error: projectsError,
    } = useQuery({
        queryKey: qk.projects,
        queryFn: () =>
            apiFetch<Array<{ id: string; name: string }>>('/v1/projects', {
                token: accessToken,
                studioSlug,
            }),
        enabled: isQueryReady,
    })

    const projects = useMemo<Project[]>(() => {
        if (!apiProjects?.length) return []
        return apiProjects.map((p) => ({ id: p.id, name: p.name }))
    }, [apiProjects])

    const [selectedId, setSelectedId] = useState<string | null>(() =>
        localStorage.getItem(LS_ACTIVE)
    )

    const activeProject = useMemo(() => {
        if (!projects.length) {
            return EMPTY_PROJECT
        }
        const id =
            selectedId && projects.some((p) => p.id === selectedId)
                ? selectedId
                : projects[0].id
        return projects.find((p) => p.id === id) ?? projects[0]
    }, [projects, selectedId])

    const setActiveProjectPersist = (p: Project) => {
        setSelectedId(p.id)
        localStorage.setItem(LS_ACTIVE, p.id)
    }

    return (
        <ProjectContext.Provider
            value={{
                activeProject,
                setActiveProject: setActiveProjectPersist,
                projects,
                projectsLoading,
                projectsError: projectsError as Error | null,
            }}
        >
            {children}
        </ProjectContext.Provider>
    )
}

export function useProject() {
    const ctx = useContext(ProjectContext)
    if (!ctx) throw new Error('useProject must be inside ProjectProvider')
    return ctx
}
