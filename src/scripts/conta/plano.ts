// "Minha conta", Plano: a lista de assinatura.planos. No teste (escolheNoTeste), "Escolher este plano"
// vale agora, sem cobrança (assinatura.escolherPlano); depois, a troca vale no próximo período (trocarPlano).
import { api, causaDoErro, mensagemDoErro } from '../../lib/api'
import { formatarData, formatarReais } from '../../lib/conta'
import { erroDaArea, exigirDono, mostrarArea } from './area'
import { avisar, elemento } from './formulario'

type Minha = Awaited<ReturnType<ReturnType<typeof api>['assinatura']['minha']['query']>>
type Plano = Awaited<ReturnType<ReturnType<typeof api>['assinatura']['planos']['query']>>[number]

const aviso = elemento('p-aviso')
const lista = elemento('p-lista')

function mensagemDaEscolha(erro: unknown): string {
  switch (causaDoErro(erro)?.tipo) {
    case 'email_nao_confirmado':
      return 'Confirme o seu e-mail antes de escolher o plano. O link está no e-mail que mandamos (dá para reenviar no Resumo).'
    case 'plano_so_no_proximo_periodo':
      return 'Como já houve pagamento, a troca de plano vale só a partir do próximo período.'
    case 'cancelamento_pedido':
      return 'Há um cancelamento pedido. Desfaça o cancelamento antes de trocar de plano.'
    default:
      return mensagemDoErro(erro)
  }
}

function desenhar(minha: Minha, planos: Plano[]): void {
  elemento('p-regra').textContent = minha.escolheNoTeste
    ? 'Durante o teste, o plano que você escolher vale agora, sem cobrança.'
    : `A troca de plano vale a partir de ${formatarData(minha.trocaValeDe)}, no próximo período, sem cobrança proporcional.`
  lista.innerHTML = ''
  for (const plano of planos) {
    const li = document.createElement('li')
    if (plano.atual) li.classList.add('atual')
    const titulo = document.createElement('h2')
    titulo.textContent = plano.nome
    const preco = document.createElement('p')
    preco.innerHTML = `<b></b> por mês <span class="fraco">(exemplo)</span>`
    preco.querySelector('b')!.textContent = formatarReais(plano.precoCentavos)
    const descricao = document.createElement('p')
    descricao.className = 'fraco'
    descricao.textContent = plano.descricao
    const recursos = document.createElement('ul')
    recursos.setAttribute('aria-label', `O que o ${plano.nome} inclui`)
    for (const recurso of plano.recursos) {
      const r = document.createElement('li')
      r.textContent = recurso.existe ? recurso.nome : `${recurso.nome} (em breve)`
      recursos.append(r)
    }
    li.append(titulo, preco, descricao, recursos)
    const situacao = document.createElement('p')
    situacao.style.fontWeight = '700'
    if (plano.atual) situacao.textContent = 'Este é o seu plano agora.'
    else if (plano.seguinte) situacao.textContent = `Vale a partir de ${formatarData(minha.trocaValeDe)}.`
    if (situacao.textContent) li.append(situacao)
    // No teste, o plano de agora também tem botão: a conta nasce no Essencial, e escolhê-lo fica registrado.
    const podeEscolher = minha.escolheNoTeste ? true : !plano.seguinte && !(plano.atual && minha.planoSeguinte === null)
    if (podeEscolher && !minha.cancelaNoFim && minha.encerradaEm === null) {
      const botao = document.createElement('button')
      botao.type = 'button'
      botao.className = 'btn dois'
      botao.style.justifySelf = 'start'
      botao.textContent = minha.escolheNoTeste ? (plano.atual ? 'Ficar com este plano' : 'Escolher este plano') : plano.atual ? 'Manter este plano' : 'Trocar para este plano'
      botao.addEventListener('click', () => void escolher(minha, plano, botao))
      li.append(botao)
    }
    lista.append(li)
  }
}

async function escolher(minha: Minha, plano: Plano, botao: HTMLButtonElement): Promise<void> {
  lista.querySelectorAll('button').forEach((b) => (b.disabled = true))
  const texto = botao.textContent
  botao.textContent = 'Gravando…'
  let feito: string
  try {
    if (minha.escolheNoTeste) {
      await api().assinatura.escolherPlano.mutate({ planoId: plano.id })
      feito = `Pronto: o seu plano agora é o ${plano.nome}. Nada é cobrado nesta versão.`
    } else {
      const { valeDe } = await api().assinatura.trocarPlano.mutate({ planoId: plano.id })
      feito = `Pronto: o plano ${plano.nome} vale a partir de ${formatarData(valeDe)}.`
    }
  } catch (erro) {
    botao.textContent = texto
    lista.querySelectorAll('button').forEach((b) => (b.disabled = false))
    avisar(aviso, mensagemDaEscolha(erro), 'erro')
    // O teste acabou noutra tela: a lista volta a ser a do próximo período.
    if (causaDoErro(erro)?.tipo === 'plano_so_no_proximo_periodo') await carregar(null, mensagemDaEscolha(erro))
    return
  }
  // Gravou: uma falha daqui em diante é só da atualização da lista, nunca diz que a escolha falhou.
  try {
    await carregar(feito)
  } catch {
    lista.replaceChildren()
    avisar(aviso, `${feito} Atualize a página para ver a lista.`, 'ok')
  }
}

async function carregar(feito: string | null, erroAnterior?: string): Promise<void> {
  const [minha, planos] = await Promise.all([api().assinatura.minha.query(), api().assinatura.planos.query()])
  desenhar(minha, planos)
  if (feito) avisar(aviso, feito, 'ok')
  else if (erroAnterior) avisar(aviso, erroAnterior, 'erro')
}

async function abrir(): Promise<void> {
  if ((await exigirDono()) === null) return
  try {
    await carregar(null)
    mostrarArea()
  } catch (erro) {
    erroDaArea(mensagemDoErro(erro))
  }
}

void abrir()
