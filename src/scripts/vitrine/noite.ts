// A noite inteira, num sistema só: a lua pequena cruza o arco (nasce à esquerda, se põe à direita) conforme a
// seção entra na janela, a fase engorda de nova a cheia, o arco acende por onde ela passou, cada nó acende quando
// a lua chega a ele e a linha de baixo mostra o texto da etapa alcançada. A posição anda em passos de 0,005, com
// os pontos do arco medidos uma vez: por quadro só atributos e classes, e só o que mudou, só com a seção perto da
// janela. Com movimento reduzido, tudo já está no fim. Sem script, o CSS deixa tudo aceso.
import { caminhoDaFase } from '../../lib/fase-da-lua'
import { $, $$, limitar, porQuadro, semMovimento } from './comum'

const reduzido = semMovimento()
const ceu = $('#nCeu')
const arcoAceso = $<SVGPathElement>('#nArcoAceso')
const lua = $<SVGGElement>('#nLua')
const fase = $<SVGPathElement>('#nFase')
const nos = $$<SVGCircleElement>('#nCeu .no')
const eventos = $$('.noite-eventos .n-ev')
const linha = $('#nLinhaTexto')
const textos = eventos.map((e) => e.dataset.texto ?? '')
const N = nos.length
const comprimento = arcoAceso.getTotalLength()
arcoAceso.style.strokeDasharray = '1000'
const PASSOS = 200
const pontos = Array.from({ length: PASSOS + 1 }, (_, i) => {
  const pt = arcoAceso.getPointAtLength((comprimento * i) / PASSOS)
  return `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`
})
let ultimo = -1
let ultimoAtivo = -1

function pintar(p: number): void {
  const passo = Math.round(limitar(p) * PASSOS)
  if (passo === ultimo) return
  ultimo = passo
  const q = passo / PASSOS
  arcoAceso.style.strokeDashoffset = (1000 * (1 - q)).toFixed(2)
  lua.setAttribute('transform', pontos[passo]!)
  fase.setAttribute('d', caminhoDaFase(Math.max(0.02, q)))
  let ativo = -1
  // v3 (B6): o nó acende quando a lua está a menos de meio intervalo dele (arredonda), não só depois de passar:
  // o último nó e o texto dele chegam juntos com a lua (antes, o "Fechamento" só acendia em 0,998)
  nos.forEach((no, i) => {
    const aceso = q >= (i - 0.5) / (N - 1)
    if (aceso) ativo = i
    no.classList.toggle('aceso', aceso)
    eventos[i]?.classList.toggle('aceso', aceso)
  })
  const mostrado = Math.max(0, ativo)
  if (mostrado !== ultimoAtivo) {
    ultimoAtivo = mostrado
    linha.textContent = textos[mostrado] ?? ''
    eventos.forEach((e, i) => e.classList.toggle('ativo', i === mostrado))
  }
}

/**
 * No computador: 0 quando o céu começa a entrar por baixo; 1 quando ele está inteiro na janela, com folga. No
 * celular e no tablet estreito (v3, B6): pelo centro da área "arco + frase", de 85 % a 35 % da janela, para a lua
 * andar enquanto o leitor está olhando para ela (antes, os seis nós acendiam com o arco ainda na metade de baixo).
 */
const estreito = matchMedia('(max-width: 859px)')
function progresso(): number {
  const r = ceu.getBoundingClientRect()
  const vh = innerHeight
  if (estreito.matches) return limitar((vh * 0.68 - (r.top + r.height / 2)) / (vh * 0.42))
  return limitar((vh * 0.68 - r.top) / (vh * 0.53))
}

if (reduzido) pintar(1)
else {
  let perto = false
  let p = 0
  const pede = porQuadro(() => {
    if (perto) pintar(p)
  })
  const aoRolar = (): void => {
    if (!perto) return
    p = progresso()
    pede()
  }
  new IntersectionObserver(
    (entradas) => {
      perto = entradas.some((e) => e.isIntersecting)
      aoRolar()
    },
    { rootMargin: '30% 0px' },
  ).observe(ceu)
  addEventListener('scroll', aoRolar, { passive: true })
  addEventListener('resize', aoRolar)
  p = progresso()
  pintar(p)
}
