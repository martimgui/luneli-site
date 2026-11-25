// Os nomes e o texto curto de cada degrau e dos extras, como o site mostra.
// As funções e a marca "pronta"/"em breve" vêm da lista única (@pdv/core, funcoes-do-site.ts).
import type { DegrauDoSite, IdDaFuncaoDoSite, MarcaDaFuncao } from '@pdv/core'

export interface TextoDoDegrau {
  nome: string
  /** Enquanto o nome não é definitivo: um asterisco no nome (cartão e comparativo) e a nota "* Nome provisório." */
  provisorio?: boolean
  resumo: string
  /** "Tudo do X, mais:" (vazio no primeiro). */
  inclui: string | null
  /** Para quem é, em uma linha. */
  para: string
}

export const TEXTO_DOS_DEGRAUS: Record<DegrauDoSite, TextoDoDegrau> = {
  essencial: { nome: 'Essencial', resumo: 'Balcão e delivery, do telefone ao fechamento do caixa.', inclui: null, para: 'Para o delivery e o balcão. A comanda em papel chega com o programa da impressora (em breve).' },
  delivery_completo: { nome: 'Delivery completo', provisorio: true, resumo: 'Para a entrega andar sem papel.', inclui: 'Tudo do Essencial, mais:', para: 'Para quem quer a cozinha na tela e o entregador no celular.' },
  profissional: { nome: 'Profissional', resumo: 'Para quem tem salão.', inclui: 'Tudo do Delivery completo, mais:', para: 'Para a casa com mesas e conta aberta.' },
  empresarial: { nome: 'Empresarial', resumo: 'Para quem tem mais de uma unidade.', inclui: 'Tudo do Profissional, mais:', para: 'Para a rede, com os números de todas as casas juntos.' },
}

/**
 * O guia acima dos cartões: qual degrau serve a cada casa, sem destacar nenhum. Os degraus batem com a lista única:
 * a tela da cozinha e o aplicativo do entregador são do Delivery completo; as mesas, do Profissional.
 */
export const GUIA_DOS_DEGRAUS: readonly { quando: string; degrau: DegrauDoSite }[] = [
  { quando: 'Só delivery e balcão', degrau: 'essencial' },
  { quando: 'Quer a cozinha na tela e o entregador no celular', degrau: 'delivery_completo' },
  { quando: 'Tem salão com mesas', degrau: 'profissional' },
]

/**
 * O que cada cartão de plano mostra (no máximo quatro funções próprias do degrau); o resto fica no comparativo.
 * Só os ids da lista única: uma função que sair de lá quebra o build, nunca o site.
 */
export const DESTAQUES_DO_DEGRAU: Record<DegrauDoSite, readonly IdDaFuncaoDoSite[]> = {
  essencial: ['balcao_e_delivery', 'cliente_pelo_telefone', 'comanda_por_setor', 'varios_caixas'],
  delivery_completo: ['aplicativo_do_entregador', 'tela_da_cozinha'],
  profissional: ['mesas', 'garcom_no_celular', 'dividir_por_item'],
  empresarial: ['varias_unidades', 'painel_consolidado'],
}

export const SITUACAO_DO_DEGRAU = {
  pronto: 'Disponível',
  // decisão de gosto pendente com o Gui: "Disponível, sem a impressão" ou "Parte em breve"
  pronto_sem_papel: 'Disponível, sem a impressão',
  em_parte: 'Parte em breve',
  em_breve: 'Em breve',
} as const

/** A linha do rodapé (o site não mostra limites: a palavra soava como letra miúda). Conferido no código: a cobrança desta versão é o substituto de desenvolvimento. */
export const AVISO_DE_EXEMPLO = 'Preços em definição. Nada é cobrado nesta versão.'

/** O texto de cada marca da lista única: o terceiro estado diz por inteiro de onde vem o "em breve". */
export const TEXTO_DA_MARCA: Record<MarcaDaFuncao, string> = {
  pronta: 'Pronta',
  pronta_sem_papel: 'Pronta no sistema; o papel chega com o programa da impressora (em breve)',
  em_breve: 'Em breve',
}
/** A forma curta, para os cartões e as abas do celular. */
export const TEXTO_CURTO_DA_MARCA: Record<MarcaDaFuncao, string> = {
  pronta: 'Pronta',
  pronta_sem_papel: 'Papel em breve',
  em_breve: 'Em breve',
}

/** O que o cartão dizia no lugar do preço; hoje a nota única abaixo dos cartões (notaDosPrecos) diz isso uma vez só. */
export const PRECO_EM_DEFINICAO = 'Preço em definição'

/**
 * A nota única abaixo dos cartões: os preços em definição, o primeiro mês sem cobrança e, para cada degrau que
 * ainda não tem nenhuma função pronta (hoje só o Empresarial), que ele entra quando elas estiverem prontas.
 */
export function notaDosPrecos(degrausEmBreve: readonly string[]): string {
  const base = 'Preços em definição. O primeiro mês não é cobrado e não pede cartão'
  if (degrausEmBreve.length === 0) return `${base}.`
  const nomes = degrausEmBreve.map((nome) => `o ${nome}`)
  if (nomes.length === 1) return `${base}; ${nomes[0]} entra quando as funções dele estiverem prontas.`
  const quem = `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
  return `${base}; ${quem} entram quando as funções deles estiverem prontas.`
}
