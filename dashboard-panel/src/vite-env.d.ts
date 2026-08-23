/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'mock' | 'api'
  readonly VITE_AGENT_URL?: string
  readonly VITE_AGENT_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
