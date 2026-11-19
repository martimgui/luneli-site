// "Esqueci a senha": pede o link de troca de senha (auth.pedirRecuperacao). A resposta é a mesma,
// exista a conta ou não.
import { api, esperaDoErro, mensagemDoErro } from '../../lib/api'
import { Formulario } from './formulario'

const form = new Formulario('form-esqueci', ['email'] as const)

form.form.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  if (form.botao.disabled || form.emEspera()) return
  form.geral(null)
  const email = form.valor('email').trim()
  if (form.mostrarErros({ email: email === '' ? 'Informe o e-mail.' : undefined })) return
  form.ocupado(true)
  try {
    await api().auth.pedirRecuperacao.mutate({ email })
    form.ocupado(false)
    form.geral('Se houver uma conta com este e-mail, o link chega em alguns minutos. Confira também a caixa de spam.', 'ok')
  } catch (erro) {
    form.ocupado(false)
    const espera = esperaDoErro(erro)
    if (espera !== null) form.esperar(espera)
    else form.geral(mensagemDoErro(erro))
  }
})
