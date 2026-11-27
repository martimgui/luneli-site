// O PDV de dia: o seletor Escuro/Claro troca o tema da tela na hora (só cor, 250 ms).
import { $ } from './comum'

const tela = $('#dia .pdv')
const moldura = $('#dia .moldura')
const legenda = $('#dia .legenda-tela')
const escuro = $<HTMLButtonElement>('#tEsc')
const claro = $<HTMLButtonElement>('#tCla')

function tema(ehClaro: boolean): void {
  tela.classList.toggle('claro', ehClaro)
  moldura.setAttribute('aria-label', ehClaro ? 'A tela de pedido do Luneli no tema claro.' : 'A tela de pedido do Luneli no tema escuro.')
  legenda.innerHTML = ehClaro
    ? '<b>Tela de pedido</b> · tema claro · as mesmas teclas e o mesmo desenho do escuro'
    : '<b>Tela de pedido</b> · tema escuro · as mesmas teclas e o mesmo desenho do claro'
  escuro.setAttribute('aria-pressed', String(!ehClaro))
  claro.setAttribute('aria-pressed', String(ehClaro))
}

escuro.addEventListener('click', () => tema(false))
claro.addEventListener('click', () => tema(true))

// Seletor das 8 cores na tela #dia
const corBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dia-cor]'))
corBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const cor = btn.dataset.diaCor
    if (!cor) return
    corBtns.forEach((b) => b.classList.toggle('is-active', b === btn))
    tela.style.setProperty('--p-acao', cor)
    tela.style.setProperty('--p-acao-borda', `color-mix(in srgb, ${cor} 50%, transparent)`)
    tela.style.setProperty('--p-acao-bg', `color-mix(in srgb, ${cor} 16%, transparent)`)
  })
})

// Interatividade da tela de Pedido dentro de #dia
const tipos = Array.from(document.querySelectorAll<HTMLElement>('#dia .pd-cli .seg > span'))
const pagamentos = Array.from(document.querySelectorAll<HTMLElement>('#dia .pd-fech .seg > span'))
const btnFinalizar = document.querySelector<HTMLElement>('#dia .pd-fech .fim .bt')
const regSpan = document.querySelector<HTMLElement>('#dia .pd-fech .fim .registrado')
const feLinhas = Array.from(document.querySelectorAll<HTMLElement>('#dia .pd-fech .fe'))
const totalEl = document.querySelector<HTMLElement>('#dia .pd-fech .tot .num')

let ehDelivery = true
let registrado = true

function atualizarValores(): void {
  const entregaValor = ehDelivery ? '6,00' : '0,00'
  const totalValor = ehDelivery ? 'R$ 80,00' : 'R$ 74,00'
  const entregaLinha = feLinhas[1]?.querySelector('.num')
  if (entregaLinha) entregaLinha.textContent = entregaValor
  if (totalEl) totalEl.textContent = totalValor
  const regTotal = regSpan?.querySelector('span')
  if (regTotal) {
    regTotal.innerHTML = `<b>Pedido 248 registrado</b><br />Total ${totalValor}`
  }
}

tipos.forEach((opt) => {
  opt.addEventListener('click', () => {
    tipos.forEach((o) => o.classList.remove('at'))
    opt.classList.add('at')
    ehDelivery = opt.textContent?.trim() === 'Delivery'
    atualizarValores()
  })
})

pagamentos.forEach((opt) => {
  opt.addEventListener('click', () => {
    pagamentos.forEach((o) => o.classList.remove('at'))
    opt.classList.add('at')
  })
})

btnFinalizar?.addEventListener('click', () => {
  registrado = !registrado
  regSpan?.classList.toggle('on', registrado)
  btnFinalizar.classList.toggle('pronto', !registrado)
})
