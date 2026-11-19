// O rodapé da página de início: a folha sobe como uma cortina, a lua cheia aparece inteira e a sombra da Terra
// a cobre (eclipse), deixando o anel e a palavra. Tudo ligado à rolagem, só transform e opacidade, e só com o
// rodapé perto da janela. q = quanto da cortina já subiu: 0 quando o rodapé começa a aparecer, 1 no fim da
// página. Com movimento reduzido, tudo já está no fim. Quando a cortina não cabe na janela (zoom alto, celular
// deitado), o rodapé vira um bloco normal.
// Com WebGL a lua é a de verdade (scripts/vitrine/lua.ts) num canvas atrás do SVG; sem WebGL, o SVG faz tudo.
import { $, limitar, opacidade, porQuadro, semMovimento, transformar } from './comum'
import { TONS_DA_LUA, criarRenderizador, temWebGL } from './lua'

const reduzido = semMovimento()
const vao = $('#rVao')
const rodape = $('#rodape')
const cena = $('.r-cena', rodape)
const svg = $<SVGSVGElement>('#rSvg')
const palavra = $<SVGTextElement>('#rPalavra')
const ceu = $<SVGGElement>('#rCeu')
const disco = $<SVGCircleElement>('#rDisco')
const halo = $<SVGCircleElement>('#rHalo')
const anel = $<SVGCircleElement>('#rAnel')
const coroa = $<SVGCircleElement>('#rCoroa')
const referencia = $<SVGCircleElement>('#rLuaRef')
const canvas = $<HTMLCanvasElement>('#rLua')
const frase = $('#rFrase')
const acoes = $('#rAcoes')
const links = $('.r-links', rodape)
const fim = $('#rFim')

const sai = (x: number): number => 1 - Math.pow(1 - x, 3)
const lua = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const r = (q: number, a: number, d: number): number => limitar((q - a) / d)

/** Um atributo de SVG escrito só quando muda. */
const escrito = new Map<Element, string>()
function atributo(el: Element, nome: string, valor: string): void {
  const chave = `${nome}`
  if (escrito.get(el) === chave + valor) return
  escrito.set(el, chave + valor)
  el.setAttribute(nome, valor)
}

/* ===== a lua de verdade ===== */
const gl = temWebGL() ? criarRenderizador(canvas) : null
rodape.classList.toggle('r-gl', gl !== null)
if (gl === null) canvas.remove()
const tomDaHora = ((): number => {
  const h = new Date().getHours()
  return h >= 10 && h < 15 ? 0 : h >= 15 && h < 18 ? 1 : 2
})()
/** A lua dentro do canvas (px de CSS), com folga em volta para o halo. */
let luaNoCanvas = { cx: 0, cy: 0, r: 0 }
function colocar(): void {
  if (gl === null) return
  const b = referencia.getBoundingClientRect()
  const c = cena.getBoundingClientRect()
  const folga = Math.round(b.width * 0.19)
  canvas.style.left = `${(b.left - c.left - folga).toFixed(1)}px`
  canvas.style.top = `${(b.top - c.top - folga).toFixed(1)}px`
  canvas.style.width = `${(b.width + 2 * folga).toFixed(1)}px`
  canvas.style.height = `${(b.height + 2 * folga).toFixed(1)}px`
  luaNoCanvas = { cx: folga + b.width / 2, cy: folga + b.height / 2, r: b.width / 2 }
  gl.medir()
}
let ultimoQuadro = ''
/** A lua cheia, e a sombra da Terra que entra pelo canto de baixo à direita (ec de 0 a 1). */
function pintarLua(ec: number, forcar = false): void {
  if (gl === null) return
  const chave = `${ec.toFixed(4)}|${luaNoCanvas.r.toFixed(1)}`
  if (!forcar && chave === ultimoQuadro) return
  ultimoQuadro = chave
  const s = 1.7 * (1 - ec)
  gl.desenhar([{ ...luaNoCanvas, theta: 9, phi: 20, halo: 0.9, aro: 0.6, expo: 1.35, sombra: [s, s, 1.04, 1], tom: TONS_DA_LUA[tomDaHora] }])
}

function pintar(q: number): void {
  const vis = sai(r(q, 0.12, 0.4))
  opacidade(ceu, vis)
  if (gl !== null) opacidade(canvas, vis)
  // a lua cheia aparece inteira; no último terço a sombra da Terra a cobre: eclipse
  const ec = lua(r(q, 0.58, 0.32))
  const o = 52 * (1 - ec)
  atributo(disco, 'transform', `translate(${o.toFixed(2)} ${o.toFixed(2)})`)
  pintarLua(ec)
  // a palavra nasce de dentro da sombra, só depois de ela cobrir o meio do disco
  const ep = sai(limitar((ec - 0.78) / 0.22))
  opacidade(palavra, ep)
  atributo(palavra, 'transform', `translate(0 ${((1 - ep) * 26).toFixed(1)})`)
  const ane = sai(r(q, 0.86, 0.14))
  opacidade(anel, ane * 0.92)
  opacidade(coroa, ane)
  opacidade(halo, 1 - 0.6 * ec)
  const partes: [HTMLElement, number, number][] = [
    [frase, 0.66, 14],
    [acoes, 0.74, 10],
    [links, 0.82, 6],
    [fim, 0.86, 6],
  ]
  for (const [el, a, y] of partes) {
    const e = sai(r(q, a, 0.14))
    opacidade(el, e)
    transformar(el, `translateY(${((1 - e) * y).toFixed(2)}px)`)
  }
}

/**
 * A palavra cabe inteira dentro do disco: o anel nunca cruza as letras. No celular a cena é recortada
 * para a lua ocupar a largura, e a palavra fica do tamanho que a tela permite.
 */
function caber(): void {
  svg.setAttribute('viewBox', innerWidth < 860 ? '250 0 500 560' : '0 0 1000 560')
  palavra.style.fontSize = '172px'
  const b = palavra.getBBox()
  const meia = Math.hypot(b.width / 2, b.height / 2)
  const f = (172 * 236) / meia
  palavra.style.fontSize = `${f.toFixed(1)}px`
  const b2 = palavra.getBBox()
  palavra.setAttribute('y', (338 + (280 - (b2.y + b2.height * 0.53))).toFixed(1))
  colocar()
}

function progresso(): number {
  const b = vao.getBoundingClientRect()
  return limitar(1 - b.top / b.height)
}

/** Quando a cortina não cabe na janela (zoom alto, celular deitado), o rodapé vira um bloco normal, que rola. */
let solto = false
function soltar(): void {
  rodape.classList.remove('r-solto')
  vao.classList.remove('r-solto')
  solto = rodape.scrollHeight > rodape.clientHeight + 1
  rodape.classList.toggle('r-solto', solto)
  vao.classList.toggle('r-solto', solto)
  if (solto) {
    colocar()
    pintar(1)
  }
}

let perto = false
let q = 0
const pede = porQuadro(() => pintar(q))
const aoRolar = (): void => {
  if (!perto) return
  q = solto ? 1 : progresso()
  pede()
}

caber()
soltar()
void document.fonts.ready.then(() => {
  caber()
  soltar()
  if (reduzido || solto) pintar(1)
})
if (gl !== null) {
  // as texturas chegam depois: o quadro atual é refeito com as crateras
  void gl.pronto.then(() => pintarLua(reduzido || solto ? 1 : lua(r(q, 0.58, 0.32)), true))
}
addEventListener(
  'resize',
  porQuadro(() => {
    caber()
    soltar()
    ultimoQuadro = ''
    if (!reduzido) pintar(solto ? 1 : progresso())
    else pintar(1)
  }),
)

if (reduzido) pintar(1)
else {
  // a rolagem só é ouvida com o rodapé a menos de uma tela de distância
  new IntersectionObserver(
    (entradas) => {
      perto = entradas.some((e) => e.isIntersecting)
      aoRolar()
    },
    { rootMargin: '100% 0px' },
  ).observe(vao)
  addEventListener('scroll', aoRolar, { passive: true })
  pintar(solto ? 1 : progresso())
  // o foco pelo teclado num link do rodapé traz a cortina inteira
  rodape.addEventListener('focusin', () => {
    if (!solto && progresso() < 0.999) scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' })
  })
}

$('#rTopo').addEventListener('click', (evento) => {
  evento.preventDefault()
  scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' })
  $('.marca').focus({ preventScroll: true })
})
