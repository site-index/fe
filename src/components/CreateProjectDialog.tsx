import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import {
    cloneElement,
    isValidElement,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
    useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { type Project, useProject } from '@/contexts/ProjectContext'
import { apiFetch, getApiErrorMessage } from '@/lib/api'

const schema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'El nombre es obligatorio')
        .max(100, 'Máximo 100 caracteres'),
})

type FormValues = z.infer<typeof schema>

interface CreateProjectDialogProps {
    trigger?: ReactNode
}

export default function CreateProjectDialog({
    trigger,
}: CreateProjectDialogProps) {
    const [open, setOpen] = useState(false)
    const { accessToken, studioSlug } = useAuth()
    const { setActiveProject } = useProject()
    const queryClient = useQueryClient()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: '' },
    })

    const close = () => {
        setOpen(false)
        form.reset()
    }

    const onSubmit = async (values: FormValues) => {
        try {
            const created = await apiFetch<Project>('/v1/projects', {
                method: 'POST',
                body: { name: values.name },
                token: accessToken,
                studioSlug,
            })
            await queryClient.invalidateQueries({ queryKey: ['projects'] })
            setActiveProject(created)
            toast.success('Proyecto creado', { description: created.name })
            form.reset()
            setOpen(false)
        } catch (err) {
            toast.error('Error al crear proyecto', {
                description: getApiErrorMessage(err),
            })
        }
    }

    const renderTrigger = () => {
        if (!trigger) {
            return (
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-sidebar-muted hover:text-sidebar-foreground"
                    type="button"
                    onClick={() => setOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    Nuevo proyecto
                </Button>
            )
        }
        if (isValidElement(trigger)) {
            const el = trigger as ReactElement<{
                onClick?: (event: MouseEvent<HTMLElement>) => void
            }>
            return cloneElement(el, {
                onClick: (event: MouseEvent<HTMLElement>) => {
                    el.props.onClick?.(event)
                    if (!event.defaultPrevented) {
                        setOpen(true)
                    }
                },
            })
        }
        return null
    }

    return (
        <>
            {renderTrigger()}
            <Dialog open={open} onClose={close} className="relative z-50">
                <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <DialogPanel className="flex max-h-[min(90vh,100dvh)] w-full max-w-md flex-col rounded-lg border bg-background shadow-lg">
                        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                                Crear proyecto
                            </DialogTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Cerrar"
                                onClick={close}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="shrink-0 border-b px-4 py-3 text-sm text-muted-foreground">
                            Ingresá el nombre del nuevo proyecto.
                        </p>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Nombre del proyecto
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Mi proyecto"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="flex shrink-0 justify-end border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                    >
                                        {form.formState.isSubmitting
                                            ? 'Creando…'
                                            : 'Crear'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
