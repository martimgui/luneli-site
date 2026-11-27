// Simulador interativo do balcão, cozinha KDS, mesas, expedição, atalhos de teclado e queda de internet.
import { $, $$ } from './comum'

type Aba = 'balcao' | 'cozinha' | 'mesas' | 'expedicao'

interface ItemCarrinho {
  nome: string
  preco: number
  qtd: number
}

interface PedidoSim {
  numero: number
  canal: string
  itens: string[]
  total: number
  status: 'preparo' | 'pronto' | 'entregue'
  modo: 'Online' | 'Local (em breve)'
  hora: string
  pagamento: string
  entregador?: string
}

interface MesaSim {
  id: string
  status: string
  totalNum: number
  detalhe: string
  ocupada: boolean
}

const PEDIDOS_INICIAIS: PedidoSim[] = [
  {
    numero: 248,
    canal: 'Delivery · Marina',
    itens: ['1x Pizza G · 1/2 Calabresa / 1/2 Portuguesa'],
    total: 80.0,
    status: 'preparo',
    modo: 'Online',
    hora: '20:58',
    pagamento: 'Pix',
    entregador: 'Diego',
  },
  {
    numero: 247,
    canal: 'Mesa 04',
    itens: ['2x X-Bacon Artesanal', '2x Refrigerante Lata'],
    total: 82.0,
    status: 'preparo',
    modo: 'Online',
    hora: '20:54',
    pagamento: 'Cartão',
  },
  {
    numero: 246,
    canal: 'Balcão',
    itens: ['1x Porção Fritas Cheddar'],
    total: 28.5,
    status: 'pronto',
    modo: 'Online',
    hora: '20:49',
    pagamento: 'Dinheiro',
  },
]

const CARRINHO_INICIAL: ItemCarrinho[] = [
  { nome: 'X-Bacon Artesanal', preco: 34.0, qtd: 1 },
  { nome: 'Refrigerante Lata', preco: 7.0, qtd: 1 },
]

const MESAS_INICIAIS: MesaSim[] = [
  { id: 'Mesa 01', status: 'Livre', totalNum: 0, detalhe: 'Mesa 01 livre.', ocupada: false },
  { id: 'Mesa 02', status: 'Ocupada · 3 pessoas', totalNum: 142.0, detalhe: 'Mesa 02: 3 rodadas · R$ 47,33/pessoa.', ocupada: true },
  { id: 'Mesa 03', status: 'Livre', totalNum: 0, detalhe: 'Mesa 03 livre.', ocupada: false },
  { id: 'Mesa 04', status: 'Conta pedida · 2x', totalNum: 96.0, detalhe: 'Mesa 04: R$ 48,00 no Pix · falta R$ 48,00.', ocupada: true },
  { id: 'Comanda #18', status: 'Balcão / Bar', totalNum: 48.5, detalhe: 'Comanda #18: aberta às 20:32.', ocupada: true },
  { id: 'Mesa 06', status: 'Livre', totalNum: 0, detalhe: 'Mesa 06 livre.', ocupada: false },
]

const fmt = (v: number): string => `R$ ${v.toFixed(2).replace('.', ',')}`

const shell = $('#simShell')
if (shell) {
  let abaAtiva: Aba = 'balcao'
  let offline = false
  let tipoPedido: 'Balcão' | 'Delivery' = 'Balcão'
  let pagamento = 'Pix'
  let obsLista: string[] = []
  let pedidos: PedidoSim[] = PEDIDOS_INICIAIS.map((p) => ({ ...p, itens: [...p.itens] }))
  let carrinho: ItemCarrinho[] = CARRINHO_INICIAL.map((c) => ({ ...c }))
  let mesas: MesaSim[] = MESAS_INICIAIS.map((m) => ({ ...m }))
  let mesaSelIdx = 1
  let proximoNumero = 249

  const tabs = $$<HTMLButtonElement>('[data-sim-tab]')
  const panels = $$<HTMLElement>('[data-sim-panel]')
  const netPill = $('#simNetPill')
  const netText = $('#simNetText')
  const btnNet = $<HTMLButtonElement>('#simToggleNet')
  const btnReset = $<HTMLButtonElement>('#simReset')
  const kdsBadge = $('#simKdsBadge')
  const ticketNum = $('#simTicketNum')
  const ticketMode = $('#simTicketMode')
  const cartItems = $('#simCartItems')
  const cartTotal = $('#simCartTotal')
  const btnSend = $<HTMLButtonElement>('#simSendOrder')
  const kdsList = $('#simKdsList')
  const mesasGrid = $('#simMesasGrid')
  const mesaDetalhe = $('#simMesaDetalhe')
  const expList = $('#simExpList')
  const simLog = $('#simLog')

  function setLog(msg: string): void {
    simLog.textContent = msg
  }

  function trocarAba(nova: Aba): void {
    abaAtiva = nova
    tabs.forEach((t) => {
      const ativo = t.dataset.simTab === nova
      t.classList.toggle('is-active', ativo)
      t.setAttribute('aria-selected', String(ativo))
    })
    panels.forEach((p) => {
      p.hidden = p.dataset.simPanel !== nova
    })
  }

  function renderRede(): void {
    netPill.classList.toggle('is-offline', offline)
    netPill.classList.toggle('is-online', !offline)
    netText.textContent = offline ? 'Sem internet · Modo Local (em breve)' : 'Loja conectada'
    btnNet.textContent = offline ? 'Religar internet' : 'Simular queda de internet'
    btnNet.classList.toggle('is-offline', offline)
  }

  function renderCarrinho(): void {
    ticketNum.textContent = `Pedido #${proximoNumero}`
    const taxa = tipoPedido === 'Delivery' ? 6 : 0
    ticketMode.textContent = `Total · ${pagamento}${tipoPedido === 'Delivery' ? ' (c/ entrega)' : ''}`

    if (carrinho.length === 0) {
      cartItems.innerHTML = '<p class="sim-empty">Clique nos itens ao lado para montar o pedido.</p>'
      cartTotal.textContent = 'R$ 0,00'
      btnSend.disabled = true
      return
    }
    btnSend.disabled = false
    const totalItens = carrinho.reduce((s, item) => s + item.preco * item.qtd, 0)
    cartTotal.textContent = fmt(totalItens + taxa)

    cartItems.innerHTML =
      carrinho
        .map(
          (item, idx) =>
            `<div class="sim-ticket-row">
              <span>${item.qtd}x ${item.nome}</span>
              <span class="sim-ticket-right">
                <button type="button" class="sim-qty" data-dec-idx="${idx}" aria-label="Diminuir">−</button>
                <button type="button" class="sim-qty" data-inc-idx="${idx}" aria-label="Aumentar">+</button>
                <span>${fmt(item.preco * item.qtd)}</span>
              </span>
            </div>`,
        )
        .join('') +
      (obsLista.length > 0 ? `<div class="sim-obs-preview">OBS: ${obsLista.join(' · ')}</div>` : '')

    cartItems.querySelectorAll<HTMLButtonElement>('[data-dec-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.decIdx)
        const item = carrinho[idx]
        if (!item) return
        if (item.qtd > 1) item.qtd--
        else carrinho.splice(idx, 1)
        renderCarrinho()
      })
    })
    cartItems.querySelectorAll<HTMLButtonElement>('[data-inc-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.incIdx)
        const item = carrinho[idx]
        if (!item) return
        item.qtd++
        renderCarrinho()
      })
    })
  }

  function enviarPedido(): void {
    if (carrinho.length === 0) return
    const itens = carrinho.map((i) => `${i.qtd}x ${i.nome}`)
    if (obsLista.length > 0) itens.push(`OBS: ${obsLista.join(', ')}`)
    const taxa = tipoPedido === 'Delivery' ? 6 : 0
    const total = carrinho.reduce((s, item) => s + item.preco * item.qtd, 0) + taxa
    const num = proximoNumero++
    pedidos.unshift({
      numero: num,
      canal: tipoPedido === 'Delivery' ? 'Delivery · Balcão' : 'Balcão',
      itens,
      total,
      status: 'preparo',
      modo: offline ? 'Local (em breve)' : 'Online',
      hora: 'Agora',
      pagamento,
      entregador: tipoPedido === 'Delivery' ? 'Lucas M.' : undefined,
    })
    carrinho = []
    obsLista = []
    $$<HTMLButtonElement>('[data-sim-obs]').forEach((b) => b.classList.remove('is-active'))
    setLog(
      offline
        ? `Modo Local (em breve) · Pedido #${num} guardado no caixa e enviado à cozinha`
        : `Caixa 1 · Pedido #${num} (${pagamento}) enviado para a cozinha`,
    )
    renderCarrinho()
    renderKds()
    renderExpedicao()
    trocarAba('cozinha')
  }

  function renderKds(): void {
    const emPreparo = pedidos.filter((p) => p.status === 'preparo').length
    kdsBadge.textContent = String(emPreparo)
    kdsList.innerHTML = pedidos
      .map((p) => {
        const pronto = p.status !== 'preparo'
        return `<div class="sim-kds-card ${pronto ? 'is-ready' : ''}">
          <div class="sim-kds-head">
            <div><strong class="sim-kds-num">#${p.numero}</strong> <span class="sim-kds-canal">${p.canal}</span></div>
            <span class="sim-kds-hora">${p.hora}</span>
          </div>
          <ul class="sim-kds-itens">${p.itens.map((i) => `<li>${i}</li>`).join('')}</ul>
          <div class="sim-kds-foot">
            <span class="sim-kds-modo">${p.modo} · ${fmt(p.total)}</span>
            ${
              pronto
                ? `<span class="sim-ready-tag">${p.status === 'entregue' ? 'Entregue' : 'Pronto'}</span>`
                : `<button type="button" class="sim-kds-btn" data-pronto="${p.numero}">Marcar pronto [Enter]</button>`
            }
          </div>
        </div>`
      })
      .join('')

    kdsList.querySelectorAll<HTMLButtonElement>('[data-pronto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const num = Number(btn.dataset.pronto)
        const alvo = pedidos.find((p) => p.numero === num)
        if (!alvo) return
        alvo.status = 'pronto'
        setLog(`Cozinha KDS · Pedido #${num} marcado como Pronto`)
        renderKds()
        renderExpedicao()
      })
    })
  }

  function renderMesas(): void {
    mesasGrid.innerHTML = mesas
      .map(
        (m, idx) =>
          `<button type="button" class="sim-mesa-box ${m.ocupada ? 'is-busy' : ''} ${idx === mesaSelIdx ? 'is-selected' : ''}" data-mesa-idx="${idx}">
            <div class="sim-mesa-title">${m.id}</div>
            <div class="sim-mesa-sub">${m.status}</div>
            <div class="sim-mesa-total">${m.ocupada ? fmt(m.totalNum) : '—'}</div>
          </button>`,
      )
      .join('')

    const sel = mesas[mesaSelIdx]
    if (sel) {
      mesaDetalhe.innerHTML = `
        <span>${sel.detalhe}</span>
        <span class="sim-mesa-acoes">
          <button type="button" class="sim-kds-btn" data-sim-mesa-add>+ Chope (R$ 12,90)</button>
          ${sel.ocupada ? '<button type="button" class="sim-btn-reset" data-sim-mesa-fechar>Fechar mesa</button>' : ''}
        </span>`
      mesaDetalhe.querySelector<HTMLButtonElement>('[data-sim-mesa-add]')?.addEventListener('click', () => {
        sel.ocupada = true
        sel.status = 'Ocupada · agora'
        sel.totalNum += 12.9
        sel.detalhe = `${sel.id}: +1 Chope lançado · Total ${fmt(sel.totalNum)}`
        setLog(`${sel.id} · Chope 300 ml lançado (${fmt(sel.totalNum)})`)
        renderMesas()
      })
      mesaDetalhe.querySelector<HTMLButtonElement>('[data-sim-mesa-fechar]')?.addEventListener('click', () => {
        sel.ocupada = false
        sel.status = 'Livre'
        sel.totalNum = 0
        sel.detalhe = `${sel.id} fechada e liberada.`
        setLog(`${sel.id} · Conta fechada`)
        renderMesas()
      })
    }

    mesasGrid.querySelectorAll<HTMLButtonElement>('[data-mesa-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        mesaSelIdx = Number(btn.dataset.mesaIdx)
        renderMesas()
      })
    })
  }

  function renderExpedicao(): void {
    expList.innerHTML =
      `<div class="sim-exp-header">
        <span>Escala ativa: Diego · Lucas M. · Rafael S.</span>
        <span>${offline ? 'Modo Local (em breve)' : 'Sincronizado'}</span>
      </div>` +
      pedidos
        .map((p) => {
          const entregue = p.status === 'entregue'
          const estado = entregue ? 'Entregue ✓' : p.status === 'pronto' ? 'Pronto para sair' : 'Em preparo'
          return `<div class="sim-exp-row ${entregue ? 'is-done' : ''}">
            <div>
              <div class="sim-exp-driver">#${p.numero} · ${p.canal}</div>
              <div class="sim-exp-order">${p.entregador ? `Entregador: ${p.entregador}` : 'Retirada / Salão'} · ${fmt(p.total)}</div>
            </div>
            <div class="sim-exp-right">
              <span class="sim-exp-state">${estado}</span>
              ${
                p.status === 'pronto'
                  ? `<button type="button" class="sim-kds-btn" data-entregar="${p.numero}">Marcar entregue</button>`
                  : ''
              }
            </div>
          </div>`
        })
        .join('')

    expList.querySelectorAll<HTMLButtonElement>('[data-entregar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const num = Number(btn.dataset.entregar)
        const alvo = pedidos.find((p) => p.numero === num)
        if (!alvo) return
        alvo.status = 'entregue'
        setLog(`Expedição · Pedido #${num} marcado como Entregue`)
        renderKds()
        renderExpedicao()
      })
    })
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => trocarAba((tab.dataset.simTab as Aba) ?? 'balcao'))
  })

  $$<HTMLButtonElement>('[data-add-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nome = btn.dataset.addItem ?? ''
      const preco = Number(btn.dataset.addPrice ?? '0')
      if (!nome) return
      const existente = carrinho.find((i) => i.nome === nome)
      if (existente) existente.qtd++
      else carrinho.push({ nome, preco, qtd: 1 })
      renderCarrinho()
    })
  })

  $$<HTMLButtonElement>('[data-sim-tipo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      tipoPedido = btn.dataset.simTipo === 'Delivery' ? 'Delivery' : 'Balcão'
      $$<HTMLButtonElement>('[data-sim-tipo]').forEach((b) => b.classList.toggle('is-active', b === btn))
      renderCarrinho()
    })
  })

  $$<HTMLButtonElement>('[data-sim-pag]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pagamento = btn.dataset.simPag ?? 'Pix'
      $$<HTMLButtonElement>('[data-sim-pag]').forEach((b) => b.classList.toggle('is-active', b === btn))
      renderCarrinho()
    })
  })

  $$<HTMLButtonElement>('[data-sim-obs]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const obs = btn.dataset.simObs ?? ''
      if (!obs) return
      if (obsLista.includes(obs)) {
        obsLista = obsLista.filter((o) => o !== obs)
        btn.classList.remove('is-active')
      } else {
        obsLista.push(obs)
        btn.classList.add('is-active')
      }
      renderCarrinho()
    })
  })

  btnSend.addEventListener('click', enviarPedido)

  btnNet.addEventListener('click', () => {
    offline = !offline
    if (!offline) {
      pedidos = pedidos.map((p) => ({ ...p, modo: 'Online' }))
      setLog('Conexão restaurada · Pedidos sincronizados com a nuvem')
    } else {
      setLog('Sem internet · Modo Local (em breve): balcão e cozinha seguem na rede interna')
    }
    renderRede()
    renderKds()
    renderExpedicao()
  })

  btnReset.addEventListener('click', () => {
    offline = false
    tipoPedido = 'Balcão'
    pagamento = 'Pix'
    obsLista = []
    pedidos = PEDIDOS_INICIAIS.map((p) => ({ ...p, itens: [...p.itens] }))
    carrinho = CARRINHO_INICIAL.map((c) => ({ ...c }))
    mesas = MESAS_INICIAIS.map((m) => ({ ...m }))
    mesaSelIdx = 1
    proximoNumero = 249
    $$<HTMLButtonElement>('[data-sim-obs]').forEach((b) => b.classList.remove('is-active'))
    setLog('Caixa 1 · Pedido #248 registrado às 20:58')
    renderRede()
    renderCarrinho()
    renderKds()
    renderMesas()
    renderExpedicao()
    trocarAba('balcao')
  })

  shell.setAttribute('tabindex', '0')
  shell.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      e.preventDefault()
      trocarAba('balcao')
    } else if (e.key === 'F4') {
      e.preventDefault()
      trocarAba('mesas')
    } else if (e.key === 'F8' && abaAtiva === 'balcao') {
      e.preventDefault()
      enviarPedido()
    } else if (e.key === 'Enter' && abaAtiva === 'cozinha') {
      const primeiro = pedidos.find((p) => p.status === 'preparo')
      if (primeiro) {
        e.preventDefault()
        primeiro.status = 'pronto'
        setLog(`Cozinha KDS · Pedido #${primeiro.numero} marcado como Pronto [Enter]`)
        renderKds()
        renderExpedicao()
      }
    }
  })

  renderRede()
  renderCarrinho()
  renderKds()
  renderMesas()
  renderExpedicao()
}
