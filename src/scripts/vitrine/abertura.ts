// A abertura: a lua nasce atrás do título em eclipse (anel finíssimo no escuro → a luz nasce → a mensagem
// entra), em cerca de 2,6 s, uma vez por visita. Depois, de tempos em tempos, um ponto âmbar corre sobre o
// limbo aceso enquanto a página está no topo. Com movimento reduzido, tudo já começa no fim.
//
// Com WebGL, a lua é a de verdade (scripts/vitrine/lua.ts: mapas de cor e relevo da NASA) num canvas fixo que
// cobre a abertura e a passagem: ela fica no lugar enquanto o título sobe, cresce de fio a crescente conforme a
// rolagem e encolhe até pousar no lugar da lua pequena da passagem, de onde segue com a página. Sem WebGL,
// ficam os elementos de CSS de sempre (disco escuro deslizando sobre a imagem da lua cheia).
import { $, LUA, SAI, caixa, circulo, limitar, opacidade, porQuadro, rad, rampa, semMovimento, tracejado, transformar } from './comum'
import { TONS_DA_LUA, criarRenderizador, temWebGL } from './lua'
import type { Lua, Renderizador } from './lua'

const hero = $('#hero')
const noite = $('#noite')
const msg = $('#msg')
const h1 = $('#h1')
const sub = $('#sub')
const acoes = $('#acoes')
const lua = $('#hLua')
const luz = $('#hLuz')
const disco = $('#hDisco')
const halo = $('#hHalo')
const brilho = $('#hBrilho')
const coroa = $('#hCoroa')
const anel = $('#hAnel')
const aro = $('#hAro')
const svg = $<SVGSVGElement>('#hFio')
const gDica = $<SVGGElement>('#hDica')
const dicaPonta = $<SVGCircleElement>('#hDicaPonta')
const pLua = $<SVGSVGElement>('#pLua')
const canvas = $<HTMLCanvasElement>('#luaGl')

const reduzido = semMovimento()
// ?ha=1.5 congela a abertura num instante, só no `astro dev` (conferência de tela); no site publicado não existe.
const congelado = ((): number | null => {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(location.search).get('ha')
  const n = v === null || v === '' ? NaN : Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
})()
const FIM = 2.6
/** Quanto a lua vai esperar pelas texturas antes de começar a abertura mesmo lisa (ms). */
const ESPERA_PELAS_TEXTURAS = 1400

interface Geometria {
  cx: number
  cy: number
  r: number
  ang: number
  faixa: number
  EX: number
  pendurada: boolean
  /** O topo da abertura na página (a lua de WebGL é fixa na janela e precisa saber onde a abertura está). */
  topo: number
}
// A altura da janela vem de um elemento de prova com 100svh, lido uma vez por medição: no celular, a barra
// do navegador que some e volta não muda a lua nem a altura da abertura.
const prova = document.createElement('div')
prova.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none'
document.body.append(prova)
const alturaDaJanela = (): number => Math.max(prova.offsetHeight || innerHeight, 600)

let G: Geometria | null = null
let tA = 0
let dicaT = 0
let antes: number | null = null

const NS = 'http://www.w3.org/2000/svg'
interface Camada {
  w: number
  c: string
  L: number
}
interface Rastro {
  g: SVGGElement
  camadas: { p: SVGPathElement; L: number }[]
  len: number
  trilha: SVGPathElement
}
let dica: Rastro | null = null

/** Um rastro afunilado sobre um arco de círculo: o ponto âmbar que corre pelo limbo. */
function rastro(O: { x: number; y: number }, R: number, g1: number, g2: number, alvo: SVGGElement, camadas: Camada[]): Rastro {
  const ponto = (g: number): [number, number] => [O.x + R * Math.cos(rad(g)), O.y + R * Math.sin(rad(g))]
  const a = ponto(g1)
  const b = ponto(g2)
  const sentido = g2 > g1 ? 1 : 0
  const d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)} A${R} ${R} 0 0 ${sentido} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`
  const g = document.createElementNS(NS, 'g')
  const feitas = camadas.map((cm) => {
    const p = document.createElementNS(NS, 'path')
    p.setAttribute('d', d)
    p.setAttribute('fill', 'none')
    p.setAttribute('stroke', cm.c)
    p.setAttribute('stroke-width', String(cm.w))
    p.setAttribute('stroke-linecap', 'round')
    g.append(p)
    return { p, L: cm.L }
  })
  alvo.append(g)
  const trilha = feitas[0]!.p
  const len = trilha.getTotalLength()
  for (const c of feitas) {
    c.p.style.strokeDasharray = `${c.L} ${len + c.L + 10}`
    c.p.style.strokeDashoffset = String(c.L)
  }
  return { g, camadas: feitas, len, trilha }
}

/** O tom da luz muda com a hora do dia: neutro no almoço, quente à tarde, azulado à noite. */
const tomDaHora = ((): number => {
  const h = new Date().getHours()
  return h >= 10 && h < 15 ? 0 : h >= 15 && h < 18 ? 1 : 2
})()

/* ===== a lua de verdade (WebGL) ===== */
const gl: Renderizador | null = reduzido || !temWebGL() ? null : criarRenderizador(canvas)
const comGl = gl !== null || (reduzido && temWebGL())
// com movimento reduzido a lua é desenhada uma vez, parada, com a página (o canvas deixa de ser fixo)
const glParado: Renderizador | null = gl === null && comGl ? criarRenderizador(canvas) : null
const renderizador = gl ?? glParado
document.documentElement.classList.toggle('lua-real', renderizador !== null)
document.documentElement.classList.toggle('lua-parada', glParado !== null)
if (renderizador === null) canvas.remove()
/** O topo do invólucro da noite na página (o canvas parado é absoluto dentro dele). */
let noiteTopo = 0

/** A luz da lua sem WebGL: a imagem da lua cheia, mais clara no limbo; o disco escuro faz a fase. */
function pintarLuz(el: HTMLElement): void {
  el.style.background = 'url(/lua/cheia.webp) center / 100% 100% no-repeat'
}

interface Lugar {
  cx: number
  cy: number
  r: number
}
/** A lua pequena da passagem, na página (o lugar onde a lua de WebGL pousa). */
let pouso: Lugar = { cx: 0, cy: 0, r: 0 }
function medirPouso(): void {
  const b = pLua.getBoundingClientRect()
  pouso = { cx: b.left + b.width / 2, cy: b.top + b.height / 2 + scrollY, r: b.width * 0.34 }
}

/**
 * A geometria: a lua inteira nasce atrás do título e o limbo aceso fica embaixo, embalando a mensagem,
 * como a lua nova logo depois do pôr do sol. No celular ela fica no alto, acima do título.
 */
function montar(): void {
  const w = document.documentElement.clientWidth
  const h = alturaDaJanela()
  const movel = w < 860
  const topoCab = movel ? 64 : 80
  hero.style.height = ''
  const mh = msg.offsetHeight
  const th = h1.offsetHeight
  let alt = h
  if (movel) {
    const r = Math.round(Math.min(w * 0.36, h * 0.17))
    const cy = topoCab + 20 + r
    const topo = cy + r + 34
    msg.style.top = `${topo}px`
    alt = Math.max(h, topo + mh + 56)
    G = { cx: Math.round(w / 2), cy, r, ang: 90, faixa: Math.round(r * 0.1), EX: 0, pendurada: true, topo: 0 }
  } else {
    let topo = Math.round((h - mh) / 2 + 4)
    topo = Math.max(topoCab + 40, topo)
    msg.style.top = `${topo}px`
    const cy = Math.round(topo - th * 0.06)
    const fundo = topo + mh + 88
    const r = Math.round(fundo - cy)
    alt = Math.max(h, fundo + 44)
    G = { cx: Math.round(w / 2), cy, r, ang: 90, faixa: Math.round(r * 0.075), EX: 0, pendurada: false, topo: 0 }
  }
  hero.style.height = `${alt}px`
  // a caixa da mensagem nasce invisível (sem salto de layout) e só aparece depois de medida
  msg.style.visibility = 'visible'
  G.topo = hero.getBoundingClientRect().top + scrollY
  noiteTopo = noite.getBoundingClientRect().top + scrollY
  const { cx, cy, r, ang, faixa } = G
  const EX = Math.max(8, Math.round(faixa * 0.5))
  G.EX = EX
  circulo(lua, cx, cy, r)
  circulo(aro, cx, cy, r)
  circulo(anel, cx, cy, r)
  const Rd = r + EX
  caixa(disco, { x: r - Rd, y: r - Rd, w: 2 * Rd, h: 2 * Rd })
  const borda = (100 * (1 - (EX * 1.2) / Rd)).toFixed(3)
  // luz cinérea: o disco escuro é um pouco mais claro que o céu e mais claro do lado da luz
  disco.style.background = `radial-gradient(circle at 50% 78%, #1A1C22 0%, #16181D 52%, #131519 ${borda}%, rgba(19,21,25,0) 100%)`
  pintarLuz(luz)
  const Lx = cx + r * Math.cos(rad(ang))
  const Ly = cy + r * Math.sin(rad(ang))
  // os chifres do crescente se apagam antes de chegar ao título
  const mascara = G.pendurada ? '' : `linear-gradient(180deg,transparent 0,transparent ${Math.round(r * 1.1)}px,#000 ${Math.round(r * 1.64)}px)`
  luz.style.maskImage = mascara
  circulo(halo, Lx, Ly, Math.round(r * 1.05))
  halo.style.background = 'radial-gradient(closest-side, rgba(214,222,236,.13), rgba(214,222,236,.045) 42%, rgba(214,222,236,.012) 72%, transparent)'
  caixa(brilho, { x: Math.round(cx - r * 1.5), y: Math.round(cy - r * 1.3), w: Math.round(r * 3), h: Math.round(r * 2.6) })
  brilho.style.background = 'radial-gradient(closest-side, rgba(206,216,232,.06), rgba(206,216,232,.02) 55%, transparent)'
  circulo(coroa, cx, cy, r * 1.06)
  coroa.style.background = 'radial-gradient(closest-side, transparent 93.6%, rgba(236,240,246,.15) 94.4%, rgba(236,240,246,.04) 97%, transparent 100%)'

  // o ponto âmbar que, de tempos em tempos, corre sobre o limbo aceso (da esquerda para a direita, por baixo)
  svg.setAttribute('width', String(w))
  svg.setAttribute('height', String(alt))
  svg.setAttribute('viewBox', `0 0 ${w} ${alt}`)
  gDica.textContent = ''
  const abertura = G.pendurada ? 62 : 50
  dica = rastro({ x: cx, y: cy }, r + 1.5, 90 + abertura, 90 - abertura, gDica, [
    { w: 7, c: 'rgba(242,182,107,.16)', L: movel ? 70 : 150 },
    { w: 2.2, c: 'rgba(242,182,107,.7)', L: movel ? 120 : 260 },
    { w: 1.2, c: 'rgba(255,214,160,.55)', L: movel ? 200 : 420 },
  ])
  opacidade(dica.g, 0)
  opacidade(dicaPonta, 0)
  medirPouso()
  renderizador?.medir()
}

/** A mensagem da abertura, no instante t (segundos). */
function pintarMensagem(t: number): void {
  const vh = rampa(t, 0.95, 0.95)
  const vs = rampa(t, 1.12, 0.95)
  const va = rampa(t, 1.28, 0.9)
  opacidade(h1, vh)
  transformar(h1, `translateY(${((1 - vh) * 12).toFixed(2)}px)`)
  opacidade(sub, vs)
  transformar(sub, `translateY(${((1 - vs) * 8).toFixed(2)}px)`)
  opacidade(acoes, va)
  transformar(acoes, `translateY(${((1 - va) * 6).toFixed(2)}px)`)
}

/** A abertura em eclipse feita de CSS (sem WebGL), no instante t. */
function pintarCss(t: number): void {
  if (G === null) return
  const esp = G.faixa * rampa(t, 0.55, 1.75, LUA)
  const an = rampa(t, 0, 0.28, (x) => x) * (1 - rampa(t, 1.0, 1.0, SAI))
  const desl = esp > 0.05 ? esp + G.EX : 0
  const dx = -Math.cos(rad(G.ang)) * desl
  const dy = -Math.sin(rad(G.ang)) * desl
  transformar(disco, `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`)
  const f = esp / G.faixa
  opacidade(luz, esp > 0.05 ? 1 : 0)
  opacidade(halo, f)
  opacidade(brilho, f)
  opacidade(anel, an * 0.95)
  opacidade(coroa, an)
  opacidade(aro, 0.35 + 0.65 * Math.max(f, an))
}

/**
 * A lua de WebGL no instante t da abertura e na rolagem y. Fica fixa na janela enquanto o título sobe,
 * cresce de fio (180°) a crescente e encolhe até o lugar da lua da passagem; dali segue com a página.
 */
let ultimoQuadro = ''
function pintarGl(t: number, y: number): void {
  if (G === null || renderizador === null) return
  const vh = alturaDaJanela()
  const f = rampa(t, 0.55, 1.75, LUA)
  const an = rampa(t, 0, 0.28, (x) => x) * (1 - rampa(t, 1.0, 1.0, SAI))
  const heroCx = G.cx
  const heroCy = G.topo + G.cy
  let L: Lua
  if (glParado !== null) {
    // parada, com a página: a lua da abertura e a da passagem, as duas desenhadas no mesmo canvas (absoluto na noite)
    const luas: Lua[] = [
      { cx: heroCx, cy: heroCy - noiteTopo, r: G.r, theta: 166, phi: 0, halo: 1, anel: 0, tom: TONS_DA_LUA[tomDaHora] },
      { cx: pouso.cx, cy: pouso.cy - noiteTopo, r: pouso.r, theta: 118, phi: 62, halo: 0.8, tom: TONS_DA_LUA[tomDaHora] },
    ]
    renderizador.desenhar(luas)
    return
  }
  // o fim da passagem de bastão: a lua pequena chega ao seu lugar de leitura
  const chegada = Math.max(1, pouso.cy - vh * 0.42)
  const e = limitar(y / chegada)
  const k = LUA(e)
  const cx = heroCx + (pouso.cx - heroCx) * k
  const cy = heroCy + (pouso.cy - y - heroCy) * k
  const r = G.r + (pouso.r - G.r) * k
  // depois de pousar, continua crescendo enquanto a passagem sobe
  const e2 = limitar((y - chegada) / (vh * 0.5))
  const theta = 180 - 14 * f - 48 * e - 22 * e2
  const phi = 62 * e + 18 * e2
  if (cy + r * 1.3 < 0) {
    // já saiu pelo alto: nada a desenhar
    if (ultimoQuadro !== 'vazio') {
      ultimoQuadro = 'vazio'
      renderizador.desenhar([])
    }
    return
  }
  L = { cx, cy, r, theta, phi, halo: f * (1 - 0.25 * k), anel: an, aro: 0.35 + 0.65 * Math.max(f, an), tom: TONS_DA_LUA[tomDaHora] }
  const chave = `${cx.toFixed(1)},${cy.toFixed(1)},${r.toFixed(2)},${theta.toFixed(2)},${phi.toFixed(2)},${f.toFixed(3)},${an.toFixed(3)}`
  if (chave === ultimoQuadro) return
  ultimoQuadro = chave
  renderizador.desenhar([L])
}

function pintar(t: number): void {
  pintarMensagem(t)
  if (renderizador === null) pintarCss(t)
  else pintarGl(t, scrollY)
}

/** O ponto âmbar corre o limbo uma vez só, emendado no fim da abertura. Devolve se ainda está passando. */
function pontoNoHorizonte(dt: number): boolean {
  if (dica === null) return false
  const ESPERA = 0
  const DURACAO = 2.6
  dicaT += dt
  const c = dicaT - ESPERA
  // com a lua de WebGL fixa na janela, o ponto só faz sentido com a página no topo
  if (c >= DURACAO || (renderizador !== null && scrollY > 8)) {
    opacidade(dica.g, 0)
    opacidade(dicaPonta, 0)
    return false
  }
  const pr = c < 0 ? -1 : LUA(c / DURACAO)
  const vis = pr >= 0 ? Math.min(1, pr * 9, (1 - pr) * 7) : 0
  if (vis > 0) {
    const andou = dica.len * pr
    for (const cm of dica.camadas) tracejado(cm.p, cm.L - andou)
    const pt = dica.trilha.getPointAtLength(andou)
    transformar(dicaPonta, `translate(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px)`)
  }
  opacidade(dica.g, vis)
  opacidade(dicaPonta, vis * 0.9)
  return true
}

let rodando = false
function quadro(agora: number): void {
  const dt = antes === null ? 0 : Math.min(0.1, (agora - antes) / 1000)
  antes = agora
  if (tA < FIM) tA = Math.min(FIM, tA + dt)
  pintar(tA)
  // depois da abertura o ponto passa uma vez, e então o laço para: nada mais se move sozinho
  const passando = tA < FIM || pontoNoHorizonte(dt)
  if (!passando) {
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

function iniciar(): void {
  montar()
  if (gl === null) {
    comecar()
    // parada: o quadro único é refeito quando as texturas chegam
    if (glParado !== null) void glParado.pronto.then(pintarGlDeNovo)
    return
  }
  // a abertura espera as texturas um pouco, para a luz já nascer sobre as crateras
  let comecou = false
  const vai = (): void => {
    if (comecou) return
    comecou = true
    comecar()
  }
  void gl.pronto.then(() => {
    if (comecou) pintarGlDeNovo()
    else vai()
  })
  setTimeout(vai, ESPERA_PELAS_TEXTURAS)
}

/** Redesenha o quadro atual (texturas que chegaram, janela que mudou). */
function pintarGlDeNovo(): void {
  ultimoQuadro = ''
  pintar(instanteParado())
}

iniciar()
// Tab logo depois de carregar: a mensagem já aparece inteira, sem esperar a abertura
msg.addEventListener(
  'focusin',
  () => {
    if (tA < FIM) {
      tA = FIM
      pintar(tA)
    }
  },
  { once: true },
)
void document.fonts.ready.then(() => {
  montar()
  if (reduzido || congelado !== null || tA >= FIM) pintarGlDeNovo()
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
    pintarGlDeNovo()
  }),
)

// a rolagem move a lua de WebGL (só com a abertura ou a passagem perto da janela; o canvas é fixo)
if (gl !== null) {
  let perto = true
  const pede = porQuadro(() => {
    if (perto) pintarGl(instanteParado(), scrollY)
  })
  new IntersectionObserver(
    (entradas) => {
      perto = entradas.some((e) => e.isIntersecting)
      canvas.style.visibility = perto ? '' : 'hidden'
      if (perto) pede()
    },
    { rootMargin: '20% 0px' },
  ).observe(noite)
  addEventListener('scroll', pede, { passive: true })
  // as texturas podem chegar depois da abertura começar: o próximo quadro já as usa
}
