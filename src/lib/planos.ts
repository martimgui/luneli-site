// Os nomes e o texto curto de cada degrau e dos extras, como o site mostra.
// As funções e a marca "pronta"/"em breve" vêm da lista única (@pdv/core, funcoes-do-site.ts).
import type { DegrauDoSite } from '@pdv/core'

export interface TextoDoDegrau {
  nome: string
  /** Aparece junto do nome enquanto o nome não é definitivo. */
  provisorio?: boolean
  resumo: string
  /** "Tudo do X, mais:" (vazio no primeiro). */
  inclui: string | null
}

export const TEXTO_DOS_DEGRAUS: Record<DegrauDoSite, TextoDoDegrau> = {
  essencial: { nome: 'Essencial', resumo: 'Balcão e delivery, do telefone ao fechamento do caixa.', inclui: null },
  delivery_completo: { nome: 'Delivery completo', provisorio: true, resumo: 'Para a entrega andar sem papel.', inclui: 'Tudo do Essencial, mais:' },
  profissional: { nome: 'Profissional', resumo: 'Para quem tem salão.', inclui: 'Tudo do Delivery completo, mais:' },
  empresarial: { nome: 'Empresarial', resumo: 'Para quem tem mais de uma unidade.', inclui: 'Tudo do Profissional, mais:' },
}

export const SITUACAO_DO_DEGRAU = {
  pronto: 'Disponível',
  em_parte: 'Parte em breve',
  em_breve: 'Em breve',
} as const

export const AVISO_DE_EXEMPLO = 'Preços e limites de exemplo, ainda em definição.'
