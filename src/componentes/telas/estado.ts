// O estado de cada tela ligado ao passo da rolagem (0 a 1):
//   data-de="0.36"            aparece a partir do instante 0,36 (dentro de um grupo .tr, só o último alcançado fica visível);
//   data-cls="pronto@.6"      liga a classe "pronto" a partir de 0,6.
// No palco da história o script (scripts/vitrine/telas.ts) aplica isso conforme a rolagem; nas cópias estáticas
// (celular, mesas, PDV de dia) o `instante` vem como prop e o estado já nasce desenhado no HTML, sem depender de script.

/** O instante da tela: indefinido no palco (o script decide), um número nas cópias estáticas. */
export type Instante = number | undefined

type Atributos = Record<string, string>

function juntar(classes: string[]): Atributos {
  const lista = classes.filter(Boolean).join(' ')
  return lista === '' ? {} : { class: lista }
}

/** Atributos de um elemento que aparece a partir de `desde` (e, num grupo .tr, dá lugar ao seguinte em `ate`). */
export function de(p: Instante, desde: number, ate = Infinity, classes = ''): Atributos {
  const ligado = p !== undefined && p >= desde && p < ate
  const fim: Atributos = Number.isFinite(ate) ? { 'data-ate': String(ate) } : {}
  return { 'data-de': String(desde), ...fim, ...juntar([classes, ligado ? 'on' : '']) }
}

/** Atributos de um elemento que ganha classes a partir de instantes: cls(p, { pronto: 0.6, feito: 0.86 }, 'bt'). */
export function cls(p: Instante, pares: Record<string, number>, classes = ''): Atributos {
  const ligadas = Object.entries(pares)
    .filter(([, instante]) => p !== undefined && p >= instante)
    .map(([classe]) => classe)
  const valor = Object.entries(pares)
    .map(([classe, instante]) => `${classe}@${instante}`)
    .join(' ')
  return { 'data-cls': valor, ...juntar([classes, ...ligadas]) }
}

/**
 * As etapas reais do pedido no Luneli (packages/core/src/etapa.ts), como fases da lua, de crescente a cheia:
 * em preparo → pronto → saiu para entrega → entregue (no balcão, retirado). Não existe "recebido".
 */
export const FASE_DA_ETAPA = { em_preparo: 0.5, pronto: 1, saiu: 1.5, entregue: 2 } as const
export type Etapa = keyof typeof FASE_DA_ETAPA

/** A lua da história cresce ao longo dos quatro passos: pedido, cozinha, entrega, fechamento. */
export const FASE_DO_PASSO = [0, 0.66, 1.33, 2] as const

/**
 * O ícone de fase da lua: um disco aceso menos um disco escuro deslocado (d0 de 0, nova, a 2, cheia).
 * O mesmo desenho do protótipo D6, gerado no servidor.
 */
export function lunar(d0: number, tam = 14, aro = true): string {
  const r = tam / 2 - 0.75
  const c = tam / 2
  const d = d0 * r
  let corpo: string
  if (d <= 0) corpo = `<circle cx="${c}" cy="${c}" r="${r}" fill="currentColor" opacity=".16"/>`
  else if (d >= 2 * r) corpo = `<circle cx="${c}" cy="${c}" r="${r}" fill="currentColor"/>`
  else {
    const x = (c + d / 2).toFixed(3)
    const h = Math.sqrt(r * r - (d * d) / 4)
    corpo = `<path d="M${x} ${(c - h).toFixed(3)}A${r} ${r} 0 1 0 ${x} ${(c + h).toFixed(3)}A${r} ${r} 0 0 1 ${x} ${(c - h).toFixed(3)}Z" fill="currentColor"/>`
  }
  const anel = aro ? `<circle cx="${c}" cy="${c}" r="${r - 0.4}" fill="none" stroke="currentColor" stroke-width=".9" opacity=".5"/>` : ''
  return `<svg class="fz" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" aria-hidden="true">${anel}${corpo}</svg>`
}
