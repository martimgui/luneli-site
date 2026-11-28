import { api, errosDoFormulario, mensagemDoErro } from '../../lib/api'
import { exigirDono, mostrarArea } from './area'
import { Formulario, elemento } from './formulario'

const form = new Formulario<'nome' | 'dddPadrao' | 'endereco'>('form-empresa', ['nome', 'dddPadrao', 'endereco'])
let fusoAtual = 'America/Sao_Paulo'
let viradaAtual = 300

void exigirDono().then(async (sessao) => {
  if (!sessao) return
  try {
    const dados = await api().restaurante.obter.query()
    elemento('e-codigo').textContent = dados.codigo
    form.campo('nome').value = dados.nome
    form.campo('dddPadrao').value = dados.dddPadrao
    form.campo('endereco').value = dados.endereco ?? ''
    fusoAtual = dados.fusoHorario
    viradaAtual = dados.minutosDaVirada
    mostrarArea()
  } catch (erro) {
    form.geral(mensagemDoErro(erro))
    mostrarArea()
  }
})

form.form.addEventListener('submit', async (e) => {
  e.preventDefault()
  form.geral(null)
  const nome = form.valor('nome').trim()
  const dddPadrao = form.valor('dddPadrao').trim()
  const endereco = form.valor('endereco').trim()
  if (form.mostrarErros({
    nome: nome === '' ? 'Informe o nome do restaurante.' : undefined,
    dddPadrao: !/^[1-9][0-9]$/.test(dddPadrao) ? 'DDD inválido.' : undefined,
  })) return

  form.ocupado(true, 'Salvando…')
  try {
    await api().restaurante.salvar.mutate({
      nome,
      dddPadrao,
      fusoHorario: fusoAtual,
      minutosDaVirada: viradaAtual,
      endereco,
    })
    form.geral('Dados do restaurante atualizados.', 'ok')
  } catch (erro) {
    const { campos, geral } = errosDoFormulario(erro, ['nome', 'dddPadrao', 'endereco'])
    form.mostrarErros(campos)
    form.geral(geral ?? mensagemDoErro(erro))
  } finally {
    form.ocupado(false)
  }
})
