import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { getApiErrorMessage } from '@/lib/api'
import { toSlug } from '@/lib/slug'

type Props = {
    onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: Props) {
    const queryClient = useQueryClient()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [studioName, setStudioName] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        const slug = toSlug(studioName)
        if (!slug) {
            setError('Ingresá el nombre del estudio.')
            return
        }
        setSubmitting(true)
        try {
            await login(email.trim(), password, slug)
            await queryClient.invalidateQueries({ queryKey: ['projects'] })
            onSuccess?.()
        } catch (err) {
            setError(getApiErrorMessage(err))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-md border border-border p-4"
        >
            <h3 className="font-semibold text-sm">Iniciar sesión</h3>
            <div className="space-y-1.5">
                <Label htmlFor="login-studio">Nombre del estudio</Label>
                <Input
                    id="login-studio"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    required
                />
            </div>
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
