/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string | undefined
    readonly VITE_STUDIO_SLUG: string | undefined
    readonly VITE_BYPASS_AUTH: string | undefined
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
