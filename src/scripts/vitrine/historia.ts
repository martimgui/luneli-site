// A história fixa: a tela do Luneli fica parada enquanto o texto avança em quatro passos, e a tela muda
// junto, ligada à rolagem (não ao relógio). Também: a lua da passagem, a barra de etapas, a profundidade
// das molduras ao entrar (uma vez) e o "Ver o produto". Com movimento reduzido, cada tela fica no estado parado.
//
// O palco (as quatro telas) vive num <template> e só é clonado no computador: no celular cada passo já
// traz a sua tela, e nada do palco é montado nem calculado. A rolagem só trabalha com a seção perto da janela.
import { $, $$, limitar, porQuadro, semMovimento } from './comum'
import { aplicar, estatico } from './telas'

const reduzido = semMovimento()
const movel = matchMedia('(max-width: 859px)')
const caps = $$('.cap')
const etapas = $$<HTMLButtonElement>('.etapa')
const historia = $('#historia')
const mHist = $('#mHist')
const fixo = $('#fixo')
const passagem = $('#produto')
const plDisco = $<SVGCircleElement>('#plDisco')
const plHalo = $<SVGCircleElement>('#plHaloC')
let telas: HTMLElement[] = []
let atual = -1
let perto = true

/** No computador, o palco sai do <template> para dentro da moldura, uma vez. */
function montarPalco(): void {
  if (telas.length > 0 || movel.matches) return
  const molde = document.getElementById('tplPalco')
  if (!(molde instanceof HTMLTemplateElement)) return
  $('.vidro', mHist).append(molde.content.cloneNode(true))
  telas = $$('#mHist .pdv')
  atual = -1
}

/** A altura do palco e a posição em que ele fica preso: centrado na janela, com folga para a barra de etapas. */
function medir(): void {
  if (movel.matches) return
  const vh = innerHeight
  const w = mHist.clientWidth
  if (!w) return
  const alt = Math.round(limitar(w * 0.66, 440, Math.max(440, vh - 130)))
  mHist.style.setProperty('--alturaTela', `${alt}px`)
  fixo.style.setProperty('--fixoTop', `${Math.max(20, Math.round((vh - alt - 50) / 2))}px`)
}

/** A lua da passagem (SVG, sem WebGL) vai de nova a crescente conforme a seção chega. Com WebGL a lua de verdade pousa aqui (abertura.ts). */
const luaGl = document.documentElement.classList.contains('lua-real')
function luaDaPassagem(vh: number, topo: number): void {
  if (luaGl) return
  const e = reduzido ? 1 : limitar((vh - topo) / (vh * 0.75))
  plDisco.setAttribute('transform', `translate(${(-22 * e).toFixed(2)} 0)`)
  plHalo.style.opacity = e.toFixed(3)
}

/** O que a rolagem lê, no evento (com o layout limpo); as escritas ficam para o quadro. */
interface Leitura {
  vh: number
  topoDaPassagem: number
  topos: DOMRect[]
}
let leitura: Leitura | null = null
function ler(): void {
  leitura = { vh: innerHeight, topoDaPassagem: passagem.getBoundingClientRect().top, topos: caps.map((c) => c.getBoundingClientRect()) }
}

function rolar(): void {
  if (leitura === null) ler()
  const { vh, topoDaPassagem, topos } = leitura!
  leitura = null
  const linha = vh * 0.55
  luaDaPassagem(vh, topoDaPassagem)
  if (movel.matches || telas.length === 0) return
  let i = 0
  topos.forEach((r, j) => {
    if (r.top <= linha) i = j
  })
  const r = topos[i]!
  const p = limitar((linha - r.top) / (r.height * 0.78))
  if (i !== atual) {
    atual = i
    telas.forEach((t, j) => t.classList.toggle('vista', j === i))
    caps.forEach((c, j) => c.classList.toggle('ativo', j === i))
  }
  const tela = telas[i]!
  aplicar(tela, reduzido ? estatico(tela) : p)
  // as telas que já passaram ficam no fim; as próximas, no começo
  telas.forEach((t, j) => {
    if (j < i) aplicar(t, 1)
    else if (j > i) aplicar(t, 0)
  })
  etapas.forEach((e, j) => {
    e.classList.toggle('feita', j < i)
    e.classList.toggle('agora', j === i)
    if (j === i) e.setAttribute('aria-current', 'step')
    else e.removeAttribute('aria-current')
    const barra = e.querySelector<HTMLElement>('.tr i')
    if (barra) barra.style.transform = `scaleX(${j < i ? 1 : j === i ? (reduzido ? 0 : p).toFixed(3) : 0})`
  })
}

etapas.forEach((botao, j) =>
  botao.addEventListener('click', () => {
    const c = caps[j]!
    const top = c.getBoundingClientRect().top + scrollY
    scrollTo({ top: Math.round(top - innerHeight * 0.55 + c.offsetHeight * 0.62), behavior: reduzido ? 'auto' : 'smooth' })
    // o leitor de tela e o teclado seguem para o título do passo
    const titulo = c.querySelector<HTMLElement>('h3')
    if (titulo) {
      titulo.tabIndex = -1
      titulo.focus({ preventScroll: true })
    }
  }),
)

const pede = porQuadro(rolar)
const aoRolar = (): void => {
  if (!perto) return
  ler()
  pede()
}
// a rolagem só é ouvida com a passagem ou a história perto da janela
const vigia = new IntersectionObserver(
  (entradas) => {
    perto = entradas.some((e) => e.isIntersecting) || [passagem, historia].some((el) => el.getBoundingClientRect().bottom > -innerHeight && el.getBoundingClientRect().top < innerHeight * 2)
    if (perto) aoRolar()
  },
  { rootMargin: '100% 0px' },
)
vigia.observe(passagem)
vigia.observe(historia)
addEventListener('scroll', aoRolar, { passive: true })
addEventListener(
  'resize',
  porQuadro(() => {
    montarPalco()
    medir()
    rolar()
  }),
)
void document.fonts.ready.then(() => {
  medir()
  rolar()
})
montarPalco()
medir()
rolar()

/* profundidade ao entrar: a tela sai de 0,96 e a luz da borda acende, uma vez */
const molduras = [mHist, ...$$('.sec-tela .moldura')]
if (reduzido) molduras.forEach((m) => m.classList.add('aceso'))
else {
  const observador = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('aceso')
          observador.unobserve(entrada.target)
        }
      }),
    { threshold: 0.22 },
  )
  molduras.forEach((m) => observador.observe(m))
}

$('#verProduto').addEventListener('click', (evento) => {
  evento.preventDefault()
  scrollTo({ top: passagem.getBoundingClientRect().top + scrollY, behavior: reduzido ? 'auto' : 'smooth' })
  passagem.focus({ preventScroll: true })
})
