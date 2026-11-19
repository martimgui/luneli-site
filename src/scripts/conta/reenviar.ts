// "Reenviar e-mail": manda de novo o link de confirmação para o e-mail da sessão.
import { api, esperaDoErro, mensagemDoErro } from '../../lib/api'
import { avisar } from './formulario'

const RESPOSTAS = {
  enviado: 'Enviamos o link de novo. Confira também a caixa de spam.',
  ja_confirmado: 'O seu e-mail já está confirmado.',
  sem_email: 'Esta conta não tem e-mail.',
  email_desligado: 'Este servidor não manda e-mail agora.',
} as const

export async function reenviarConfirmacao(botao: HTMLButtonElement, aviso: HTMLElement): Promise<void> {
  if (botao.disabled) return
  const texto = botao.textContent
  botao.disabled = true
  botao.textContent = 'Enviando…'
  try {
    const { estado } = await api().auth.pedirConfirmacao.mutate()
    avisar(aviso, RESPOSTAS[estado], estado === 'enviado' || estado === 'ja_confirmado' ? 'ok' : 'info')
  } catch (erro) {
    avisar(aviso, mensagemDoErro(erro))
    const espera = esperaDoErro(erro)
    if (espera !== null) {
      botao.textContent = texto
      setTimeout(() => (botao.disabled = false), espera * 1000)
      return
    }
  }
  botao.textContent = texto
  botao.disabled = false
}
