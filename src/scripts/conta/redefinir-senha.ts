// O link "criar senha nova": o token vem no fragmento (#token=...), é lido e tirado do endereço logo
// de cara, e fica só na memória desta página.
import { api, causaDoErro, errosDeValidacao, esperaDoErro, mensagemDoErro } from '../../lib/api'
import { SENHA_MINIMA, lerETirarTokenDoEndereco } from '../../lib/conta'
import { Formulario, avisar, elemento } from './formulario'

const LINK_INVALIDO = 'Este link não vale mais (já foi usado, venceu ou foi substituído). Peça outro.'
let token = lerETirarTokenDoEndereco()
const aviso = elemento('aviso-link')
const depois = elemento('depois')
const form = new Formulario('form-redefinir', ['senhaNova', 'repeticao'] as const)

function semLink(texto = LINK_INVALIDO): void {
  token = null
  avisar(aviso, texto, 'erro')
  form.form.hidden = true
  // Sem link válido, a ação principal é pedir outro: só a apresentação dos dois links muda.
  const entrar = depois.querySelector<HTMLElement>('a[href="/entrar/"]')
  const outro = depois.querySelector<HTMLElement>('a[href="/esqueci-a-senha/"]')
  if (entrar && outro) {
    entrar.className = 'btn tres'
    outro.className = 'btn um'
    outro.style.order = '-1'
  }
  depois.hidden = false
}

async function conferir(): Promise<void> {
  if (token === null) return semLink('O link está incompleto. Abra de novo o link do e-mail, ou peça outro.')
  elemento('acoes-tentar').hidden = true
  avisar(aviso, 'Conferindo o link…', 'info')
  try {
    const { valido } = await api().auth.conferirRecuperacao.mutate({ token })
    if (!valido) return semLink()
    avisar(aviso, null)
    form.form.hidden = false
    form.campo('senhaNova').focus()
  } catch (erro) {
    if (errosDeValidacao(erro) !== null) return semLink()
    // Servidor fora ou muitas tentativas: o link não foi gasto, e o token continua na memória para tentar de novo.
    avisar(aviso, mensagemDoErro(erro), 'erro')
    elemento('acoes-tentar').hidden = false
  }
}

elemento('tentar-de-novo').addEventListener('click', () => void conferir())

form.form.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  if (form.botao.disabled || form.emEspera() || token === null) return
  form.geral(null)
  const senhaNova = form.valor('senhaNova')
  const repeticao = form.valor('repeticao')
  const erros = {
    senhaNova: senhaNova.length < SENHA_MINIMA ? `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` : undefined,
    repeticao: senhaNova.length >= SENHA_MINIMA && senhaNova !== repeticao ? 'As senhas não são iguais.' : undefined,
  }
  if (form.mostrarErros(erros)) return
  form.ocupado(true, 'Trocando…')
  try {
    await api().auth.redefinirPelaRecuperacao.mutate({ token, senhaNova })
    token = null
    form.form.hidden = true
    avisar(aviso, 'Senha trocada. Entre com a senha nova.', 'ok')
    depois.hidden = false
  } catch (erro) {
    form.ocupado(false)
    if (causaDoErro(erro)?.tipo === 'recuperacao_invalida') return semLink()
    const espera = esperaDoErro(erro)
    if (espera !== null) return form.esperar(espera)
    const senha = errosDeValidacao(erro)?.campos.senhaNova?.[0]
    if (senha) form.mostrarErros({ senhaNova: senha })
    else form.geral(mensagemDoErro(erro))
  }
})

void conferir()
