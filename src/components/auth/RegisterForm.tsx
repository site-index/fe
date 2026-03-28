import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { getApiErrorMessage } from '@/lib/api'

type Props = {
    onSuccess?: () => void
}

export default function RegisterForm({ onSuccess }: Props) {
    const queryClient = useQueryClient()
    const { register } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [studioName, setStudioName] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setSubmitting(true)
        try {
            const name = studioName.trim()
            const autoSlug = name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
            await register({
                email: email.trim(),
                password,
                studioSlug: autoSlug,
                studioName: name,
            })
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
            <h3 className="font-semibold text-sm">Registrar estudio</h3>
            <div className="space-y-1.5">
                <Label htmlFor="register-email">Email</Label>
                <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="register-password">Contraseña (mín. 8)</Label>
                <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="register-name">Nombre del estudio</Label>
                <Input
                    id="register-name"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    required
                />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={submitting}
            >
                {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    'Crear cuenta'
                )}
            </Button>
        </form>
    )
}
