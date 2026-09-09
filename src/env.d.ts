/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_AGENCY: string
  readonly VITE_APP_AGENCY_NAME: string
  readonly VITE_APP_AGENCY_IMAGE: string
  readonly VITE_APP_AGENCY_IDENTIFIER: string
  // Agrega aquí otras variables VITE_* que utilices
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}