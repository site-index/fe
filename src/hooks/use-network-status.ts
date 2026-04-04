import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void) {
    window.addEventListener('online', onStoreChange)
    window.addEventListener('offline', onStoreChange)

    return () => {
        window.removeEventListener('online', onStoreChange)
        window.removeEventListener('offline', onStoreChange)
    }
}

function getSnapshot() {
    return navigator.onLine
}

function getServerSnapshot() {
    return true
}

/**
 * Tracks browser network status from native online/offline events.
 */
export function useNetworkStatus() {
    const isOnline = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    )

    return { isOnline }
}
