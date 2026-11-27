// Demonstração interativa de Mesas (#mesas): clicar em qualquer mesa abre a conta dela,
// e os botões Lançar itens, Receber parte e Fechar funcionam ao vivo.
import { $, $$ } from './comum'

interface Rodada {
  titulo: string
  meta: string
  qtd: number
  item: string
  valor: number
}

interface ContaMesa {
  nome: string
  aberta: boolean
  tempo: string
  pessoas: number
  garcom: string
  pago: number
  rodadas: Rodada[]
}

const fmt = (v: number): string => v.toFixed(2).replace('.', ',')

const DADOS_INICIAIS: Record<string, ContaMesa> = {
  'Mesa 2': {
    nome: 'Mesa 2',
    aberta: true,
    tempo: 'aberta há 1h12 · Ana',
    pessoas: 4,
    garcom: 'Ana',
    pago: 0,
    rodadas: [
      { titulo: 'Rodada 2', meta: '21:18 · Ana', qtd: 2, item: 'Pizza grande ½ Calabresa · ½ Quatro queijos', valor: 156.0 },
      { titulo: 'Rodada 1', meta: '20:45 · Ana', qtd: 1, item: 'Jarra de suco natural', valor: 13.45 },
    ],
  },
  'Mesa 4': {
    nome: 'Mesa 4',
    aberta: true,
    tempo: 'aberta há 38 min · Ana',
    pessoas: 4,
    garcom: 'Ana',
    pago: 50,
    rodadas: [
      { titulo: 'Rodada 3', meta: '21:40 · Ana', qtd: 2, item: 'Chope 300 ml', valor: 25.8 },
      { titulo: 'Rodada 2', meta: '21:12 · Ana', qtd: 1, item: 'Pizza grande ½ Portuguesa · ½ Frango com catupiry', valor: 82.0 },
      { titulo: 'Rodada 1', meta: '21:05 · Ana', qtd: 1, item: 'Porção de batata', valor: 28.0 },
    ],
  },
  'Mesa 6': {
    nome: 'Mesa 6',
    aberta: true,
    tempo: 'aberta há 12 min · Beto',
    pessoas: 2,
    garcom: 'Beto',
    pago: 0,
    rodadas: [{ titulo: 'Rodada 1', meta: '21:35 · Beto', qtd: 2, item: 'Hambúrguer artesanal + fritas', valor: 43.64 }],
  },
  'Mesa 8': {
    nome: 'Mesa 8',
    aberta: true,
    tempo: 'aberta há 2h05 · Beto',
    pessoas: 8,
    garcom: 'Beto',
    pago: 200,
    rodadas: [
      { titulo: 'Rodada 2', meta: '21:10 · Beto', qtd: 3, item: 'Pizza grande · sabores variados', valor: 246.0 },
      { titulo: 'Rodada 1', meta: '19:45 · Beto', qtd: 6, item: 'Chope 300 ml + refrigerantes', valor: 128.82 },
    ],
  },
  'Mesa 12': {
    nome: 'Mesa 12',
    aberta: true,
    tempo: 'aberta há 51 min · Ana',
    pessoas: 8,
    garcom: 'Ana',
    pago: 100,
    rodadas: [
      { titulo: 'Rodada 2', meta: '21:20 · Ana', qtd: 2, item: 'Pizza família', valor: 184.0 },
      { titulo: 'Rodada 1', meta: '20:55 · Ana', qtd: 4, item: 'Porções e bebidas', valor: 86.55 },
    ],
  },
  'Varanda 2': {
    nome: 'Varanda 2',
    aberta: true,
    tempo: 'aberta há 22 min · Beto',
    pessoas: 3,
    garcom: 'Beto',
    pago: 0,
    rodadas: [{ titulo: 'Rodada 1', meta: '21:25 · Beto', qtd: 3, item: 'Drink da casa + porção', valor: 58.64 }],
  },
  'Mesa 10': {
    nome: 'Mesa 10',
    aberta: true,
    tempo: 'aberta há 5 min · Beto',
    pessoas: 2,
    garcom: 'Beto',
    pago: 0,
    rodadas: [{ titulo: 'Rodada 1', meta: '21:42 · Beto', qtd: 2, item: 'Água com gás + café', valor: 21.82 }],
  },
}

const secao = $('#mesas')
if (secao) {
  const mesasEls = $$<HTMLElement>('#mesas .grade-m .mesa')
  const contaEl = $<HTMLElement>('#mesas .conta-mesa')
  const legendaContagem = $<HTMLElement>('#mesas .legenda .contagem')

  const contas = new Map<string, ContaMesa>()
  mesasEls.forEach((el) => {
    const nome = el.querySelector('.a')?.childNodes[0]?.textContent?.trim() ?? ''
    if (!nome) return
    const base = DADOS_INICIAIS[nome]
    if (base) {
      contas.set(nome, { ...base, rodadas: base.rodadas.map((r) => ({ ...r })) })
    } else {
      contas.set(nome, {
        nome,
        aberta: false,
        tempo: 'livre agora',
        pessoas: 2,
        garcom: 'Ana',
        pago: 0,
        rodadas: [],
      })
    }
  })

  let selecionada = 'Mesa 4'

  function calcularTotais(c: ContaMesa): { itens: number; taxa: number; total: number; porPessoa: number; falta: number } {
    const itens = c.rodadas.reduce((s, r) => s + r.valor, 0)
    const taxa = itens * 0.1
    const total = itens + taxa
    const porPessoa = total / Math.max(1, c.pessoas)
    const falta = Math.max(0, total - c.pago)
    return { itens, taxa, total, porPessoa, falta }
  }

  function atualizarMapa(): void {
    let abertas = 0
    let livres = 0
    mesasEls.forEach((el) => {
      const nome = el.querySelector('.a')?.childNodes[0]?.textContent?.trim() ?? ''
      const c = contas.get(nome)
      if (!c) return
      const ehJunto = nome === 'Mesa 13'
      if (c.aberta || ehJunto) abertas++
      else livres++

      el.classList.toggle('sel', nome === selecionada)
      if (ehJunto) return
      el.classList.toggle('oc', c.aberta)
      el.classList.toggle('livre', !c.aberta)

      const sEl = el.querySelector('.s')
      let vEl = el.querySelector('.v')
      if (c.aberta) {
        const { total } = calcularTotais(c)
        if (sEl) sEl.textContent = `${c.pessoas} pessoas · ${c.garcom}`
        if (!vEl) {
          vEl = document.createElement('div')
          vEl.className = 'v num'
          el.append(vEl)
        }
        vEl.textContent = `R$ ${fmt(total)}`
      } else {
        if (sEl) sEl.textContent = 'Livre'
        if (vEl) vEl.remove()
      }
    })
    if (legendaContagem) {
      legendaContagem.textContent = `${abertas} mesas abertas · ${livres} livres`
    }
  }

  function renderConta(): void {
    const chave = selecionada === 'Mesa 13' ? 'Mesa 12' : selecionada
    const c = contas.get(chave)
    if (!c) return

    const { itens, taxa, total, porPessoa, falta } = calcularTotais(c)
    const rodadasHtml = c.aberta
      ? c.rodadas
          .map(
            (r, idx) =>
              `<div class="rod ${idx === 0 ? 'nova' : ''}">
                <div class="rh"><span>${r.titulo}</span><span class="t3">${r.meta}</span></div>
                <div class="ri"><span>${r.qtd}</span><span>${r.item}</span><span class="num">${fmt(r.valor)}</span></div>
              </div>`,
          )
          .join('')
      : '<div class="rod"><div class="rh"><span>Mesa livre</span><span class="t3">Clique em Lançar itens para abrir</span></div></div>'

    contaEl.innerHTML = `
      <div class="c1"><h5>${c.nome}</h5><span class="t3">${c.tempo}</span></div>
      <div class="c2">${c.aberta ? `${c.pessoas} pessoas` : 'Disponível'}</div>
      <div class="rodadas-lista">${rodadasHtml}</div>
      <div class="tots">
        <div class="ln"><span>Itens</span><span class="num">${fmt(itens)}</span></div>
        <div class="ln"><span>Taxa de serviço (10%)</span><span class="num">${fmt(taxa)}</span></div>
        <div class="ln g"><span>Total</span><span class="num">R$ ${fmt(total)}</span></div>
        <div class="ln"><span>Por pessoa</span><span class="num">R$ ${fmt(porPessoa)}</span></div>
        <div class="ln pf"><span>Pago <b>R$ ${fmt(c.pago)}</b> · Falta <b>R$ ${fmt(falta)}</b></span></div>
      </div>
      <div class="acs">
        <button type="button" class="bt b1" data-mesa-acao="lancar">Lançar itens</button>
        <button type="button" class="bt b2" data-mesa-acao="receber" ${!c.aberta || falta <= 0 ? 'disabled' : ''}>Receber parte <span class="k">R</span></button>
        <button type="button" class="bt b2" data-mesa-acao="fechar" ${!c.aberta ? 'disabled' : ''}>Fechar <span class="k">F</span></button>
      </div>
    `

    contaEl.querySelector<HTMLButtonElement>('[data-mesa-acao="lancar"]')?.addEventListener('click', () => {
      if (!c.aberta) {
        c.aberta = true
        c.tempo = 'aberta agora · Ana'
        c.pago = 0
      }
      const n = c.rodadas.length + 1
      c.rodadas.unshift({
        titulo: `Rodada ${n}`,
        meta: 'agora · Ana',
        qtd: 1,
        item: 'Chope 300 ml',
        valor: 12.9,
      })
      atualizarMapa()
      renderConta()
    })

    contaEl.querySelector<HTMLButtonElement>('[data-mesa-acao="receber"]')?.addEventListener('click', () => {
      if (!c.aberta) return
      const { total: tot } = calcularTotais(c)
      c.pago = Math.min(tot, c.pago + 50)
      renderConta()
    })

    contaEl.querySelector<HTMLButtonElement>('[data-mesa-acao="fechar"]')?.addEventListener('click', () => {
      if (!c.aberta) return
      c.aberta = false
      c.tempo = 'livre agora'
      c.pago = 0
      c.rodadas = []
      atualizarMapa()
      renderConta()
    })
  }

  mesasEls.forEach((el) => {
    const nome = el.querySelector('.a')?.childNodes[0]?.textContent?.trim() ?? ''
    if (!nome) return
    el.setAttribute('role', 'button')
    el.setAttribute('tabindex', '0')
    const selecionar = (): void => {
      selecionada = nome
      atualizarMapa()
      renderConta()
    }
    el.addEventListener('click', selecionar)
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        selecionar()
      }
    })
  })

  atualizarMapa()
  renderConta()
}
