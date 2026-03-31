import { Component, type ErrorInfo, type ReactNode } from 'react'

import SiteLogo from '@/components/SiteLogo'
import { Button } from '@/components/ui/button'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-background p-6">
                    <div className="flex max-w-md flex-col items-center space-y-6 text-center">
                        <SiteLogo invertOnDark className="h-10 w-auto" />
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Algo salió mal
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {this.state.error?.message ??
                                'Ocurrió un error inesperado.'}
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            Recargar página
                        </Button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}
