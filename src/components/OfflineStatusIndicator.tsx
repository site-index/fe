import { WifiOff } from 'lucide-react'

import { useNetworkStatus } from '@/hooks/use-network-status'

/**
 * Minimal global connectivity chip for mobile-first layouts.
 * Visible only when offline.
 */
export default function OfflineStatusIndicator() {
    const { isOnline } = useNetworkStatus()

    if (isOnline) return null

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Sin conexión. Sin sincronización."
            className="fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-[110] rounded-full border border-amber-500/40 bg-amber-500/15 p-2 text-amber-300 shadow-lg backdrop-blur"
        >
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Sin conexión. Sin sincronización.</span>
        </div>
    )
}
