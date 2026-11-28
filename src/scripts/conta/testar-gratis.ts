// "Criar conta": cria a conta pessoal (conta.criarPessoa) e leva ao Portal (/minha-conta/portal/).
import { api, errosDoFormulario, esperaDoErro, mensagemDoErro, servidorIndisponivel } from '../../lib/api'
import { SENHA_MINIMA, telefoneDoDono } from '../../lib/conta'
import { Formulario, avisar, elemento } from './formulario'

const CAMPOS = ['nome', 'email', 'telefone', 'senha'] as const
type Campo = (typeof CAMPOS)[number]
const form = new Formulario<Campo>('form-criar', CAMPOS)

void api()
  .sistema.configuracao.query()
  .then((config: any) => {
    if (!config.criacaoDeConta) {
      avisar(elemento('aviso-config'), 'A criação de conta não está ligada neste servidor.', 'erro')
      form.botao.disabled = true
    }
  })
  .catch(() => undefined)

function conferir(): { erros: Partial<Record<Campo, string>>; e164: string | null } {
  const erros: Partial<Record<Campo, string>> = {}
  if (form.valor('nome').trim() === '') erros.nome = 'Informe o seu nome.'
  const email = form.valor('email').trim()
  if (email === '') erros.email = 'Informe o e-mail.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = 'Confira o e-mail.'
  const telefone = telefoneDoDono(form.valor('telefone'))
  if (form.valor('telefone').trim() === '') erros.telefone = 'Informe o telefone com DDD.'
  else if (!telefone.ok) erros.telefone = 'Use um telefone do Brasil com DDD, como (11) 98765-4321.'
  if (form.valor('senha').length < SENHA_MINIMA) erros.senha = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  return { erros, e164: telefone.ok ? telefone.e164 : null }
}

form.form.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  if (form.botao.disabled || form.emEspera()) return
  form.geral(null)
  const { erros, e164 } = conferir()
  if (form.mostrarErros(erros) || e164 === null) return

  form.ocupado(true, 'Criando sua conta…')
  try {
    await api().conta.criarPessoa.mutate({
      nome: form.valor('nome').trim(),
      email: form.valor('email').trim(),
      telefone: e164,
      senha: form.valor('senha'),
    })
    form.campo('senha').value = ''
    location.assign('/minha-conta/portal/')
  } catch (erro) {
    form.ocupado(false)
    const espera = esperaDoErro(erro)
    if (espera !== null) {
      form.esperar(espera)
      return
    }
    if (servidorIndisponivel(erro)) {
      form.geral(mensagemDoErro(erro))
      return
    }
    const { campos, geral } = errosDoFormulario(erro, CAMPOS, { email_em_uso: 'email', telefone_em_uso: 'telefone' })
    form.mostrarErros(campos)
    form.geral(geral)
  }
})
