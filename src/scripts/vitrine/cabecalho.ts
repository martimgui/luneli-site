// O cabeçalho compacto e fixo da página de início: fica escondido sobre a abertura; a partir do fim dela, some
// ao descer e volta ao subir. Só uma classe e aria-hidden, uma vez por quadro de rolagem, sem ler layout
// (a altura da abertura é medida no carregamento e ao redimensionar).
import { $, porQuadro } from './comum'

const cab = $('#cabFixo')
const hero = $('#hero')

let limite = 0
let ultimoY = scrollY
let visto = false
/** Com o foco dentro do cabeçalho fixo, ele não se esconde (v3, B4): o Tab seguinte continua de onde estava. */
let comFoco = false

/** O cabeçalho só pode aparecer depois que a abertura saiu da janela (com uma folga de 80 px). */
function medir(): void {
  limite = hero.getBoundingClientRect().top + scrollY + hero.offsetHeight - 80
}

function mostrar(sim: boolean): void {
  if (!sim && comFoco) return
  if (sim === visto) return
  visto = sim
  cab.classList.toggle('visto', sim)
  cab.setAttribute('aria-hidden', String(!sim))
  cab.inert = !sim
}

function ler(): void {
  const y = scrollY
  if (y < limite) mostrar(false)
  else if (y < ultimoY - 2) mostrar(true)
  else if (y > ultimoY + 2) mostrar(false)
  ultimoY = y
}

cab.addEventListener('focusin', () => {
  comFoco = true
  mostrar(true)
})
cab.addEventListener('focusout', (evento) => {
  if (evento.relatedTarget instanceof Node && cab.contains(evento.relatedTarget)) return
  comFoco = false
  requestAnimationFrame(() => {
    if (!comFoco) ler()
  })
})

medir()
ler()
addEventListener('scroll', porQuadro(ler), { passive: true })
addEventListener(
  'resize',
  porQuadro(() => {
    medir()
    ler()
  }),
)
void document.fonts.ready.then(medir)
