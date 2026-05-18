/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Empty in production (same origin as the frontend). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
