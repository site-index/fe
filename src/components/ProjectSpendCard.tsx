import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Wallet } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch, getApiErrorMessage } from '@/lib/api'

type ProjectDetail = {
    id: string
    name: string
    defaultCurrency: string
    actualSpendToDate: string | number
}

type Props = {
    projectId: string
    projectName: string
    accessToken: string | null
    studioSlug: string
    enabled: boolean
}

/** Declared actual spend vs aggregated budget lines total. */
export function ProjectSpendCard({
    projectId,
    projectName,
    accessToken,
    studioSlug,
    enabled,
}: Props) {
    const queryClient = useQueryClient()
    const inputRef = useRef<HTMLInputElement>(null)

    const { data: projectDetail, error: projectError } = useQuery({
        queryKey: ['project-detail', projectId, accessToken, studioSlug],
        queryFn: () =>
            apiFetch<ProjectDetail>(`/v1/projects/${projectId}`, {
                token: accessToken,
                studioSlug,
            }),
        enabled,
    })

    const defaultSpend =
        projectDetail?.actualSpendToDate != null
            ? String(projectDetail.actualSpendToDate)
            : '0'

    const saveSpendMutation = useMutation({
        mutationFn: (value: number) =>
            apiFetch<ProjectDetail>(`/v1/projects/${projectId}`, {
                method: 'PATCH',
                token: accessToken,
                studioSlug,
                body: { actualSpendToDate: value },
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ['project-detail', projectId],
            })
            void queryClient.invalidateQueries({
                queryKey: ['dashboard', projectId],
            })
            void queryClient.invalidateQueries({
                queryKey: ['assumptions', projectId],
            })
        },
    })

    return (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-bold text-sm">
                    Actual spend (active project)
                </h2>
            </div>
            <p className="text-xs text-muted-foreground">
                Project:{' '}
                <span className="font-semibold text-foreground">
                    {projectName}
                </span>
                . Declaración manual vs. presupuesto agregado de las líneas; si
                supera el total, se crean alerta y supuesto.
            </p>
            {projectError && (
                <p className="text-sm text-destructive">
                    {getApiErrorMessage(projectError)}
                </p>
            )}
            <div className="flex flex-wrap items-end gap-3 max-w-md">
                <div className="space-y-2 flex-1 min-w-[12rem]">
                    <Label htmlFor="actual-spend">Declared spend to date</Label>
                    <Input
                        key={`${projectId}-${defaultSpend}`}
                        ref={inputRef}
                        id="actual-spend"
                        type="number"
                        min={0}
                        step="1"
                        defaultValue={defaultSpend}
                        className="font-mono"
                    />
                </div>
                <Button
                    type="button"
                    size="sm"
                    disabled={
                        saveSpendMutation.isPending || projectDetail == null
                    }
                    onClick={() => {
                        const raw = inputRef.current?.value ?? '0'
                        const n = Number.parseFloat(raw)
                        saveSpendMutation.mutate(
                            Number.isFinite(n) && n >= 0 ? n : 0
                        )
                    }}
                >
                    {saveSpendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        'Save'
                    )}
                </Button>
            </div>
        </div>
    )
}
