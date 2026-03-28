/**
 * Reads the `email` claim from a JWT payload for display only.
 * Does not verify the signature.
 */
function decodeJwtPayloadSegment(segment: string): unknown | null {
    try {
        const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
        const padLen = (4 - (base64.length % 4)) % 4
        const json = atob(base64 + '='.repeat(padLen))
        return JSON.parse(json) as unknown
    } catch {
        return null
    }
}

function emailFromPayload(obj: unknown): string | null {
    if (!obj || typeof obj !== 'object' || !('email' in obj)) return null
    const email = (obj as { email: unknown }).email
    if (typeof email !== 'string' || !email.trim()) return null
    return email
}

export function parseAccessTokenEmail(
    accessToken: string | null
): string | null {
    if (!accessToken?.length) return null
    const parts = accessToken.split('.')
    if (parts.length < 2 || !parts[1]) return null
    const payload = decodeJwtPayloadSegment(parts[1])
    return emailFromPayload(payload)
}

/** Skew so we refresh slightly before the server rejects the access JWT. */
const ACCESS_EXP_SKEW_MS = 30_000

/**
 * True if the JWT `exp` is missing or in the past (relative to skew). Used for proactive refresh only; signature is not verified.
 */
export function isAccessTokenExpired(accessToken: string | null): boolean {
    if (!accessToken?.length) return false
    const parts = accessToken.split('.')
    if (parts.length < 2 || !parts[1]) return true
    const payload = decodeJwtPayloadSegment(parts[1])
    if (!payload || typeof payload !== 'object' || !('exp' in payload)) {
        return true
    }
    const exp = (payload as { exp: unknown }).exp
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return true
    return Date.now() >= exp * 1000 - ACCESS_EXP_SKEW_MS
}
