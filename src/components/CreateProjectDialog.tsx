import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { type ReactNode, useState } from 'react'
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
import { useAuth } from '@/contexts/AuthContext'
import { type Project, useProject } from '@/contexts/ProjectContext'
import { useToast } from '@/hooks/use-toast'
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
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: '' },
    })

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
            toast({ title: 'Proyecto creado', description: created.name })
            form.reset()
            setOpen(false)
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Error al crear proyecto',
                description: getApiErrorMessage(err),
            })
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v)
                if (!v) form.reset()
            }}
        >
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-sidebar-muted hover:text-sidebar-foreground"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo proyecto
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Crear proyecto</DialogTitle>
                    <DialogDescription>
                        Ingresá el nombre del nuevo proyecto.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del proyecto</FormLabel>
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
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                            >
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
