/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** O endereço do sistema do restaurante (o caixa no navegador). Padrão: http://127.0.0.1:5173. */
  readonly PUBLIC_ENDERECO_DO_SISTEMA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
