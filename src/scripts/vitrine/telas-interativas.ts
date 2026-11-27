// Torna interativos todos os controles dentro das telas de demonstração da seção #historia
// (tanto no palco fixo do computador quanto nas cópias de tablet/celular).
import { $$ } from './comum'

const fmt = (v: number): string => v.toFixed(2).replace('.', ',')

function ligarTelas(raiz: ParentNode): void {
  // 1. Pedido: Delivery/Balcão, pagamento, quantidade do item, janela Meio a meio, dividir e Finalizar F8
  raiz.querySelectorAll<HTMLElement>('.pd').forEach((pd) => {
    let ehDelivery = true
    let qtd = 1

    const feLinhas = pd.querySelectorAll<HTMLElement>('.pd-fech .fe')
    const totalEl = pd.querySelector<HTMLElement>('.pd-fech .tot .num')
    const regSpan = pd.querySelector<HTMLElement>('.pd-fech .fim .registrado')
    const qtdEl = pd.querySelector<HTMLElement>('.pd-itens .li .q')
    const valItemEl = pd.querySelector<HTMLElement>('.pd-itens .li .num')

    const recalcular = (): void => {
      const itens = 74 * qtd
      const entrega = ehDelivery ? 6 : 0
      const total = itens + entrega
      if (qtdEl) qtdEl.textContent = String(qtd)
      if (valItemEl) valItemEl.textContent = fmt(itens)
      const lItens = feLinhas[0]?.querySelector('.num')
      const lEnt = feLinhas[1]?.querySelector('.num')
      if (lItens) lItens.textContent = fmt(itens)
      if (lEnt) lEnt.textContent = fmt(entrega)
      if (totalEl) totalEl.textContent = `R$ ${fmt(total)}`
      const regTxt = regSpan?.querySelector('span')
      if (regTxt) regTxt.innerHTML = `<b>Pedido 248 registrado</b><br />Total R$ ${fmt(total)}`
    }

    pd.querySelectorAll<HTMLElement>('.pd-cli .seg > span').forEach((op) => {
      op.addEventListener('click', () => {
        pd.querySelectorAll('.pd-cli .seg > span').forEach((o) => o.classList.remove('at'))
        op.classList.add('at')
        ehDelivery = op.textContent?.trim() === 'Delivery'
        recalcular()
      })
    })

    pd.querySelectorAll<HTMLElement>('.pd-fech .seg > span').forEach((op) => {
      op.addEventListener('click', () => {
        pd.querySelectorAll('.pd-fech .seg > span').forEach((o) => o.classList.remove('at'))
        op.classList.add('at')
      })
    })

    pd.querySelector<HTMLElement>('.pd-itens .li')?.addEventListener('click', () => {
      qtd = qtd >= 3 ? 1 : qtd + 1
      recalcular()
    })

    const janela = pd.parentElement?.querySelector<HTMLElement>('.janela-fundo')
    const meioAtalho = pd.querySelector<HTMLElement>('.atalhos > span:first-child')
    meioAtalho?.addEventListener('click', () => {
      janela?.classList.toggle('on')
      janela?.classList.remove('fecha')
    })
    janela?.addEventListener('click', () => {
      janela.classList.remove('on')
    })

    const btnDiv = pd.querySelector<HTMLElement>('.pd-fech .div')
    btnDiv?.addEventListener('click', () => {
      const ativo = btnDiv.dataset.div === '1'
      btnDiv.dataset.div = ativo ? '0' : '1'
      btnDiv.innerHTML = ativo ? 'Dividir pagamento <span class="k">Alt+P</span>' : '50% Pix · 50% Cartão ✓'
    })

    const btnFin = pd.querySelector<HTMLElement>('.pd-fech .fim .bt')
    btnFin?.addEventListener('click', () => {
      const ativo = regSpan?.classList.toggle('on') ?? false
      btnFin.classList.toggle('pronto', !ativo)
    })
  })

  // 2. Cozinha: trocar praça (Pizzaria/Bar), selecionar tíquete, marcar Pronto e Desfazer
  raiz.querySelectorAll<HTMLElement>('.pdv[data-aba="cozinha"]').forEach((cz) => {
    const tit = cz.querySelector<HTMLElement>('.cz-cab h4')
    const selCoz = cz.querySelector<HTMLElement>('.sel-coz')
    selCoz?.addEventListener('click', () => {
      const ehBar = tit?.textContent?.includes('Bar') ?? false
      if (tit) tit.textContent = ehBar ? 'Cozinha: Pizzaria' : 'Cozinha: Bar'
    })

    const tqs = cz.querySelectorAll<HTMLElement>('.tq')
    const faixa = cz.querySelector<HTMLElement>('.faixa')
    tqs.forEach((tq) => {
      tq.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.ac .bt')) return
        tqs.forEach((t) => t.classList.remove('sel'))
        tq.classList.add('sel')
      })
    })
    cz.querySelectorAll<HTMLElement>('.tq .ac .bt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tq = btn.closest<HTMLElement>('.tq')
        tq?.classList.add('foi')
        faixa?.classList.add('on')
      })
    })
    faixa?.querySelector<HTMLElement>('.bt')?.addEventListener('click', () => {
      faixa.classList.remove('on')
      cz.querySelectorAll<HTMLElement>('.tq.foi').forEach((t) => t.classList.remove('foi'))
    })
  })

  // 3. Expedição: clicar no botão "Saiu para entrega" abre escolha de entregador e despacha
  raiz.querySelectorAll<HTMLElement>('.pdv[data-aba="expedicao"]').forEach((ex) => {
    const janela = ex.querySelector<HTMLElement>('.janela-fundo')
    const btnSaiu = ex.querySelector<HTMLElement>('.sai-daqui .ac .bt')
    const card248 = ex.querySelector<HTMLElement>('.sai-daqui')
    const vazio = ex.querySelector<HTMLElement>('.slot .vazio')
    const opcoes = ex.querySelectorAll<HTMLElement>('.janela .opcoes > div')

    btnSaiu?.addEventListener('click', () => {
      janela?.classList.add('on')
      janela?.classList.remove('fecha')
    })

    opcoes.forEach((op) => {
      op.addEventListener('click', () => {
        opcoes.forEach((o) => o.classList.remove('at'))
        op.classList.add('at')
        janela?.classList.remove('on')
        card248?.classList.add('foi')
        vazio?.classList.add('on')
      })
    })
  })

  // 4. Celular do entregador: botão Entregue
  raiz.querySelectorAll<HTMLElement>('.fone .card .bt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entregue = btn.dataset.entregue === '1'
      btn.dataset.entregue = entregue ? '0' : '1'
      btn.textContent = entregue ? 'Entregue' : 'Entregue ✓'
    })
  })

  // 5. Fechamento: Sangria/Suprimento, conferir linhas e Fechar caixa F8
  raiz.querySelectorAll<HTMLElement>('.pdv[data-aba="caixa"]').forEach((cx) => {
    const lanc = cx.querySelector<HTMLElement>('.lanc')
    cx.querySelectorAll<HTMLElement>('.cab-tela .bt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tipo = btn.textContent?.trim() ?? 'Sangria'
        const row = document.createElement('div')
        row.className = 'ln'
        row.innerHTML = `<span class="t3">agora</span><span>${tipo} · lançada no turno · Ana</span><span class="num">${tipo === 'Sangria' ? '−50,00' : '+50,00'}</span>`
        lanc?.append(row)
      })
    })

    cx.querySelectorAll<HTMLElement>('.tb tbody tr:not(.soma)').forEach((tr) => {
      tr.addEventListener('click', () => {
        const conf = tr.querySelector<HTMLElement>('.conf')
        if (!conf) return
        const faltou = tr.dataset.faltou === '1'
        tr.dataset.faltou = faltou ? '0' : '1'
        conf.textContent = faltou ? 'Confere' : 'Falta R$ 10,00'
      })
    })

    const btnFechar = cx.querySelector<HTMLElement>('.fc .fim .bt')
    btnFechar?.addEventListener('click', () => {
      const fechado = btnFechar.dataset.fechado === '1'
      btnFechar.dataset.fechado = fechado ? '0' : '1'
      btnFechar.innerHTML = fechado ? 'Fechar caixa <span class="k">F8</span>' : 'Caixa fechado ✓'
    })
  })
}

ligarTelas(document)
const mHist = document.getElementById('mHist')
if (mHist) {
  ligarTelas(mHist)
}

$$<HTMLElement>('#historia .cap .txt').forEach((txt) => {
  txt.addEventListener('click', () => {
    txt.closest('.cap')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})
