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
