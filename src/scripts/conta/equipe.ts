import { api, errosDoFormulario, mensagemDoErro } from '../../lib/api'
import { exigirDono, mostrarArea } from './area'
import { Formulario, elemento } from './formulario'

const PERMISSOES_POR_PAPEL: Record<string, string[]> = {
  caixa: ['operar_caixa', 'reimprimir', 'acertar_entregadores', 'dar_ajuste', 'tirar_taxa_de_servico'],
  atendente: ['alterar_taxa_de_entrega'],
  garcom: ['tirar_item_da_mesa'],
  gerente: [
    'cancelar_pedido', 'dar_ajuste', 'lancar_adicional_avulso', 'alterar_taxa_de_entrega',
    'editar_cardapio', 'configurar_comandas', 'ver_relatorios', 'operar_caixa', 'reimprimir',
    'acertar_entregadores', 'alterar_diaria', 'controlar_escala', 'tirar_item_da_mesa',
    'tirar_taxa_de_servico', 'configurar_mesas',
  ],
}

const form = new Formulario<'nome' | 'email' | 'telefone'>('form-convidar', ['nome', 'email', 'telefone'])

function linhaComBotao(texto: string, rotuloBotao: string, aoClicar: () => Promise<void>): HTMLLIElement {
  const li = document.createElement('li')
  li.style.display = 'flex'
  li.style.justifyContent = 'space-between'
  li.style.alignItems = 'center'
  li.style.gap = '12px'
  const span = document.createElement('span')
  span.textContent = texto
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'btn tres'
  btn.textContent = rotuloBotao
  btn.addEventListener('click', async () => {
    btn.disabled = true
    try {
      await aoClicar()
    } finally {
      btn.disabled = false
    }
  })
  li.append(span, btn)
  return li
}

async function carregarTudo(): Promise<void> {
  const [funcs, entregs, convFuncs, convEntregs] = await Promise.all([
    api().funcionarios.listar.query(),
    api().entregadores.listar.query(),
    api().funcionarios.convitesPendentes.query(),
    api().entregadores.convites.query(),
  ])

  const listaPend = elemento('lista-pendentes')
  listaPend.innerHTML = ''
  const todosPendentes = [
    ...convFuncs.map((c: any) => ({ ...c, tipo: 'funcionario' as const })),
    ...convEntregs.map((c: any) => ({ ...c, tipo: 'entregador' as const })),
  ]
  elemento('bloco-pendentes').hidden = todosPendentes.length === 0
  for (const c of todosPendentes) {
    const rotulo = c.tipo === 'entregador' ? 'Entregador' : 'Equipe'
    listaPend.append(
      linhaComBotao(`${c.nome} (${c.email}) · ${rotulo}`, 'Cancelar convite', async () => {
        if (c.tipo === 'entregador') await api().entregadores.cancelarConvite.mutate({ id: c.id })
        else await api().funcionarios.cancelarConvite.mutate({ id: c.id })
        await carregarTudo()
      }),
    )
  }

  const listaFunc = elemento('lista-funcionarios')
  listaFunc.innerHTML = ''
  for (const f of funcs) {
    if (f.ehDono) {
      const li = document.createElement('li')
      li.textContent = `${f.nome} (${f.email ?? 'sem e-mail'}) · Dono`
      listaFunc.append(li)
      continue
    }
    listaFunc.append(
      linhaComBotao(`${f.nome} (${f.email ?? f.telefone ?? 'sem contato'}) · ${f.ativo ? 'Ativo' : 'Inativo'}`, f.ativo ? 'Desativar' : 'Reativar', async () => {
        await api().funcionarios.definirAtivo.mutate({ id: f.id, ativo: !f.ativo })
        await carregarTudo()
      }),
    )
  }

  const listaEntreg = elemento('lista-entregadores')
  listaEntreg.innerHTML = ''
  for (const e of entregs) {
    listaEntreg.append(
      linhaComBotao(`${e.nome}${e.telefone ? ` (${e.telefone})` : ''} · ${e.ativo ? 'Ativo' : 'Inativo'}`, e.ativo ? 'Desativar' : 'Reativar', async () => {
        await api().entregadores.mudarAtivo.mutate({ id: e.id, ativo: !e.ativo })
        await carregarTudo()
      }),
    )
  }
}

void exigirDono().then(async (sessao) => {
  if (!sessao) return
  mostrarArea()
  await carregarTudo()
})

form.form.addEventListener('submit', async (e) => {
  e.preventDefault()
  form.geral(null)
  const nome = form.valor('nome').trim()
  const email = form.valor('email').trim()
  const telefone = form.valor('telefone').trim()
  const papel = (document.getElementById('f-papel') as HTMLSelectElement).value
  if (form.mostrarErros({
    nome: nome === '' ? 'Informe o nome.' : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Informe um e-mail válido.' : undefined,
  })) return

  form.ocupado(true, 'Enviando convite…')
  try {
    if (papel === 'entregador') {
      await api().entregadores.convidar.mutate({ nome, email, telefone })
    } else {
      await api().funcionarios.salvar.mutate({
        nome,
        email,
        telefone: telefone === '' ? null : telefone,
        permissoes: PERMISSOES_POR_PAPEL[papel] ?? [],
      })
    }
    form.campo('nome').value = ''
    form.campo('email').value = ''
    form.campo('telefone').value = ''
    form.geral(`Convite enviado para ${email}.`, 'ok')
    await carregarTudo()
  } catch (erro) {
    const { campos, geral } = errosDoFormulario(erro, ['nome', 'email', 'telefone'])
    form.mostrarErros(campos)
    form.geral(geral ?? mensagemDoErro(erro))
  } finally {
    form.ocupado(false)
  }
})
