// A abertura: a lua minimalista nasce atrás do título em eclipse (anel finíssimo no escuro → a luz nasce num fio
// de lua por baixo), em cerca de 2,6 s, uma vez por visita. A mensagem é posicionada e mostrada pelo CSS (visível
// desde a primeira pintura, só com um deslize curto); este script só lê onde ela está para pôr a lua atrás dela
// (computador) ou acima dela (celular). A lua mora num quadro preso à janela (position: sticky) que cobre a
// noite: no computador ela fica no lugar enquanto o título sobe, a fase cresce de fio a crescente e ela se apaga
// antes da passagem; no celular ela sobe com a página (nunca fica sob o texto) e se apaga do mesmo jeito. Tudo em
// SVG, nítido em qualquer tamanho. Com movimento reduzido, a lua é desenhada uma vez, parada, e rola com a página.
// As leituras de layout ficam no evento de rolagem (antes de qualquer escrita); o quadro só escreve.
import { $, LUA, SAI, limitar, opacidade, porQuadro, rampa, semMovimento } from './comum'
import { colocar, criarLua, fase } from './lua'
import { criarRenderizador, temWebGL } from './lua-gl'
import type { Renderizador } from './lua-gl'

const hero = $('#hero')
const noite = $('#noite')
const quadroDaLua = $('#luaFixa')
const svg = $<SVGSVGElement>('#luaSvg')
const canvas = $<HTMLCanvasElement>('#luaGl')
const msg = $('#msg')
const h1 = $('#h1')

const reduzido = semMovimento()
// ?ha=1.5 congela a abertura num instante, só no `astro dev` (conferência de tela); no site publicado não existe.
const congelado = ((): number | null => {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(location.search).get('ha')
  const n = v === null || v === '' ? NaN : Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
})()
const FIM = 2.6
/** A fração acesa no fim da abertura: um fio de lua (no celular um pouco mais, com as pontas finas). */
const FIO = { computador: 0.045, celular: 0.05 }
/** Até onde a fase cresce enquanto a lua se apaga na rolagem. */
const CRESCE = 0.3

interface Geometria {
  cx: number
  /** O centro na página (não na janela). */
  cy: number
  r: number
  celular: boolean
}
// A altura da janela vem de um criar de prova com 100svh, lido uma vez por medição: no celular, a barra
// do navegador que some e volta não muda a lua nem a altura da abertura.
const prova = document.createElement('div')
prova.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none'
document.body.append(prova)
const alturaDaJanela = (): number => Math.max(prova.offsetHeight || innerHeight, 600)

let G: Geometria | null = null
let noiteTopo = 0
let noiteAltura = 0
let tA = 0
let antes: number | null = null
let ultimoQuadro = ''
/** O que a rolagem lê, no evento: a posição e o topo do quadro preso (ele sai com a noite quando ela acaba). */
let leitura = { y: scrollY, topo: 0 }

document.documentElement.classList.toggle('lua-parada', reduzido)
const renderizador: Renderizador | null = !reduzido && temWebGL() ? criarRenderizador(canvas) : null
if (renderizador !== null) {
  svg.style.display = 'none'
  void renderizador.pronto.then((ok) => {
    if (ok) pintarDeNovo()
  })
} else {
  canvas.style.display = 'none'
}
const lua = criarLua(svg, 'lh')

/**
 * A geometria: no computador a lua inteira nasce atrás do título e o limbo aceso fica embaixo, embalando a
 * mensagem, como a lua nova logo depois do pôr do sol. No celular ela ocupa a faixa entre o cabeçalho e a
 * mensagem (o CSS reserva pelo menos 22 svh para ela e ancora a mensagem no pé da primeira tela).
 */
function montar(): void {
  const w = document.documentElement.clientWidth
  const h = alturaDaJanela()
  const celular = w < 860
  const topoCab = celular ? 64 : 80
  const heroTopo = hero.getBoundingClientRect().top + scrollY
  const caixa = msg.getBoundingClientRect()
  const topo = caixa.top + scrollY
  const mh = caixa.height
  const th = h1.offsetHeight
  if (celular) {
    const faixaTopo = heroTopo + topoCab + 12
    const faixaFundo = topo - 24
    const r = Math.round(Math.min(w * 0.4, h * 0.19, Math.max(0, (faixaFundo - faixaTopo) / 2)))
    G = { cx: Math.round(w / 2), cy: Math.round((faixaTopo + faixaFundo) / 2), r, celular }
  } else {
    const cy = Math.round(topo - th * 0.06)
    const fundo = topo + mh + 104
    G = { cx: Math.round(w / 2), cy, r: Math.round(fundo - cy), celular }
  }
  noiteTopo = noite.getBoundingClientRect().top + scrollY
  noiteAltura = noite.offsetHeight
  // o quadro da lua: a janela inteira, preso a ela (ou a noite inteira, parado, com movimento reduzido)
  const altQuadro = reduzido ? noiteAltura : h
  quadroDaLua.style.height = reduzido ? '' : `${h}px`
  quadroDaLua.style.marginBottom = reduzido ? '' : `${-h}px`
  svg.setAttribute('viewBox', `0 0 ${w} ${altQuadro}`)
  renderizador?.medir()
  ultimoQuadro = ''
}

/**
 * A lua no instante t da abertura e na rolagem y (px). No computador fica no lugar enquanto o título sobe, cresce
 * de fio a crescente e se apaga em três quartos da janela; no celular sobe com a página e se apaga em três quintos.
 */
function pintarLua(t: number, y: number, topoDoQuadro: number): void {
  if (G === null) return
  const vh = alturaDaJanela()
  const f = rampa(t, 0.55, 1.75, LUA)
  const an = rampa(t, 0, 0.28, (x) => x) * (1 - rampa(t, 1.0, 1.0, SAI))
  const fio = (G.celular ? FIO.celular : FIO.computador) * f
  const e = limitar(y / (vh * (G.celular ? 0.6 : 0.75)))
  const kk = LUA(e)
  const k = fio + (CRESCE - fio) * kk
  const r = G.r * (1 - (G.celular ? 0.2 : 0.3) * kk)
  const cyJanela = G.celular ? G.cy - y : G.cy - vh * 0.22 * kk
  const ang = 90 + 60 * kk
  const sumico = limitar((e - 0.35) / 0.65)
  const op = 1 - SAI(sumico)
  const chave = `${cyJanela.toFixed(1)},${r.toFixed(2)},${k.toFixed(4)},${f.toFixed(3)},${an.toFixed(3)},${op.toFixed(3)},${topoDoQuadro.toFixed(1)}`
  if (chave === ultimoQuadro) return
  ultimoQuadro = chave
  if (renderizador !== null) {
    if (op <= 0.001 || cyJanela + r * 1.7 < 0) {
      canvas.style.opacity = '0'
      renderizador.desenhar([])
      return
    }
    canvas.style.opacity = op.toFixed(3)
    const theta = Math.max(92, 180 - 18 * f - 70 * kk)
    const phi = 54 * kk
    const intensidade = 1 - 0.35 * kk
    renderizador.desenhar([
      {
        cx: G.cx,
        cy: cyJanela - topoDoQuadro,
        r,
        theta,
        phi,
        halo: f * (1 - 0.25 * kk),
        anel: an,
        aro: 0.35 + 0.65 * Math.max(f, an),
        tom: [1.03 * intensidade, 0.99 * intensidade, 0.92 * intensidade],
      },
    ])
    return
  }
  if (op <= 0.001 || cyJanela + r * 1.7 < 0) {
    lua.g.style.visibility = 'hidden'
    return
  }
  lua.g.style.visibility = ''
  colocar(lua, G.cx, cyJanela - topoDoQuadro, r, ang)
  fase(lua, k)
  opacidade(lua.g, op)
  // v3 (C2): o corpo apagado some duas vezes mais rápido que o limbo aceso: o último resto visível é o fio de luz,
  // não uma mancha cinza atrás dos botões
  opacidade(lua.corpo, Math.max(0, 1 - 2 * sumico))
  opacidade(lua.halo, f * (1 - 0.3 * kk))
  opacidade(lua.brilho, f * (1 - 0.5 * kk))
  opacidade(lua.anel, an * 0.95)
  opacidade(lua.coroa, an)
  opacidade(lua.aro, 0.35 + 0.65 * Math.max(f, an))
}

/** Com movimento reduzido: a lua parada, com a página (o quadro cobre a noite inteira). */
function pintarParado(): void {
  if (G === null) return
  colocar(lua, G.cx, G.cy - noiteTopo, G.r, 90)
  fase(lua, G.celular ? FIO.celular : FIO.computador)
  opacidade(lua.g, 1)
  opacidade(lua.halo, 1)
  opacidade(lua.brilho, 1)
  opacidade(lua.anel, 0)
  opacidade(lua.coroa, 0)
  opacidade(lua.aro, 1)
}

function pintar(t: number): void {
  if (reduzido) pintarParado()
  else pintarLua(t, leitura.y, leitura.topo)
}

let rodando = false
function quadro(agora: number): void {
  const dt = antes === null ? 0 : Math.min(0.1, (agora - antes) / 1000)
  antes = agora
  if (tA < FIM) tA = Math.min(FIM, tA + dt)
  pintar(tA)
  // depois da abertura o laço para: nada mais se move sozinho
  if (tA >= FIM) {
    rodando = false
    return
  }
  requestAnimationFrame(quadro)
}

function instanteParado(): number {
  return reduzido ? 99 : (congelado ?? tA)
}

function comecar(): void {
  if (reduzido || congelado !== null) {
    pintar(instanteParado())
    return
  }
  pintar(tA)
  if (!rodando) {
    rodando = true
    antes = null
    requestAnimationFrame(quadro)
  }
}

/** Lê a rolagem e o quadro (no evento, com o layout limpo) e redesenha a lua. */
function ler(): void {
  leitura = { y: scrollY, topo: reduzido ? 0 : quadroDaLua.getBoundingClientRect().top }
}

/** Redesenha o quadro atual (fontes que chegaram, janela que mudou). */
function pintarDeNovo(): void {
  ultimoQuadro = ''
  ler()
  pintar(instanteParado())
}

ler()
montar()
comecar()
void document.fonts.ready.then(() => {
  montar()
  pintarDeNovo()
})
let ultimaLargura = document.documentElement.clientWidth
addEventListener(
  'resize',
  porQuadro(() => {
    const w = document.documentElement.clientWidth
    // em tela de toque só a largura importa (girar o aparelho): a altura muda com a barra do navegador
    if (matchMedia('(pointer: coarse)').matches && w === ultimaLargura) return
    ultimaLargura = w
    montar()
    pintarDeNovo()
  }),
)

// a rolagem move a lua (só com a noite perto da janela): a leitura fica no evento, a escrita no quadro
if (!reduzido) {
  let perto = true
  const pede = porQuadro(() => {
    if (perto) pintarLua(instanteParado(), leitura.y, leitura.topo)
  })
  const aoRolar = (): void => {
    if (!perto) return
    ler()
    pede()
  }
  new IntersectionObserver(
    (entradas) => {
      perto = entradas.some((e) => e.isIntersecting)
      if (perto) aoRolar()
    },
    { rootMargin: '20% 0px' },
  ).observe(noite)
  addEventListener('scroll', aoRolar, { passive: true })
}
