import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useToast } from '@/hooks/use-toast'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import {
    OTHER_WORK_CATEGORY_CODE,
    type WorkCategoryRow,
} from '@/types/work-category'

const schema = z.object({
    workCategoryId: z
        .string()
        .min(1, 'Elegí un rubro')
        .uuid('Elegí un rubro válido'),
    name: z
        .string()
        .trim()
        .min(1, 'El nombre es obligatorio')
        .max(500, 'Máximo 500 caracteres'),
    description: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
    outputUnit: z
        .string()
        .trim()
        .min(1, 'La unidad de ítem es obligatoria')
        .max(32, 'Máximo 32 caracteres'),
})

type FormValues = z.infer<typeof schema>

export interface CreatedItemYield {
    id: string
    workCategoryId: string
    workCategoryName: string
    name: string
    description: string
    outputUnit: string
    linkedItems: string[]
    components: Array<{
        id: string
        material: string
        unit: string
        quantityPerUnit: number
        purchaseUnit: string
        yieldPerPurchase: number
        wastePercent: number
    }>
}

interface CreateItemYieldDialogProps {
    trigger?: ReactNode
    onCreated?: (id: string) => void
}

export default function CreateItemYieldDialog({
    trigger,
    onCreated,
}: CreateItemYieldDialogProps) {
    const [open, setOpen] = useState(false)
    const { accessToken, studioSlug } = useAuth()
    const { activeProject } = useProject()
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const resetValues: FormValues = {
        workCategoryId: '',
        name: '',
        description: '',
        outputUnit: 'm³',
    }

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: resetValues,
    })

    const { data: categories = [], isPending: categoriesLoading } = useQuery({
        queryKey: ['work-categories', accessToken, studioSlug],
        queryFn: () =>
            apiFetch<WorkCategoryRow[]>('/v1/work-categories', {
                token: accessToken,
                studioSlug,
            }),
        enabled: open && Boolean(accessToken && studioSlug.trim()),
    })

    useEffect(() => {
        if (!open || categoriesLoading) {
            return
        }
        const other = categories.find(
            (c) => c.code === OTHER_WORK_CATEGORY_CODE
        )
        if (other) {
            form.setValue('workCategoryId', other.id)
        }
    }, [open, categoriesLoading, categories, form])

    const onSubmit = async (values: FormValues) => {
        try {
            const body: {
                workCategoryId: string
                name: string
                description?: string
                components: {
                    outputUnit: string
                    linkedItems: string[]
                    lines: []
                }
            } = {
                workCategoryId: values.workCategoryId,
                name: values.name,
                components: {
                    outputUnit: values.outputUnit,
                    linkedItems: [],
                    lines: [],
                },
            }
            if (values.description.trim() !== '') {
                body.description = values.description.trim()
            }
            const created = await apiFetch<CreatedItemYield>(
                `/v1/projects/${activeProject.id}/item-yields`,
                {
                    method: 'POST',
                    body,
                    token: accessToken,
                    studioSlug,
                }
            )
            await queryClient.invalidateQueries({
                queryKey: ['item-yields', activeProject.id],
            })
            toast({
                title: 'Rendimiento creado',
                description: created.name,
            })
            form.reset(resetValues)
            setOpen(false)
            onCreated?.(created.id)
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Error al crear el rendimiento',
                description: getApiErrorMessage(err),
            })
        }
    }

    const canSubmit =
        !categoriesLoading &&
        categories.length > 0 &&
        !form.formState.isSubmitting

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v)
                if (!v) {
                    form.reset(resetValues)
                }
            }}
        >
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button type="button" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo rendimiento
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nuevo rendimiento</DialogTitle>
                    <DialogDescription>
                        Elegí el rubro y la unidad del ítem. Podés agregar
                        líneas de materiales después (p. ej. vía API).
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="workCategoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rubro</FormLabel>
                                    <Select
                                        disabled={categoriesLoading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger aria-label="Rubro">
                                                <SelectValue placeholder="Cargando rubros…" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem
                                                    key={c.id}
                                                    value={c.id}
                                                >
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ej. Hormigón H21"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Descripción (opcional)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Notas breves"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="outputUnit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unidad del ítem</FormLabel>
                                    <FormControl>
                                        <Input placeholder="m³" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={!canSubmit}>
                                {form.formState.isSubmitting
                                    ? 'Creando…'
                                    : 'Crear'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
