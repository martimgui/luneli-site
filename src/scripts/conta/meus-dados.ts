import { api, errosDoFormulario, mensagemDoErro } from '../../lib/api'
import { erroDaArea, mostrarArea } from './area'
import { Formulario, elemento } from './formulario'
import { irParaEntrar, sessaoAtual } from './sessao'

const form = new Formulario<'nome' | 'telefone' | 'email' | 'senhaAtual'>('form-meus-dados', ['nome', 'telefone', 'email', 'senhaAtual'])

void (async () => {
  try {
    const sessao = await sessaoAtual()
    if (sessao) {
      elemento('quem').textContent = `${sessao.funcionario.nome} · ${sessao.restaurante.nome}`
      const meu = await api().auth.meuEmail.query()
      form.campo('nome').value = sessao.funcionario.nome
      form.campo('email').value = meu.email ?? ''
      mostrarArea()
      return
    }
    const portal = await api().conta.portal.query()
    if (portal.logado) {
      elemento('quem').textContent = portal.pessoa.nome ?? portal.pessoa.email ?? 'Sua conta'
      form.campo('nome').value = portal.pessoa.nome ?? ''
      form.campo('email').value = portal.pessoa.email ?? ''
      form.campo('telefone').value = portal.pessoa.telefone ?? ''
      mostrarArea()
      return
    }
    irParaEntrar()
  } catch (erro) {
    erroDaArea(mensagemDoErro(erro))
  }
})()

form.form.addEventListener('submit', async (e) => {
  e.preventDefault()
  form.geral(null)
  const nome = form.valor('nome').trim()
  const email = form.valor('email').trim()
  const telefone = form.valor('telefone').trim()
  const senhaAtual = form.valor('senhaAtual')
  if (form.mostrarErros({
    nome: nome === '' ? 'Informe o seu nome.' : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Informe um e-mail válido.' : undefined,
    senhaAtual: senhaAtual === '' ? 'Informe sua senha atual.' : undefined,
  })) return

  form.ocupado(true, 'Salvando…')
  try {
    await api().auth.alterarMeusDados.mutate({
      nome,
      email,
      telefone: telefone === '' ? null : telefone,
      senhaAtual,
    })
    form.campo('senhaAtual').value = ''
    form.geral('Seus dados foram atualizados.', 'ok')
  } catch (erro) {
    const { campos, geral } = errosDoFormulario(erro, ['nome', 'telefone', 'email', 'senhaAtual'])
    form.mostrarErros(campos)
    form.geral(geral ?? mensagemDoErro(erro))
  } finally {
    form.ocupado(false)
  }
})
