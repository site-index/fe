import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'
import SiteLogo from '@/components/SiteLogo'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const rawFrom =
        (location.state as { from?: string } | null)?.from?.trim() || '/'
    const from = rawFrom.startsWith('/login') ? '/' : rawFrom

    const goAfterAuth = () => {
        navigate(from, { replace: true })
    }

    if (isAuthenticated) {
        return <Navigate to={from} replace />
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
            <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <SiteLogo className="h-40 w-auto max-w-[400px] dark:brightness-0 dark:invert" />
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        <LoginForm onSuccess={goAfterAuth} />
                        <RegisterForm onSuccess={goAfterAuth} />
                    </div>
                </div>
            </div>
        </div>
    )
}
