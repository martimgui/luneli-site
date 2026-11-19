// O link "confirmar e-mail": o token vem no fragmento, sai do endereço na hora e é usado uma vez.
import { api, errosDeValidacao, mensagemDoErro } from '../../lib/api'
import { lerETirarTokenDoEndereco } from '../../lib/conta'
import { avisar, elemento } from './formulario'
import { irParaEntrar, sessaoAtual } from './sessao'

const PLANO = '/minha-conta/plano'
const MENSAGENS = {
  confirmado: 'E-mail confirmado. Agora escolha o seu plano.',
  em_uso: 'Este e-mail já é usado por outra conta.',
  expirado: 'O link venceu. Peça outro em Minha conta, no botão "Reenviar e-mail".',
  invalido: 'Este link não vale mais. Se precisar, peça outro em Minha conta.',
} as const

let token = lerETirarTokenDoEndereco()
const aviso = elemento('aviso-confirmacao')

function resultado(estado: keyof typeof MENSAGENS): void {
  token = null
  avisar(aviso, MENSAGENS[estado], estado === 'confirmado' ? 'ok' : 'erro')
  elemento('acoes-tentar').hidden = true
  elemento('acoes-confirmado').hidden = estado !== 'confirmado'
  elemento('acoes-outros').hidden = estado === 'confirmado'
  if (estado === 'confirmado') elemento('escolher-plano').focus()
}

async function confirmar(): Promise<void> {
  if (token === null) return resultado('invalido')
  avisar(aviso, 'Confirmando…', 'info')
  try {
    const { estado } = await api().auth.confirmarEmail.mutate({ token })
    resultado(estado)
  } catch (erro) {
    // Um token que o servidor nem aceita como entrada não vale.
    if (errosDeValidacao(erro) !== null) return resultado('invalido')
    // Muitas tentativas ou servidor fora: o link não foi gasto, e dá para tentar de novo.
    avisar(aviso, mensagemDoErro(erro), 'erro')
    elemento('acoes-tentar').hidden = false
  }
}

elemento('tentar-de-novo').addEventListener('click', () => void confirmar())
elemento('escolher-plano').addEventListener('click', async () => {
  // Confirmar pode encerrar as outras sessões da pessoa: sem sessão aqui, entrar primeiro.
  try {
    const sessao = await sessaoAtual()
    if (sessao === null) irParaEntrar(PLANO)
    else location.assign(PLANO)
  } catch {
    irParaEntrar(PLANO)
  }
})

void confirmar()
