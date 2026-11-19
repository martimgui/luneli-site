// Quem está usando o site: a sessão do PDV (o mesmo login do sistema do restaurante).
import { api } from '../../lib/api'

export type Sessao = NonNullable<Awaited<ReturnType<ReturnType<typeof api>['auth']['eu']['query']>>>

/** A sessão aberta neste navegador, ou nulo. Erro de rede sobe para quem chamou. */
export function sessaoAtual(): Promise<Sessao | null> {
  return api().auth.eu.query()
}

/** Vai para a tela de entrar, voltando para esta página depois. */
export function irParaEntrar(voltar = location.pathname): void {
  location.assign(`/entrar?voltar=${encodeURIComponent(voltar)}`)
}
