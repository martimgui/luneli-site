// O rodapé da página de início: a folha sobe como uma cortina e mostra a lua cheia com a palavra "Luneli"
// atravessando-a, uma peça só: as letras são recortadas da luz (escuras sobre a lua, brancas fora dela). No último
// terço a sombra da Terra cobre a lua e, por onde passa, as letras ficam brancas; o eclipse para em ECLIPSE_FINAL:
// no repouso sobra um crescente de luz que continua recortando o nome, com o anel fino por trás. Tudo ligado à
// rolagem, só atributos de SVG, transform e opacidade, e só com o rodapé perto da janela. A frase, o botão e os
// links entram por uma transição CSS (classe .r-visto, v3, B10): o script só desenha o eclipse.
// q = quanto da cortina já subiu: 0 quando o rodapé começa a aparecer, 1 no fim da
// página. No celular, frase, botão e links entram entre 35 % e 55 % da cortina (só a lua segue animada); no
// computador o botão acende em 0,5. Com movimento reduzido, tudo já está no fim. Quando a cortina não cabe na
// janela (zoom alto, celular deitado), o rodapé vira um bloco normal.
import { luneta } from '../../lib/fase-da-lua'
import { $, limitar, opacidade, porQuadro, semMovimento } from './comum'
import { colocar, criarLua } from './lua'



const reduzido = semMovimento()
const vao = $('#rVao')
const rodape = $('#rodape')
const svg = $<SVGSVGElement>('#rSvg')
const ceu = $<SVGGElement>('#rCeu')
const luzG = $<SVGGElement>('#rLuz')
const recorteDaLuz = $<SVGPathElement>('#rcCaminho')
const palavra = $<SVGTextElement>('#rPalavra')
const recorte = $<SVGTextElement>('#rRecorte')
const cena = $('.r-cena', rodape)

const sai = (x: number): number => 1 - Math.pow(1 - x, 3)
const curvaDaLua = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const r = (q: number, a: number, d: number): number => limitar((q - a) / d)

/* ===== a lua: o disco e os anéis atrás da palavra; a parte acesa na frente dela, recortando as letras ===== */
const lua = criarLua(svg, 'lr', 'cheia')
ceu.append(lua.g)
lua.luz.id = 'rLuzCaminho'
luzG.append(lua.luz)

let ultimoEc = -1
/** A sombra da Terra entra pelo alto, da esquerda, e cobre a lua (ec de 0 a 1, em passos de 0,005); a parte acesa é a luneta que sobra. */
function sombra(ec: number): void {
  const ecq = Math.round(ec * 200) / 200
  if (ecq === ultimoEc) return
  ultimoEc = ecq
  const s = 1 - ecq
  const d = luneta(0, 0, 1, -2.3 * s, -0.55 * s, 1.04)
  lua.luz.setAttribute('d', d)
  // o recorte das letras é o mesmo caminho, num <path> próprio do clipPath (sem <use>). Sem nada aceso a cópia
  // escura some de vez: um recorte vazio não é confiável (o Chrome chegou a mostrar as letras escuras inteiras
  // no fim do eclipse), então o caminho vira um ponto fora da lua e o texto fica invisível.
  const aceso = d !== ''
  recorteDaLuz.setAttribute('d', aceso ? d : 'M-9 -9h0.001v0.001z')
  recorte.style.visibility = aceso ? 'visible' : 'hidden'
}

let celular = innerWidth < 860

function pintar(q: number): void {
  const vis = sai(r(q, 0.12, 0.4))
  opacidade(ceu, vis)
  opacidade(luzG, vis)
  opacidade(palavra, vis)
  opacidade(recorte, vis)
  // a lua começa cheia e a sombra preenche o disco inteiro (ec -> 1, eclipse total) no fim da página
  const ec = curvaDaLua(r(q, 0.35, 0.55))
  sombra(ec)
  opacidade(lua.halo, 1 - 0.85 * ec)
  opacidade(lua.brilho, 1 - 0.75 * ec)
  // no celular, sem o anel de fora nem a coroa (v3, C1): só o aro fino a 35 %
  const ane = celular ? 0 : sai(r(q, 0.8, 0.2))
  opacidade(lua.anel, ane * 0.5)
  opacidade(lua.coroa, ane * 0.6)
  opacidade(lua.aro, celular ? 0.35 : 0.55)
  // a frase, o botão e os links entram juntos por CSS (.r-visto), uma vez por cruzamento do limiar: no celular a
  // 0,35 da cortina, no computador a 0,4 (o CSS escalona frase, botão e links em 60 ms)
  visto(solto || q >= (celular ? 0.35 : 0.4))
}

let vistoAgora = false
function visto(sim: boolean): void {
  if (sim === vistoAgora) return
  vistoAgora = sim
  rodape.classList.toggle('r-visto', sim)
}

/**
 * A composição: a lua no meio da cena e a palavra atravessando-a, mais larga que o disco (o anel passa por trás
 * das letras, acima e abaixo). No celular a cena é recortada para a lua ocupar a largura.
 */
function caber(): void {
  celular = innerWidth < 860
  svg.setAttribute('viewBox', celular ? '250 0 500 560' : '0 0 1000 560')
  // a lua com pelo menos 0,8 da largura da palavra (v3, C1): computador 500/620, celular 410/468
  const R = celular ? 205 : 250
  const W = celular ? 468 : 620
  colocar(lua, 500, 280, R, 0)
  const quadro = `translate(500 280) scale(${R})`
  luzG.setAttribute('transform', quadro)
  recorteDaLuz.setAttribute('transform', quadro)
  palavra.style.fontSize = '172px'
  const b = palavra.getBBox()
  const f = (172 * W) / Math.max(1, b.width)
  palavra.style.fontSize = `${f.toFixed(1)}px`
  recorte.style.fontSize = palavra.style.fontSize
  // o vão escuro em volta das letras, que interrompe o anel
  palavra.setAttribute('stroke-width', (f * 0.03).toFixed(1))
  const b2 = palavra.getBBox()
  const y = (Number(palavra.getAttribute('y')) + (280 - (b2.y + b2.height / 2))).toFixed(1)
  palavra.setAttribute('y', y)
  recorte.setAttribute('y', y)
}

function progresso(): number {
  if (solto) {
    // solto (v3): o rodapé rola como um bloco; a lua anda pela posição da própria cena na janela, e chega ao fim
    // (o crescente de ECLIPSE_FINAL) antes do pé da página
    const c = cena.getBoundingClientRect()
    return limitar((innerHeight - c.top) / (c.height + innerHeight * 0.3))
  }
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
  rodape.classList.add('r-decidido')
  if (solto) pintar(reduzido ? 1 : progresso())
}

let perto = false
let q = 0
const pede = porQuadro(() => pintar(q))
const aoRolar = (): void => {
  if (!perto) return
  q = progresso()
  pede()
}

caber()
soltar()
void document.fonts.ready.then(() => {
  caber()
  soltar()
  if (reduzido) pintar(1)
})
addEventListener(
  'resize',
  porQuadro(() => {
    caber()
    soltar()
    if (!reduzido) pintar(progresso())
    else pintar(1)
  }),
)

if (reduzido) pintar(1)
else {
  // a rolagem só é ouvida com o rodapé a menos de uma tela de distância. Esconder o rodapé fixo enquanto está
  // longe (visibility: hidden) foi tentado e desfeito: a pintura dele passava a acontecer no meio da rolagem,
  // num quadro só de 160 a 230 ms no celular (CPU 4x); pintado uma vez no carregamento, ele fica em cache no
  // compositor e custa quase nada por quadro.
  new IntersectionObserver(
    (entradas) => {
      perto = entradas.some((e) => e.isIntersecting)
      aoRolar()
    },
    { rootMargin: '100% 0px' },
  ).observe(vao)
  addEventListener('scroll', aoRolar, { passive: true })
  pintar(progresso())
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
