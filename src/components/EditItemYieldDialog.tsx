import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
    type ItemYieldLineInput,
    patchProjectItemYield,
} from '@/api/item-yields.api'
import {
    getResourcePrices,
    getResources,
    setResourcePrice,
} from '@/api/resources.api'
import ItemYieldLinesEditor from '@/components/ItemYieldLinesEditor'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { getApiErrorMessage } from '@/lib/api'
import { qk } from '@/lib/query-keys'
import type { ItemYield } from '@/types/item-yield'

type Props = {
    itemYield: ItemYield | null
    open: boolean
    onOpenChange: (next: boolean) => void
}

function areQueriesEnabled(
    open: boolean,
    accessToken: string | null,
    studioSlug: string
): boolean {
    return open && Boolean(accessToken && studioSlug.trim())
}

function useDialogDefaults(
    open: boolean,
    itemYield: ItemYield | null,
    setLines: (next: ItemYieldLineInput[]) => void
): void {
    useEffect(() => {
        if (!open || !itemYield) {
            return
        }
        setLines(
            itemYield.components.map((line) => ({
                resourceId: line.resourceId,
                quantity: line.quantity,
            }))
        )
    }, [itemYield, open, setLines])
}

type EditItemYieldContentProps = {
    lines: ItemYieldLineInput[]
    resources: Awaited<ReturnType<typeof getResources>>
    pricesByResourceId: Map<string, number>
    disabled: boolean
    onSetResourcePrice: (resourceId: string, unitPrice: number) => Promise<void>
    onLinesChange: (next: ItemYieldLineInput[]) => void
    onSave: () => Promise<void>
}

function EditItemYieldContent({
    lines,
    resources,
    pricesByResourceId,
    disabled,
    onSetResourcePrice,
    onLinesChange,
    onSave,
}: EditItemYieldContentProps) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto py-3">
                <ItemYieldLinesEditor
                    lines={lines}
                    resources={resources}
                    pricesByResourceId={pricesByResourceId}
                    disabled={disabled}
                    onSetResourcePrice={onSetResourcePrice}
                    onChange={onLinesChange}
                />
            </div>
            <div className="flex shrink-0 justify-end border-t px-0 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Button type="button" disabled={disabled} onClick={onSave}>
                    {disabled ? 'Guardando…' : 'Guardar'}
                </Button>
            </div>
        </div>
    )
}

type ContentProps = {
    itemYield: ItemYield
    open: boolean
    onOpenChange: (next: boolean) => void
}

function EditItemYieldDialogContent({
    itemYield,
    open,
    onOpenChange,
}: ContentProps) {
    const [lines, setLines] = useState<ItemYieldLineInput[]>([])
    const [saving, setSaving] = useState(false)
    const { activeProject } = useProject()
    const { accessToken, studioSlug } = useAuth()
    const queryClient = useQueryClient()

    useDialogDefaults(open, itemYield, setLines)

    const queriesEnabled = areQueriesEnabled(open, accessToken, studioSlug)
    const { data: resources = [] } = useQuery({
        queryKey: qk.resources(studioSlug),
        queryFn: () => getResources({ token: accessToken, studioSlug }),
        enabled: queriesEnabled,
    })
    const { data: resourcePrices = [] } = useQuery({
        queryKey: qk.resourcePrices(studioSlug),
        queryFn: () => getResourcePrices({ token: accessToken, studioSlug }),
        enabled: queriesEnabled,
    })
    const pricesByResourceId = new Map(
        resourcePrices.map((row) => [row.resourceId, row.unitPrice] as const)
    )

    const handleClose = useCallback(() => {
        onOpenChange(false)
    }, [onOpenChange])

    const onSetResourcePrice = useCallback(
        async (resourceId: string, unitPrice: number) => {
            const resource = resources.find((row) => row.id === resourceId)
            if (!resource) {
                return
            }
            await setResourcePrice(
                resourceId,
                {
                    measureUnitId: resource.commercialMeasureUnit.id,
                    unitPrice,
                },
                { token: accessToken, studioSlug }
            )
            await queryClient.invalidateQueries({
                queryKey: qk.resourcePrices(studioSlug),
            })
        },
        [accessToken, queryClient, resources, studioSlug]
    )

    const onSave = async () => {
        if (saving) {
            return
        }
        setSaving(true)
        try {
            const updated = await patchProjectItemYield(
                activeProject.id,
                itemYield.id,
                {
                    components: {
                        linkedItems: itemYield.linkedItems,
                        lines,
                    },
                },
                { token: accessToken, studioSlug }
            )
            await queryClient.invalidateQueries({
                queryKey: qk.itemYields(studioSlug, activeProject.id),
            })
            toast.success('Rendimiento actualizado', {
                description: updated.name,
            })
            handleClose()
        } catch (error) {
            toast.error('No se pudo guardar el rendimiento', {
                description: getApiErrorMessage(error),
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onClose={handleClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
                <DialogPanel className="flex max-h-[min(90vh,100dvh)] w-full max-w-5xl flex-col rounded-lg border bg-background shadow-lg">
                    <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                        <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                            Editar rendimiento
                        </DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Cerrar"
                            onClick={handleClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
                        <EditItemYieldContent
                            lines={lines}
                            resources={resources}
                            pricesByResourceId={pricesByResourceId}
                            disabled={saving}
                            onSetResourcePrice={onSetResourcePrice}
                            onLinesChange={setLines}
                            onSave={onSave}
                        />
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    )
}

export default function EditItemYieldDialog({
    itemYield,
    open,
    onOpenChange,
}: Props) {
    if (!itemYield) {
        return null
    }
    return (
        <EditItemYieldDialogContent
            itemYield={itemYield}
            open={open}
            onOpenChange={onOpenChange}
        />
    )
}
