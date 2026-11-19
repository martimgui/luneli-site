// O que os scripts da vitrine usam em comum: seleção, movimento reduzido, curvas e rampas,
// e escrita de estilo que só mexe no DOM quando o valor muda (os quadros da abertura e da rolagem).

/** O primeiro elemento que casa com o seletor; falta é erro de montagem da página. */
export function $<T extends Element = HTMLElement>(seletor: string, raiz: ParentNode = document): T {
  const elemento = raiz.querySelector<T>(seletor)
  if (elemento === null) throw new Error(`Elemento não encontrado: ${seletor}`)
  return elemento
}

export function $$<T extends Element = HTMLElement>(seletor: string, raiz: ParentNode = document): T[] {
  return [...raiz.querySelectorAll<T>(seletor)]
}

/** Quem pediu menos movimento no sistema vê tudo parado, já no estado final. */
export const semMovimento = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches

export const limitar = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v))

export const rad = (graus: number): number => (graus * Math.PI) / 180

export type Curva = (x: number) => number

/** Uma curva cúbica de Bézier (como a do CSS), resolvida por Newton. */
export function bezier(a: number, b: number, c: number, d: number): Curva {
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const fx = 3 * a * t * (1 - t) * (1 - t) + 3 * c * t * t * (1 - t) + t * t * t - x
      const dx = 3 * a * (1 - t) * (1 - t) + 6 * (c - a) * t * (1 - t) + 3 * (1 - c) * t * t
      if (Math.abs(dx) < 1e-6) break
      t = Math.min(1, Math.max(0, t - fx / dx))
    }
    return 3 * b * t * (1 - t) * (1 - t) + 3 * d * t * t * (1 - t) + t * t * t
  }
}

/** As mesmas curvas do CSS: --sai (entrada e saída) e a da lua. */
export const SAI = bezier(0.23, 1, 0.32, 1)
export const LUA = bezier(0.65, 0, 0.35, 1)

/** O progresso (0 a 1) de um trecho que começa em `inicio` e dura `duracao`, passado pela curva. */
export const rampa = (t: number, inicio: number, duracao: number, curva: Curva = SAI): number =>
  curva(limitar((t - inicio) / duracao))

type Estilavel = HTMLElement | SVGElement

const escrito = new WeakMap<Element, Record<string, string>>()

function escrever(el: Estilavel, chave: string, valor: string, aplicar: () => void): void {
  let guardado = escrito.get(el)
  if (guardado === undefined) {
    guardado = {}
    escrito.set(el, guardado)
  }
  if (guardado[chave] === valor) return
  guardado[chave] = valor
  aplicar()
}

export function opacidade(el: Estilavel, v: number): void {
  const s = v.toFixed(3)
  escrever(el, 'opacidade', s, () => {
    el.style.opacity = s
  })
}

export function transformar(el: Estilavel, v: string): void {
  escrever(el, 'transformar', v, () => {
    el.style.transform = v
  })
}

export function tracejado(el: SVGElement, v: number): void {
  const s = v.toFixed(1)
  escrever(el, 'tracejado', s, () => {
    el.style.strokeDashoffset = s
  })
}

export interface Caixa {
  x: number
  y: number
  w: number
  h: number
}

export function caixa(el: HTMLElement, b: Caixa): void {
  el.style.left = `${b.x}px`
  el.style.top = `${b.y}px`
  el.style.width = `${b.w}px`
  el.style.height = `${b.h}px`
}

export function circulo(el: HTMLElement, cx: number, cy: number, r: number): void {
  caixa(el, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r })
}

/** Só um quadro por rolagem: junta vários eventos de scroll num requestAnimationFrame. */
export function porQuadro(fn: () => void): () => void {
  let agendado = false
  return () => {
    if (agendado) return
    agendado = true
    requestAnimationFrame(() => {
      agendado = false
      fn()
    })
  }
}
