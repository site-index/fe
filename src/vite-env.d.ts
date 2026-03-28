/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string | undefined
    readonly VITE_STUDIO_SLUG: string | undefined
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
