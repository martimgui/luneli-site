// Regras puras da área da conta: telefone e DDD, fuso, token do link, datas e o endereço do sistema.
import { formatarCentavos, normalizarTelefone } from '@pdv/core'

/** O telefone do dono, para a criação da conta: só brasileiro, sempre com DDD. */
export type TelefoneDoDono = { ok: true; ddd: string; e164: string } | { ok: false }

/**
 * Lê o telefone digitado. Precisa trazer o DDD (10 ou 11 dígitos, com ou sem +55 ou 0 na frente),
 * e o DDD tem de existir. O DDD vira o DDD padrão do restaurante.
 */
export function telefoneDoDono(digitado: string): TelefoneDoDono {
  // Sem DDD padrão: um número de 8 ou 9 dígitos (sem DDD) é recusado.
  const normalizado = normalizarTelefone(digitado, '')
  if (!normalizado.ok) return { ok: false }
  return { ok: true, ddd: normalizado.e164.slice(3, 5), e164: normalizado.e164 }
}

/** Os fusos do Brasil que o servidor aceita (os mesmos da tela de dados do restaurante). */
export const FUSOS_DO_BRASIL = [
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
  'America/Maceio',
  'America/Belem',
  'America/Araguaina',
  'America/Santarem',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Manaus',
  'America/Porto_Velho',
  'America/Boa_Vista',
  'America/Rio_Branco',
  'America/Eirunepe',
  'America/Noronha',
] as const

export const FUSO_PADRAO = 'America/Sao_Paulo'

/** O fuso do navegador, se for um do Brasil; senão o de Brasília. */
export function fusoDoRestaurante(doNavegador: string | undefined): string {
  return doNavegador !== undefined && (FUSOS_DO_BRASIL as readonly string[]).includes(doNavegador) ? doNavegador : FUSO_PADRAO
}

/** O fuso que o navegador diz, ou indefinido se ele não disser. */
export function fusoDoNavegador(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

/** O token de um link de e-mail: vem no fragmento (`#token=...`), nunca na consulta. */
export function tokenDoFragmento(fragmento: string): string | null {
  if (fragmento === '' || fragmento === '#') return null
  const lido = new URLSearchParams(fragmento.replace(/^#/, '')).get('token')
  return lido === null || lido.trim() === '' ? null : lido.trim()
}

/**
 * Lê o token do endereço e o tira dali (sem recarregar e sem nova entrada no histórico),
 * para ele não ficar no histórico nem ser copiado junto com o endereço.
 */
export function lerETirarTokenDoEndereco(janela: Pick<Window, 'location' | 'history'> = window): string | null {
  const token = tokenDoFragmento(janela.location.hash)
  if (janela.location.hash !== '') janela.history.replaceState(janela.history.state, '', janela.location.pathname + janela.location.search)
  return token
}

/** "2026-11-03" → "03/11/2026". */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split('-')
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data
}

/** Centavos em reais: 12900 → "R$ 129,00". */
export function formatarReais(centavos: number): string {
  return `R$ ${formatarCentavos(centavos)}`
}

/** O endereço do sistema do restaurante (o caixa no navegador). */
export const ENDERECO_DO_SISTEMA: string = import.meta.env.PUBLIC_ENDERECO_DO_SISTEMA || 'http://127.0.0.1:5173'

/** Só caminhos do próprio site para "voltar depois de entrar": nada de endereço de fora. */
export function destinoSeguro(voltar: string | null, padrao = '/minha-conta'): string {
  if (voltar === null || !voltar.startsWith('/') || voltar.startsWith('//') || voltar.includes('\\')) return padrao
  return voltar
}

export const SENHA_MINIMA = 8
export const SENHA_MAXIMA = 200
