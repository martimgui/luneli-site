// Simulador interativo do balcão, cozinha KDS, mesas, expedição e queda de internet.
import { $, $$ } from './comum'

type Aba = 'balcao' | 'cozinha' | 'mesas' | 'expedicao'

interface ItemCarrinho {
  nome: string
  preco: number
}

interface PedidoSim {
  numero: number
  canal: string
  itens: string[]
  total: number
  status: 'preparo' | 'pronto' | 'entregue'
  modo: 'Online' | 'Local (em breve)'
  hora: string
  entregador?: string
}

interface MesaSim {
  id: string
  status: string
  total: string
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
  },
  {
    numero: 246,
    canal: 'Balcão',
    itens: ['1x Porção Fritas Cheddar'],
    total: 28.5,
    status: 'pronto',
    modo: 'Online',
    hora: '20:49',
  },
]

const CARRINHO_INICIAL: ItemCarrinho[] = [
  { nome: 'X-Bacon Artesanal', preco: 34.0 },
  { nome: 'Refrigerante Lata', preco: 7.0 },
]

const MESAS: MesaSim[] = [
  { id: 'Mesa 01', status: 'Livre', total: '—', detalhe: 'Mesa 01 livre para receber clientes.', ocupada: false },
  { id: 'Mesa 02', status: 'Ocupada · 3 pessoas', total: 'R$ 142,00', detalhe: 'Mesa 02: 3 rodadas lançadas · R$ 47,33 por pessoa (divisão igual).', ocupada: true },
  { id: 'Mesa 03', status: 'Livre', total: '—', detalhe: 'Mesa 03 livre para receber clientes.', ocupada: false },
  { id: 'Mesa 04', status: 'Conta pedida · 2x', total: 'R$ 96,00', detalhe: 'Mesa 04: R$ 48,00 pagos no Pix · faltam R$ 48,00 no cartão.', ocupada: true },
  { id: 'Comanda #18', status: 'Balcão / Bar', total: 'R$ 48,50', detalhe: 'Comanda #18: aberta às 20:32 · 2 itens lançados.', ocupada: true },
  { id: 'Mesa 06', status: 'Livre', total: '—', detalhe: 'Mesa 06 livre para receber clientes.', ocupada: false },
]

const fmt = (v: number): string => `R$ ${v.toFixed(2).replace('.', ',')}`

const shell = $('#simShell')
if (shell) {
  let offline = false
  let pedidos: PedidoSim[] = PEDIDOS_INICIAIS.map((p) => ({ ...p, itens: [...p.itens] }))
  let carrinho: ItemCarrinho[] = CARRINHO_INICIAL.map((c) => ({ ...c }))
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
    ticketMode.textContent = offline ? 'Balcão · Local (em breve)' : 'Balcão · Online'
  }

  function renderCarrinho(): void {
    ticketNum.textContent = `Pedido #${proximoNumero}`
    if (carrinho.length === 0) {
      cartItems.innerHTML = '<p class="sim-empty">Clique nos itens ao lado para montar o pedido.</p>'
      cartTotal.textContent = 'R$ 0,00'
      btnSend.disabled = true
      return
    }
    btnSend.disabled = false
    const total = carrinho.reduce((s, item) => s + item.preco, 0)
    cartTotal.textContent = fmt(total)
    cartItems.innerHTML = carrinho
      .map(
        (item, idx) =>
          `<div class="sim-ticket-row">
            <span>${item.nome}</span>
            <span class="sim-ticket-right">
              <span>${fmt(item.preco)}</span>
              <button type="button" class="sim-rm" data-rm-idx="${idx}" aria-label="Remover ${item.nome}">×</button>
            </span>
          </div>`,
      )
      .join('')
    cartItems.querySelectorAll<HTMLButtonElement>('[data-rm-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.rmIdx)
        carrinho.splice(idx, 1)
        renderCarrinho()
      })
    })
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
    mesasGrid.innerHTML = MESAS.map(
      (m, idx) =>
        `<button type="button" class="sim-mesa-box ${m.ocupada ? 'is-busy' : ''}" data-mesa-idx="${idx}">
          <div class="sim-mesa-title">${m.id}</div>
          <div class="sim-mesa-sub">${m.status}</div>
          <div class="sim-mesa-total">${m.total}</div>
        </button>`,
    ).join('')
    mesasGrid.querySelectorAll<HTMLButtonElement>('[data-mesa-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = MESAS[Number(btn.dataset.mesaIdx)]
        if (m) mesaDetalhe.textContent = m.detalhe
      })
    })
  }

  function renderExpedicao(): void {
    const entregas = pedidos.filter((p) => p.canal.startsWith('Delivery') || p.status === 'pronto')
    expList.innerHTML =
      `<div class="sim-exp-header">
        <span>Escala ativa: Diego · Lucas M. · Rafael S.</span>
        <span>${offline ? 'Modo Local (em breve)' : 'Sincronizado'}</span>
      </div>` +
      entregas
        .map((p) => {
          const entregue = p.status === 'entregue'
          const estado = entregue ? 'Entregue' : p.status === 'pronto' ? 'Pronto para sair' : 'Em preparo na cozinha'
          return `<div class="sim-exp-row">
            <div>
              <div class="sim-exp-driver">#${p.numero} · ${p.canal}</div>
              <div class="sim-exp-order">${p.entregador ? `Entregador: ${p.entregador}` : 'Retirada / Balcão'} · ${fmt(p.total)}</div>
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
      carrinho.push({ nome, preco })
      renderCarrinho()
    })
  })

  btnSend.addEventListener('click', () => {
    if (carrinho.length === 0) return
    const agrupado = carrinho.reduce<Record<string, number>>((acc, item) => {
      acc[item.nome] = (acc[item.nome] ?? 0) + 1
      return acc
    }, {})
    const itens = Object.entries(agrupado).map(([nome, qtd]) => `${qtd}x ${nome}`)
    const total = carrinho.reduce((s, item) => s + item.preco, 0)
    const num = proximoNumero++
    pedidos.unshift({
      numero: num,
      canal: 'Balcão',
      itens,
      total,
      status: 'preparo',
      modo: offline ? 'Local (em breve)' : 'Online',
      hora: 'Agora',
    })
    carrinho = []
    setLog(
      offline
        ? `Modo Local (em breve) · Pedido #${num} guardado no caixa e enviado à cozinha`
        : `Caixa 1 · Pedido #${num} enviado para a cozinha`,
    )
    renderCarrinho()
    renderKds()
    renderExpedicao()
    trocarAba('cozinha')
  })

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
    pedidos = PEDIDOS_INICIAIS.map((p) => ({ ...p, itens: [...p.itens] }))
    carrinho = CARRINHO_INICIAL.map((c) => ({ ...c }))
    proximoNumero = 249
    setLog('Caixa 1 · Pedido #248 registrado às 20:58')
    renderRede()
    renderCarrinho()
    renderKds()
    renderExpedicao()
    trocarAba('balcao')
  })

  renderRede()
  renderCarrinho()
  renderKds()
  renderMesas()
  renderExpedicao()
}
