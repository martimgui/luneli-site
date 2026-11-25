// A lua minimalista da vitrine, em SVG: o disco apagado, a parte acesa (terminador em elipse, lib/fase-da-lua.ts),
// o halo e o brilho no limbo aceso, o aro fino de sempre e o anel com a coroa do eclipse. Tudo no quadro unitário
// (centro 0,0, raio 1, luz vinda de +x): o grupo é posto com translate(cx cy) rotate(ang) scale(r), e os traços
// não escalam (vector-effect), ficando nítidos em qualquer tamanho. Só cria elementos quando chamada.
// A fase anda em passos de 0,005: o caminho só é reescrito quando muda de verdade.
import { caminhoDaFase } from '../../lib/fase-da-lua'

const NS = 'http://www.w3.org/2000/svg'

export type Acabamento = 'crescente' | 'cheia'

export interface Lua {
  acabamento: Acabamento
  g: SVGGElement
  luz: SVGPathElement
  corpo: SVGCircleElement
  halo: SVGCircleElement
  brilho: SVGCircleElement
  aro: SVGCircleElement
  coroa: SVGCircleElement
  anel: SVGCircleElement
  gradLuz: SVGRadialGradientElement
  /** A última fase escrita (em passos de 0,005). */
  ultimaFase: number
}

type Parada = [number, string, number?]

export function criar<K extends keyof SVGElementTagNameMap>(tag: K, atributos: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag)
  for (const [nome, valor] of Object.entries(atributos)) e.setAttribute(nome, String(valor))
  return e
}

function gradiente(id: string, cx: number, cy: number, r: number, paradas: Parada[], unitario = false): SVGRadialGradientElement {
  const g = criar('radialGradient', { id, cx, cy, r, ...(unitario ? { gradientUnits: 'userSpaceOnUse' } : {}) })
  for (const [offset, cor, opacidade] of paradas) {
    g.append(criar('stop', { offset, 'stop-color': cor, ...(opacidade === undefined ? {} : { 'stop-opacity': opacidade }) }))
  }
  return g
}

/** Os dois acabamentos da parte acesa: o crescente brilha no limbo e se apaga rumo aos chifres; a cheia é um disco luminoso. */
const LUZ: Record<Acabamento, { cx: number; r: number; paradas: Parada[] }> = {
  crescente: { cx: 1, r: 1.5, paradas: [[0, '#FFFFFF'], [0.18, '#F2F2F2'], [0.42, '#BDBDBD'], [0.66, '#5C5C5C'], [0.84, '#262626'], [1, '#161616']] },
  cheia: { cx: 0, r: 1, paradas: [[0, '#F8F8F8'], [0.6, '#EDEDED'], [0.9, '#D4D4D4'], [1, '#B4B4B4']] },
}

/** Cria uma lua dentro do svg (os gradientes vão nas defs dele); `id` diferencia luas do mesmo documento. */
export function criarLua(svg: SVGSVGElement, id: string, acabamento: Acabamento = 'crescente'): Lua {
  let defs = svg.querySelector('defs')
  if (defs === null) {
    defs = criar('defs')
    svg.prepend(defs)
  }
  const luz = LUZ[acabamento]
  const gradLuz = gradiente(`${id}-luz`, luz.cx, 0, luz.r, luz.paradas, true)
  defs.append(
    gradLuz,
    // luz cinérea: o disco apagado é um pouco mais claro que o céu, e mais claro do lado da luz
    gradiente(`${id}-corpo`, 0.68, 0.5, 0.8, [[0, '#1D1D1D'], [0.5, '#181818'], [1, '#131313']]),
    gradiente(`${id}-halo`, 0.5, 0.5, 0.5, [[0, '#FFFFFF', 0.17], [0.4, '#FFFFFF', 0.055], [0.72, '#FFFFFF', 0.014], [1, '#FFFFFF', 0]]),
    gradiente(`${id}-brilho`, 0.5, 0.5, 0.5, [[0, '#FFFFFF', 0.075], [0.55, '#FFFFFF', 0.022], [1, '#FFFFFF', 0]]),
  )
  const g = criar('g')
  const brilho = criar('circle', { cx: 0.15, cy: 0, r: 1.6, fill: `url(#${id}-brilho)` })
  const halo = criar('circle', { cx: 1, cy: 0, r: 1.12, fill: `url(#${id}-halo)` })
  const corpo = criar('circle', { r: 1, fill: `url(#${id}-corpo)` })
  const caminho = criar('path', { d: '', fill: `url(#${id}-luz)` })
  const traco = (r: number, cor: string, largura: number): SVGCircleElement =>
    criar('circle', { r, fill: 'none', stroke: cor, 'stroke-width': largura, 'vector-effect': 'non-scaling-stroke' })
  const aro = traco(1, 'rgba(255,255,255,.12)', 1)
  const coroa = traco(1.012, 'rgba(255,255,255,.1)', 7)
  const anel = traco(1, 'rgba(255,255,255,.92)', 1.25)
  // o halo e o brilho num grupo próprio: na abertura ele respira devagar por CSS (lua-respira), sem mexer no resto
  const respira = criar('g', { class: 'lua-respira' })
  respira.append(brilho, halo)
  g.append(respira, corpo, caminho, aro, coroa, anel)
  svg.append(g)
  return { acabamento, g, luz: caminho, corpo, halo, brilho, aro, coroa, anel, gradLuz, ultimaFase: NaN }
}

/** Põe a lua: centro e raio em px do svg, e o ângulo de onde vem a luz (0 direita, 90 baixo, 180 esquerda). */
export function colocar(lua: Lua, cx: number, cy: number, r: number, ang: number): void {
  lua.g.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${ang.toFixed(2)}) scale(${r.toFixed(3)})`)
}

/** A fase (k de 0, nova, a 1, cheia), em passos de 0,005. No crescente, quanto mais cheia, mais a luz se espalha do limbo para dentro. */
export function fase(lua: Lua, k: number): void {
  const kq = Math.round(k * 200) / 200
  if (kq === lua.ultimaFase) return
  lua.ultimaFase = kq
  lua.luz.setAttribute('d', caminhoDaFase(kq))
  if (lua.acabamento !== 'crescente') return
  const e = Math.min(1, kq / 0.45)
  lua.gradLuz.setAttribute('cx', (1 - 0.72 * e).toFixed(3))
  lua.gradLuz.setAttribute('r', (1.5 + 0.9 * e).toFixed(3))
}
