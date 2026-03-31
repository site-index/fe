// Virtual module provided by vite-plugin-pwa at build time (not resolved by TypeScript ESLint).
// eslint-disable-next-line import-x/no-unresolved -- Vite virtual module
import { useRegisterSW } from 'virtual:pwa-register/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Non-modal update bar: user chooses when to reload after a new service worker is waiting.
 * Copy is Spanish (es-AR); identifiers stay English.
 */
export function PwaUpdateBanner() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({ immediate: true })

    if (!needRefresh) return null

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card shadow-lg',
                'pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]'
            )}
        >
            <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-foreground">
                    Hay una nueva versión de la app. Actualizá para obtener los
                    últimos cambios y correcciones.
                </p>
                <div className="flex shrink-0 gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 min-w-[7rem]"
                        onClick={() => setNeedRefresh(false)}
                    >
                        Más tarde
                    </Button>
                    <Button
                        type="button"
                        className="min-h-11 min-w-[7rem]"
                        onClick={() => void updateServiceWorker()}
                    >
                        Actualizar
                    </Button>
                </div>
            </div>
        </div>
    )
}
