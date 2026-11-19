// "Entrar": o login do PDV (auth.entrar). O dono entra só com o e-mail, sem o código do restaurante.
import { api, causaDoErro, esperaDoErro, mensagemDoErro } from '../../lib/api'
import { destinoSeguro } from '../../lib/conta'
import { Formulario, avisar, elemento } from './formulario'
import { sessaoAtual } from './sessao'

const CAMPOS = ['identificacao', 'senha'] as const
const form = new Formulario<(typeof CAMPOS)[number]>('form-entrar', CAMPOS)
const destino = destinoSeguro(new URLSearchParams(location.search).get('voltar'))

void sessaoAtual()
  .then((sessao) => {
    if (sessao === null) return
    const aviso = elemento('aviso-ja-entrou')
    aviso.hidden = false
    aviso.innerHTML = ''
    aviso.append(`Você já entrou como ${sessao.funcionario.nome} (${sessao.restaurante.nome}). `)
    const link = document.createElement('a')
    link.href = destino
    link.className = 'ligacao'
    link.textContent = 'Continuar'
    aviso.append(link)
  })
  .catch(() => undefined)

function mostrarEscolha(restaurantes: { restauranteId: string; nome: string }[]): void {
  form.form.hidden = true
  elemento('escolher').hidden = false
  const lista = elemento('lista-restaurantes')
  lista.innerHTML = ''
  for (const r of restaurantes) {
    const li = document.createElement('li')
    const botao = document.createElement('button')
    botao.type = 'button'
    botao.className = 'btn dois'
    botao.textContent = r.nome
    botao.addEventListener('click', async () => {
      botao.disabled = true
      try {
        await api().auth.escolherRestaurante.mutate({ restauranteId: r.restauranteId })
        location.assign(destino)
      } catch (erro) {
        botao.disabled = false
        avisar(elemento('aviso-escolher'), mensagemDoErro(erro))
      }
    })
    li.append(botao)
    lista.append(li)
  }
  lista.querySelector('button')?.focus()
}

form.form.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  if (form.botao.disabled || form.emEspera()) return
  form.geral(null)
  const identificacao = form.valor('identificacao').trim()
  const senha = form.valor('senha')
  if (form.mostrarErros({ identificacao: identificacao === '' ? 'Informe o e-mail.' : undefined, senha: senha === '' ? 'Informe a senha.' : undefined })) return
  form.ocupado(true, 'Entrando…')
  try {
    const resposta = await api().auth.entrar.mutate({ identificacao, senha })
    form.campo('senha').value = ''
    if (resposta.entrou) {
      location.assign(destino)
      return
    }
    form.ocupado(false)
    if ('escolher' in resposta && resposta.escolher) {
      mostrarEscolha(resposta.escolher)
      return
    }
    // A senha conferiu, mas precisa ser trocada pelo link (a pessoa confirmou o e-mail ou passou a ter outro restaurante).
    const enviado = 'linkEnviado' in resposta && resposta.linkEnviado
    form.geral(
      enviado
        ? 'Por segurança, crie uma senha nova: enviamos um link para o seu e-mail.'
        : 'Por segurança, crie uma senha nova. Peça o link em "Esqueci a senha".',
      'info',
    )
  } catch (erro) {
    form.ocupado(false)
    form.campo('senha').value = ''
    const espera = esperaDoErro(erro)
    if (espera !== null) {
      form.esperar(espera)
      return
    }
    form.geral(causaDoErro(erro)?.tipo === 'credenciais_invalidas' ? 'E-mail ou senha não conferem.' : mensagemDoErro(erro))
    form.campo('senha').focus()
  }
})
