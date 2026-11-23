// A ligação da área da conta com o servidor do PDV: o cliente tRPC e a leitura dos erros.
//
// Sempre /trpc, na mesma origem da página: os cookies de sessão (pdv_sessao, pdv_pessoa, httpOnly)
// só valem assim, e o servidor confere o Origin das mutações. Do servidor só entram tipos
// (`import type`), que somem na compilação.
import type { CausaDeNegocio, DadosDoErro, ErrosDeValidacao } from '@pdv/server/api'
import { TRPCClientError, createTRPCClient, httpBatchLink } from '@trpc/client'

export const ENDERECO_DA_API = '/trpc'

let cliente: any = null

/** O cliente, criado na primeira chamada. Toda chamada sai por POST, como no sistema do restaurante. */
export function api(): any {
  cliente ??= (createTRPCClient as any)({
    links: [httpBatchLink({ url: ENDERECO_DA_API, methodOverride: 'POST' })],
  })
  return cliente
}

export type CodigoDoErro = DadosDoErro['code']

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function dadosDoErro(erro: unknown): Record<string, unknown> | null {
  if (!(erro instanceof TRPCClientError)) return null
  const dados: unknown = erro.data
  return ehObjeto(dados) ? dados : null
}

/** A causa de um erro de negócio (`error.data.causa`), ou nulo para qualquer outro erro. */
export function causaDoErro(erro: unknown): CausaDeNegocio | null {
  const causa = dadosDoErro(erro)?.causa
  if (!ehObjeto(causa) || typeof causa.tipo !== 'string') return null
  return causa as unknown as CausaDeNegocio
}

/** O código tRPC do erro, ou nulo quando o servidor não respondeu. */
export function codigoDoErro(erro: unknown): CodigoDoErro | null {
  const codigo = dadosDoErro(erro)?.code
  return typeof codigo === 'string' ? (codigo as CodigoDoErro) : null
}

function ehListaDeTextos(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === 'string')
}

/** Os erros de validação por campo (`error.data.validacao`), ou nulo. */
export function errosDeValidacao(erro: unknown): ErrosDeValidacao | null {
  const validacao = dadosDoErro(erro)?.validacao
  if (!ehObjeto(validacao) || !ehObjeto(validacao.campos)) return null
  const campos: Record<string, string[]> = {}
  for (const [campo, mensagens] of Object.entries(validacao.campos)) {
    if (ehListaDeTextos(mensagens)) campos[campo] = mensagens
  }
  return { gerais: ehListaDeTextos(validacao.gerais) ? validacao.gerais : [], campos }
}

export const MENSAGEM_SEM_SERVIDOR = 'O servidor está indisponível agora. Confira a conexão e tente de novo em instantes.'
export const MENSAGEM_DE_FALHA = 'Não foi possível concluir. Tente de novo.'

/** "Muitas tentativas", com a espera em segundos ou minutos. */
export function mensagemDeEspera(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  if (segundos < 60) return `Muitas tentativas. Aguarde ${segundos} ${segundos === 1 ? 'segundo' : 'segundos'} e tente de novo.`
  const minutos = Math.ceil(segundos / 60)
  return `Muitas tentativas. Aguarde ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} e tente de novo.`
}

/** Se o erro é o servidor que não respondeu (rede caída, servidor fora). */
export function servidorIndisponivel(erro: unknown): boolean {
  return codigoDoErro(erro) === null
}

/**
 * O texto para mostrar. A mensagem do servidor só é repassada quando foi escrita para a tela:
 * nos erros de negócio, na entrada inválida e no erro interno (como no sistema do restaurante).
 */
export function mensagemDoErro(erro: unknown): string {
  const causa = causaDoErro(erro)
  if (causa?.tipo === 'muitas_tentativas') return mensagemDeEspera(causa.tentarDeNovoEmSegundos)
  const codigo = codigoDoErro(erro)
  if (codigo === null) return MENSAGEM_SEM_SERVIDOR
  const escritaParaATela = causa !== null || codigo === 'INTERNAL_SERVER_ERROR' || codigo === 'BAD_REQUEST'
  return escritaParaATela && erro instanceof Error && erro.message !== '' ? erro.message : MENSAGEM_DE_FALHA
}

/** Os segundos de espera de um "muitas tentativas", ou nulo. */
export function esperaDoErro(erro: unknown): number | null {
  const causa = causaDoErro(erro)
  return causa?.tipo === 'muitas_tentativas' ? causa.tentarDeNovoEmSegundos : null
}

/**
 * Os erros de um formulário: por campo (só os campos conhecidos) e o geral.
 * O geral fica nulo quando algum campo explica o erro.
 */
export function errosDoFormulario<C extends string>(
  erro: unknown,
  campos: readonly C[],
  porCausa: Partial<Record<CausaDeNegocio['tipo'], C>> = {},
): { campos: Partial<Record<C, string>>; geral: string | null } {
  const resultado: Partial<Record<C, string>> = {}
  const validacao = errosDeValidacao(erro)
  for (const campo of campos) {
    const texto = validacao?.campos[campo]?.[0]
    if (texto) resultado[campo] = texto
  }
  const causa = causaDoErro(erro)
  const campoDaCausa = causa ? porCausa[causa.tipo] : undefined
  if (campoDaCausa) resultado[campoDaCausa] = mensagemDoErro(erro)
  const temCampo = Object.keys(resultado).length > 0
  const geralDaValidacao = validacao?.gerais[0] ?? null
  return { campos: resultado, geral: temCampo ? geralDaValidacao : (geralDaValidacao ?? mensagemDoErro(erro)) }
}
