// A história fixa: a tela do Luneli fica parada enquanto o texto avança em quatro passos, e a tela muda
// junto, ligada à rolagem (não ao relógio). Também: o trilho que liga os passos na coluna do texto (acende
// conforme a rolagem), o rastro do pedido 248 sob o palco, a profundidade das molduras ao entrar (uma vez), a
// escala das cópias do tablet e o "Ver o produto". Com movimento reduzido, cada tela fica no estado parado.
//
// O palco (as quatro telas) vive num <template> e só é clonado no computador: no celular e no tablet cada passo
// já traz a sua tela, e nada do palco é montado nem calculado. A rolagem só trabalha com a seção perto da janela,
// e por quadro só a tela atual é atualizada (as vizinhas, só quando o passo muda).
import { $, $$, limitar, porQuadro, semMovimento } from './comum'
import { aplicar, estatico, preparar } from './telas'
import type { Tela } from './telas'

const reduzido = semMovimento()
// até 1149 px a história empilha (CSS): nada do palco é montado nem calculado
const movel = matchMedia('(max-width: 1149px)')
// no tablet as cópias ficam no desenho do computador, encolhidas até a largura da coluna (--escala)
const tablet = matchMedia('(max-width: 1149px) and (min-width: 700px)')
// no celular cada cópia é recortada no trecho que o passo explica, medido pelo elemento (v3, B1 e B5)
const celular = matchMedia('(max-width: 699px)')
const caps = $$('.cap')
const nos = caps.map((c) => c.querySelector<HTMLElement>('.onde .no'))
const historia = $('#historia')
const coluna = $('#caps')
const mHist = $('#mHist')
const fixo = $('#fixo')
const passagem = $('#produto')
const rastroTexto = $('#rastroTexto')
const rastroFz = $$('.rastro-fz')
const rastroPlano = $('#rastroPlano')
let telas: Tela[] = []
let atual = -1
let perto = true
/** O centro de cada nó do trilho, medido a partir do topo da coluna do texto. */
let nosY: number[] = []
let ultimoAvanco = ''
let ultimoRastro = ''

/** No computador, o palco sai do <template> para dentro da moldura, uma vez. */
function montarPalco(): void {
  if (telas.length > 0 || movel.matches) return
  const molde = document.getElementById('tplPalco')
  if (!(molde instanceof HTMLTemplateElement)) return
  // as telas vivem num invólucro que encolhe junto quando o palco é mais estreito que o desenho (--escala)
  const escala = document.createElement('div')
  escala.className = 'palco-escala'
  escala.append(molde.content.cloneNode(true))
  $('.vidro', mHist).append(escala)
  telas = $$('#mHist .pdv').map(preparar)
  atual = -1
}

/** A altura do palco e a posição em que ele fica preso: centrado na janela, com folga para o rastro. */
function medir(): void {
  if (tablet.matches) {
    const w = caps[0]?.querySelector<HTMLElement>('.cap-tela')?.clientWidth ?? 0
    if (w) coluna.style.setProperty('--escala', Math.min(1, w / 820).toFixed(4))
  }
  if (movel.matches) return
  const vh = innerHeight
  const w = mHist.clientWidth
  if (!w) return
  const alt = Math.round(limitar(w * 0.66, 440, Math.max(440, vh - 120)))
  mHist.style.setProperty('--alturaTela', `${alt}px`)
  // as telas são desenhadas com pelo menos 820 px (o desenho de computador; a regra empilhada vale até 790) e encolhem até caber no palco
  mHist.style.setProperty('--escala', Math.min(1, w / 820).toFixed(4))
  fixo.style.setProperty('--fixoTop', `${Math.max(20, Math.round((vh - alt - 40) / 2))}px`)
}

/**
 * O recorte das cópias do celular: do topo do elemento `data-recorte-de` ao pé do mais baixo de
 * `data-recorte-ate`, com 12 px de folga em cima e 24 embaixo. Escreve --recorte (a margem negativa da tela) e
 * --recorte-alt (a altura da moldura). Fora do celular, ou sem os atributos, vale o CSS (75 svh e o px fixo).
 */
function medirRecortes(): void {
  for (const tela of $$('.cap-tela')) {
    const de = tela.dataset.recorteDe
    const ate = tela.dataset.recorteAte
    if (!celular.matches || !de || !ate) {
      tela.style.setProperty('--recorte-alt', '')
      continue
    }
    const pdv = tela.querySelector<HTMLElement>('.moldura.recorta .pdv')
    const alvo = pdv?.querySelector<HTMLElement>(de)
    const fins = pdv ? [...pdv.querySelectorAll<HTMLElement>(ate)] : []
    if (!pdv || !alvo || fins.length === 0) continue
    const topo = pdv.getBoundingClientRect().top
    const inicio = Math.max(0, alvo.getBoundingClientRect().top - topo - 12)
    const fim = Math.max(...fins.map((el) => el.getBoundingClientRect().bottom - topo)) + 24
    tela.style.setProperty('--recorte', `${Math.round(inicio)}px`)
    tela.style.setProperty('--recorte-alt', `${Math.round(fim - inicio)}px`)
  }
}

/** Onde ficam os nós do trilho (o ícone de fase de cada passo): o trilho vai do primeiro ao último. */
function medirTrilho(): void {
  const topo = coluna.getBoundingClientRect().top
  nosY = nos.map((n) => (n ? n.getBoundingClientRect().top + n.offsetHeight / 2 - topo : 0))
  if (nosY.length < 2) return
  coluna.style.setProperty('--trilho-topo', `${Math.round(nosY[0]!)}px`)
  coluna.style.setProperty('--trilho-alt', `${Math.round(nosY[nosY.length - 1]! - nosY[0]!)}px`)
}

/** O que a rolagem lê, no evento (com o layout limpo); as escritas ficam para o quadro. */
interface Leitura {
  vh: number
  topos: DOMRect[]
}
let leitura: Leitura | null = null
function ler(): void {
  leitura = { vh: innerHeight, topos: caps.map((c) => c.getBoundingClientRect()) }
}

function rolar(): void {
  if (leitura === null) ler()
  const { vh, topos } = leitura!
  leitura = null
  const linha = vh * 0.55
  if (movel.matches || telas.length === 0) return
  let i = 0
  topos.forEach((r, j) => {
    if (r.top <= linha) i = j
  })
  const r = topos[i]!
  const p = limitar((linha - r.top) / (r.height * 0.78))
  if (i !== atual) {
    atual = i
    telas.forEach((t, j) => {
      // a tela de agora entra pela direita; as que já passaram saem pela esquerda
      t.raiz.classList.toggle('vista', j === i)
      t.raiz.classList.toggle('antes', j < i)
      // as telas que já passaram ficam no fim; as próximas, no começo (só quando o passo muda)
      if (j < i) aplicar(t, 1)
      else if (j > i) aplicar(t, 0)
    })
    caps.forEach((c, j) => c.classList.toggle('ativo', j === i))
  }
  const tela = telas[i]!
  const instante = reduzido ? estatico(tela.raiz) : p
  aplicar(tela, instante)
  // o trilho acende até o nó do passo atual e avança com a rolagem rumo ao seguinte
  if (nosY.length === caps.length && nosY.length > 1) {
    const total = Math.max(1, nosY[nosY.length - 1]! - nosY[0]!)
    const seguinte = nosY[Math.min(i + 1, nosY.length - 1)]!
    const y = nosY[i]! + (seguinte - nosY[i]!) * (i < nosY.length - 1 ? (reduzido ? 0 : p) : 0)
    const avanco = limitar((y - nosY[0]!) / total).toFixed(3)
    if (avanco !== ultimoAvanco) {
      ultimoAvanco = avanco
      coluna.style.setProperty('--avanco', avanco)
    }
  }
  // o rastro do pedido 248 sob o palco: onde ele está neste passo, antes e depois do momento-chave
  const cap = caps[i]!
  const em = Number(cap.dataset.rastroEm ?? 1)
  const texto = (instante >= em ? cap.dataset.rastroDepois : cap.dataset.rastroAntes) ?? ''
  if (texto !== ultimoRastro) {
    ultimoRastro = texto
    rastroTexto.textContent = texto
    rastroFz.forEach((f, j) => f.classList.toggle('on', j === i))
  }
  const plano = cap.dataset.plano ?? ''
  if (rastroPlano.textContent !== plano) rastroPlano.textContent = plano
}

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
    medirRecortes()
    medirTrilho()
    rolar()
  }),
)
void document.fonts.ready.then(() => {
  medir()
  medirRecortes()
  medirTrilho()
  rolar()
})
montarPalco()
medir()
medirRecortes()
medirTrilho()
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
