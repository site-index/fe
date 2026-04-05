import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 768
const NON_MOBILE_OFFSET = 1
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - NON_MOBILE_OFFSET}px)`

function subscribe(onStoreChange: () => void) {
    const mql = window.matchMedia(MOBILE_QUERY)
    mql.addEventListener('change', onStoreChange)
    return () => mql.removeEventListener('change', onStoreChange)
}

function getSnapshot() {
    return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
    return false
}

/**
 * Subscribes to viewport width vs {@link MOBILE_BREAKPOINT} via `matchMedia`.
 * Uses `useSyncExternalStore` so the value stays in sync without effects.
 */
export function useIsMobile() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
