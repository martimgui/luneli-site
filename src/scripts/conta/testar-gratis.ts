// "Testar grátis": cria o restaurante e o dono (conta.criar, que já abre a sessão e manda o e-mail
// de confirmação), grava o telefone do dono e mostra "Confira o seu e-mail".
import { api, causaDoErro, errosDoFormulario, esperaDoErro, mensagemDoErro, servidorIndisponivel } from '../../lib/api'
import { SENHA_MINIMA, fusoDoNavegador, fusoDoRestaurante, telefoneDoDono } from '../../lib/conta'
import { Formulario, avisar, elemento } from './formulario'
import { reenviarConfirmacao } from './reenviar'

const CAMPOS = ['nomeDoRestaurante', 'nomeDoDono', 'email', 'telefone', 'senha', 'endereco'] as const
type Campo = (typeof CAMPOS)[number]
const form = new Formulario<Campo>('form-criar', CAMPOS)

// A chave da criação de conta no servidor: desligada, a rota nem existe.
void api()
  .sistema.configuracao.query()
  .then((config) => {
    if (!config.criacaoDeConta) {
      avisar(elemento('aviso-config'), 'A criação de conta não está ligada neste servidor.', 'erro')
      form.botao.disabled = true
    }
  })
  .catch(() => undefined)

function conferir(): { erros: Partial<Record<Campo, string>>; ddd: string | null; e164: string | null } {
  const erros: Partial<Record<Campo, string>> = {}
  if (form.valor('nomeDoRestaurante').trim() === '') erros.nomeDoRestaurante = 'Informe o nome do restaurante.'
  if (form.valor('nomeDoDono').trim() === '') erros.nomeDoDono = 'Informe o seu nome.'
  const email = form.valor('email').trim()
  if (email === '') erros.email = 'Informe o e-mail.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = 'Confira o e-mail.'
  const telefone = telefoneDoDono(form.valor('telefone'))
  if (form.valor('telefone').trim() === '') erros.telefone = 'Informe o telefone com DDD.'
  else if (!telefone.ok) erros.telefone = 'Use um telefone do Brasil com DDD, como (11) 98765-4321.'
  if (form.valor('senha').length < SENHA_MINIMA) erros.senha = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  return { erros, ddd: telefone.ok ? telefone.ddd : null, e164: telefone.ok ? telefone.e164 : null }
}

/** O telefone do dono, gravado depois de a conta existir. Falhar aqui não desfaz a conta. */
async function gravarTelefone(nome: string, email: string, telefone: string, senha: string): Promise<string | null> {
  try {
    await api().auth.alterarMeusDados.mutate({ nome, email, telefone, senhaAtual: senha })
    return null
  } catch (erro) {
    const causa = causaDoErro(erro)
    if (causa?.tipo === 'telefone_em_uso') return 'Este telefone já é usado por outra conta. Você pode pôr outro depois, nos seus dados dentro do sistema.'
    return 'A conta foi criada, mas o telefone não foi gravado. Você pode pôr o telefone depois, nos seus dados dentro do sistema.'
  }
}

form.form.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  if (form.botao.disabled || form.emEspera()) return
  form.geral(null)
  const { erros, ddd, e164 } = conferir()
  if (form.mostrarErros(erros) || ddd === null || e164 === null) return

  const nomeDoDono = form.valor('nomeDoDono').trim()
  const email = form.valor('email').trim()
  const senha = form.valor('senha')
  const endereco = form.valor('endereco').trim()
  form.ocupado(true, 'Criando a conta…')
  let codigo: string
  let emailEnviado: boolean
  try {
    const criada = await api().conta.criar.mutate({
      nomeDoRestaurante: form.valor('nomeDoRestaurante').trim(),
      dddPadrao: ddd,
      fusoHorario: fusoDoRestaurante(fusoDoNavegador()),
      nomeDoDono,
      email,
      senha,
      // Sem endereço, o campo nem vai: o servidor recusa nulo.
      ...(endereco === '' ? {} : { endereco }),
    })
    codigo = criada.codigoDoRestaurante
    emailEnviado = criada.emailEnviado
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
    // O DDD e o fuso saem do telefone e do navegador: um erro neles aparece no telefone ou no geral.
    const { campos, geral } = errosDoFormulario(erro, [...CAMPOS, 'dddPadrao', 'fusoHorario'] as const, { email_em_uso: 'email' })
    const { dddPadrao, fusoHorario, ...doFormulario } = campos
    if (dddPadrao) doFormulario.telefone = dddPadrao
    form.mostrarErros(doFormulario)
    form.geral(fusoHorario ?? geral)
    return
  }

  form.ocupado(true, 'Gravando o telefone…')
  const avisoDoTelefone = await gravarTelefone(nomeDoDono, email, e164, senha)
  form.campo('senha').value = ''
  elemento('email-enviado').textContent = email
  // O servidor diz se o link saiu de fato: sem isso o dono ficaria esperando um e-mail que não vem.
  elemento('texto-enviado').hidden = !emailEnviado
  elemento('texto-nao-enviado').hidden = emailEnviado
  elemento('codigo-criado').textContent = codigo
  if (avisoDoTelefone !== null) avisar(elemento('aviso-telefone'), avisoDoTelefone, 'info')
  elemento('etapa-formulario').hidden = true
  elemento('etapa-confira').hidden = false
  elemento('h-pagina').textContent = 'Conta criada'
  elemento('h-pagina').setAttribute('tabindex', '-1')
  elemento('h-pagina').focus()
})

elemento<HTMLButtonElement>('reenviar').addEventListener('click', (e) => void reenviarConfirmacao(e.currentTarget as HTMLButtonElement, elemento('aviso-reenvio')))
