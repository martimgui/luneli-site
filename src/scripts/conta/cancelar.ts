// "Minha conta", Cancelar: digitar "cancelar" (um clique perdido não cancela) e desfazer até o fim do período.
import { api, causaDoErro, esperaDoErro, mensagemDoErro } from '../../lib/api'
import { formatarData } from '../../lib/conta'
import { erroDaArea, exigirDono, mostrarArea } from './area'
import { Formulario, avisar, elemento } from './formulario'

const form = new Formulario('form-cancelar', ['confirmacao'] as const)

function mostrar(estado: { cancelaNoFim: boolean; acessoAte: string; encerradaEm: string | null }): void {
  elemento('c-encerrada').hidden = estado.encerradaEm === null
  elemento('c-ativo').hidden = estado.encerradaEm !== null || estado.cancelaNoFim
  elemento('c-cancelado').hidden = estado.encerradaEm !== null || !estado.cancelaNoFim
  elemento('c-ate').textContent = formatarData(estado.acessoAte)
  elemento('c-aviso-cancelado').textContent = `Assinatura cancelada. O acesso vai até ${formatarData(estado.acessoAte)}.`
}

async function carregar(): Promise<void> {
  const minha = await api().assinatura.minha.query()
  mostrar(minha)
}

form.form.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  if (form.botao.disabled || form.emEspera()) return
  form.geral(null)
  if (form.valor('confirmacao').trim().toLowerCase() !== 'cancelar') {
    form.mostrarErros({ confirmacao: 'Digite a palavra "cancelar".' })
    return
  }
  form.ocupado(true, 'Cancelando…')
  try {
    await api().assinatura.cancelar.mutate({ confirmacao: 'cancelar' })
  } catch (erro) {
    form.ocupado(false)
    if (causaDoErro(erro)?.tipo === 'assinatura_ja_cancelada') return void carregar()
    const espera = esperaDoErro(erro)
    if (espera !== null) return form.esperar(espera)
    form.geral(causaDoErro(erro)?.tipo === 'cancelamentos_demais' ? 'Cancelamentos demais hoje. Tente de novo amanhã.' : mensagemDoErro(erro))
    return
  }
  // Gravou: daqui em diante, uma falha só atrapalha a atualização da tela, nunca diz que o cancelamento falhou.
  form.ocupado(false)
  form.campo('confirmacao').value = ''
  try {
    await carregar()
    elemento('desfazer').focus()
  } catch {
    form.form.hidden = true
    form.geral(null)
    avisar(elemento('c-aviso-desfazer'), 'Cancelamento registrado. Atualize a página para ver a situação.', 'ok')
  }
})

elemento<HTMLButtonElement>('desfazer').addEventListener('click', async (e) => {
  const botao = e.currentTarget as HTMLButtonElement
  botao.disabled = true
  const aviso = elemento('c-aviso-desfazer')
  avisar(aviso, null)
  try {
    await api().assinatura.desfazerCancelamento.mutate()
  } catch (erro) {
    avisar(aviso, mensagemDoErro(erro))
    botao.disabled = false
    return
  }
  // Gravou: uma falha daqui em diante é só da atualização da tela.
  try {
    await carregar()
    form.campo('confirmacao').focus()
  } catch {
    botao.hidden = true
    avisar(aviso, 'Cancelamento desfeito. Atualize a página para ver a situação.', 'ok')
  }
  botao.disabled = false
})

async function abrir(): Promise<void> {
  if ((await exigirDono()) === null) return
  try {
    await carregar()
    mostrarArea()
  } catch (erro) {
    erroDaArea(mensagemDoErro(erro))
  }
}

void abrir()
