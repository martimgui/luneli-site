// "Minha conta", Resumo: plano, período, próxima cobrança e o e-mail (confirmado ou não, com "Reenviar").
import { api, mensagemDoErro } from '../../lib/api'
import { formatarData, formatarReais } from '../../lib/conta'
import { erroDaArea, exigirDono, mostrarArea } from './area'
import { avisar, elemento } from './formulario'
import { reenviarConfirmacao } from './reenviar'

const ESTADOS = { ativa: 'Em dia', em_atraso: 'Em atraso', bloqueada: 'Bloqueada' } as const

async function abrir(): Promise<void> {
  if ((await exigirDono()) === null) return
  try {
    const [minha, email] = await Promise.all([api().assinatura.minha.query(), api().auth.meuEmail.query()])
    elemento('r-plano').textContent = minha.plano.nome + (minha.plano.ehExemplo ? ' (plano de exemplo)' : '')
    const estadoTexto = ESTADOS[minha.estado as keyof typeof ESTADOS] ?? minha.estado
    elemento('r-estado').textContent =
      estadoTexto + (minha.estado === 'em_atraso' && minha.atrasoLimiteEm ? `, bloqueia em ${formatarData(minha.atrasoLimiteEm)}` : '')
    elemento('r-periodo-rotulo').textContent = minha.pagoPorFatura ? 'Pago até' : 'Período atual até'
    elemento('r-periodo').textContent = formatarData(minha.acessoAte)
    elemento('r-cobranca').textContent = minha.proximaCobranca
      ? `${formatarReais(minha.proximaCobranca.valorCentavos)} em ${formatarData(minha.proximaCobranca.vencimento)} (${minha.proximaCobranca.planoNome})`
      : 'Nenhuma'
    const avisoDoPlano = elemento('r-aviso-plano')
    if (minha.cancelaNoFim) avisar(avisoDoPlano, `Cancelamento pedido: o acesso vai até ${formatarData(minha.acessoAte)}.`, 'info')
    else if (minha.escolheNoTeste) avisar(avisoDoPlano, 'Você ainda pode escolher o plano que vale agora, sem cobrança.', 'info')
    else if (minha.planoSeguinte) avisar(avisoDoPlano, `A partir de ${formatarData(minha.trocaValeDe)}, o plano passa a ser ${minha.planoSeguinte.nome}.`, 'info')
    if (minha.escolheNoTeste) elemento('r-ir-plano').textContent = 'Escolher meu plano'

    elemento('r-email').textContent = email.email ?? 'Sem e-mail'
    elemento('r-confirmado').textContent = email.confirmado
      ? 'Confirmado'
      : email.pendente
        ? `Esperando a confirmação de ${email.pendente}`
        : 'Ainda não confirmado'
    elemento('r-acoes-email').hidden = email.confirmado && email.pendente === null
    mostrarArea()
  } catch (erro) {
    erroDaArea(mensagemDoErro(erro))
  }
}

elemento<HTMLButtonElement>('reenviar').addEventListener('click', (e) => void reenviarConfirmacao(e.currentTarget as HTMLButtonElement, elemento('aviso-reenvio')))
void abrir()
