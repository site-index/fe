import { Link } from 'react-router-dom'

import SiteLogo from '@/components/SiteLogo'
import { Button } from '@/components/ui/button'

const NotFound = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-muted/30">
            <div className="w-full max-w-md space-y-6 sm:space-y-8">
                <div className="flex justify-center">
                    <SiteLogo
                        invertOnDark
                        className="h-16 sm:h-24 w-auto max-w-[280px]"
                    />
                </div>

                <div className="rounded-lg border border-border bg-card p-6 sm:p-8 shadow-sm text-center space-y-4">
                    <p className="text-5xl sm:text-6xl font-bold tabular-nums text-muted-foreground/80">
                        404
                    </p>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                        Página no encontrada
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        La dirección que buscás no existe o ya no está
                        disponible.
                    </p>
                    <div className="pt-2">
                        <Button asChild size="lg" className="w-full sm:w-auto">
                            <Link to="/">Ir al inicio</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NotFound
