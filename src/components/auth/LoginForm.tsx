import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError, getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

type StudioChoice = { slug: string; name: string }

function isMultipleStudiosBody(
    body: unknown
): body is { code: string; studios: StudioChoice[] } {
    if (!body || typeof body !== 'object') return false
    const o = body as Record<string, unknown>
    return (
        o.code === 'MULTIPLE_STUDIOS' &&
        Array.isArray(o.studios) &&
        o.studios.every(
            (s) =>
                s &&
                typeof s === 'object' &&
                typeof (s as StudioChoice).slug === 'string' &&
                typeof (s as StudioChoice).name === 'string'
        )
    )
}

function loginCatchState(
    err: unknown
):
    | { type: 'multiple'; studios: StudioChoice[] }
    | { type: 'message'; text: string } {
    if (
        err instanceof ApiError &&
        err.status === 400 &&
        isMultipleStudiosBody(err.body)
    ) {
        return { type: 'multiple', studios: err.body.studios }
    }
    return { type: 'message', text: getApiErrorMessage(err) }
}

type Props = {
    onSuccess?: () => void
    className?: string
}

export default function LoginForm({ onSuccess, className }: Props) {
    const queryClient = useQueryClient()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [studioSlugPick, setStudioSlugPick] = useState('')
    const [studioChoices, setStudioChoices] = useState<StudioChoice[] | null>(
        null
    )
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setSubmitting(true)
        try {
            const slug =
                studioChoices && studioChoices.length > 0
                    ? studioSlugPick
                    : undefined
            if (studioChoices && studioChoices.length > 0 && !slug) {
                setError('Elegí un estudio.')
                setSubmitting(false)
                return
            }
            await login(email.trim(), password, slug)
            setStudioChoices(null)
            setStudioSlugPick('')
            queryClient.clear()
            onSuccess?.()
        } catch (err) {
            const caught = loginCatchState(err)
            if (caught.type === 'multiple') {
                setStudioChoices(caught.studios)
                setStudioSlugPick('')
                setError(
                    'Tu cuenta tiene más de un estudio. Elegí con cuál entrar.'
                )
            } else {
                setError(caught.text)
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={cn(
                'space-y-3 rounded-md border border-border p-4',
                className
            )}
        >
            <h3 className="font-semibold text-sm">Iniciar sesión</h3>
            <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            {studioChoices && studioChoices.length > 0 && (
                <div className="space-y-1.5">
                    <Label htmlFor="login-studio">Estudio</Label>
                    <Select
                        value={studioSlugPick || undefined}
                        onValueChange={setStudioSlugPick}
                        required
                    >
                        <SelectTrigger id="login-studio">
                            <SelectValue placeholder="Seleccioná un estudio" />
                        </SelectTrigger>
                        <SelectContent>
                            {studioChoices.map((s) => (
                                <SelectItem key={s.slug} value={s.slug}>
                                    {s.name} ({s.slug})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    'Entrar'
                )}
            </Button>
        </form>
    )
}
