/**
 * Reads the `email` claim from a JWT payload for display only.
 * Does not verify the signature.
 */
const BASE64_CHUNK_SIZE = 4
const JWT_PARTS_WITH_PAYLOAD = 2
const JWT_PAYLOAD_PART_INDEX = 1
const MILLISECONDS_PER_SECOND = 1000

function decodeJwtPayloadSegment(segment: string): unknown | null {
    try {
        const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
        const padLen =
            (BASE64_CHUNK_SIZE - (base64.length % BASE64_CHUNK_SIZE)) %
            BASE64_CHUNK_SIZE
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
    if (
        parts.length < JWT_PARTS_WITH_PAYLOAD ||
        !parts[JWT_PAYLOAD_PART_INDEX]
    ) {
        return null
    }
    const payload = decodeJwtPayloadSegment(parts[JWT_PAYLOAD_PART_INDEX])
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
    if (
        parts.length < JWT_PARTS_WITH_PAYLOAD ||
        !parts[JWT_PAYLOAD_PART_INDEX]
    ) {
        return true
    }
    const payload = decodeJwtPayloadSegment(parts[JWT_PAYLOAD_PART_INDEX])
    if (!payload || typeof payload !== 'object' || !('exp' in payload)) {
        return true
    }
    const exp = (payload as { exp: unknown }).exp
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return true
    return Date.now() >= exp * MILLISECONDS_PER_SECOND - ACCESS_EXP_SKEW_MS
}
