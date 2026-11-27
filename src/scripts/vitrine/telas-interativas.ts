// Torna interativos os controles dentro das telas de demonstração da seção #historia
// (tanto no palco fixo do computador quanto nas cópias de tablet/celular).
import { $$ } from './comum'

function ligarTelas(raiz: ParentNode): void {
  // 1. Pedido: seletor Delivery/Balcão, pagamento e Finalizar F8
  raiz.querySelectorAll<HTMLElement>('.pd').forEach((pd) => {
    const segs = pd.querySelectorAll<HTMLElement>('.seg')
    segs.forEach((seg) => {
      const opcoes = seg.querySelectorAll<HTMLElement>(':scope > span')
      opcoes.forEach((op) => {
        op.addEventListener('click', () => {
          opcoes.forEach((o) => o.classList.remove('at'))
          op.classList.add('at')
        })
      })
    })
    const btnFin = pd.querySelector<HTMLElement>('.pd-fech .fim .bt')
    const reg = pd.querySelector<HTMLElement>('.pd-fech .fim .registrado')
    btnFin?.addEventListener('click', () => {
      const ativo = reg?.classList.toggle('on') ?? false
      btnFin.classList.toggle('pronto', !ativo)
    })
  })

  // 2. Cozinha: selecionar tíquete, marcar Pronto e Desfazer
  raiz.querySelectorAll<HTMLElement>('.pdv[data-aba="cozinha"]').forEach((cz) => {
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

  // 3. Celular do entregador: botão Entregue
  raiz.querySelectorAll<HTMLElement>('.fone .card .bt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entregue = btn.dataset.entregue === '1'
      btn.dataset.entregue = entregue ? '0' : '1'
      btn.textContent = entregue ? 'Entregue' : 'Entregue ✓'
    })
  })

  // 4. Fechamento: botão Fechar caixa F8
  raiz.querySelectorAll<HTMLElement>('.fc .fim .bt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fechado = btn.dataset.fechado === '1'
      btn.dataset.fechado = fechado ? '0' : '1'
      btn.innerHTML = fechado ? 'Fechar caixa <span class="k">F8</span>' : 'Caixa fechado ✓'
    })
  })
}

// Liga cópias móveis/tablet já no DOM e também o palco clonado no computador (#mHist)
ligarTelas(document)
const mHist = document.getElementById('mHist')
if (mHist) {
  ligarTelas(mHist)
}

// Passos da história (#historia .cap): clicar no passo rola suavemente até ele
$$<HTMLElement>('#historia .cap .txt').forEach((txt) => {
  txt.addEventListener('click', () => {
    txt.closest('.cap')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})
