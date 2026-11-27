// Simulação interativa da seção "A internet caiu. O caixa continua." (em breve).
import { $, $$ } from './comum'

interface FaseRede {
  titulo: string
  caixa: string
  internet: string
  internetEsp: boolean
  pedidos: string
  nuvem: string
  nota: string
  corte: boolean
  sync: boolean
}

const FASES: Record<string, FaseRede> = {
  normal: {
    titulo: 'Operação normal',
    caixa: 'Vendendo',
    internet: 'Conectada',
    internetEsp: false,
    pedidos: 'Sincronizados em tempo real',
    nuvem: 'Recebendo tudo normalmente',
    nota: 'Com internet, o computador do balcão e a nuvem trabalham juntos em tempo real.',
    corte: false,
    sync: false,
  },
  caiu: {
    titulo: 'Internet caiu',
    caixa: 'Vendendo',
    internet: 'Caiu',
    internetEsp: true,
    pedidos: 'Guardados neste computador',
    nuvem: 'Em fila aguardando conexão',
    nota: 'É o que a primeira versão vai fazer: um caixa, no computador onde o Luneli está instalado.',
    corte: true,
    sync: false,
  },
  voltou: {
    titulo: 'Internet voltou',
    caixa: 'Sincronizado',
    internet: 'Restaurada',
    internetEsp: false,
    pedidos: 'Fila local enviada sem perda',
    nuvem: 'Tudo atualizado sozinho',
    nota: 'Quando a conexão volta, tudo o que foi vendido no apagão sobe para a nuvem sem redigitar nada.',
    corte: false,
    sync: true,
  },
}

const redeBox = $('#redeSim')
if (redeBox) {
  const btns = $$<HTMLButtonElement>('[data-rede-fase]')
  const linhaNuvem = $<SVGLineElement>('#redeLinhaNuvem')
  const caixaNuvem = $<SVGRectElement>('#redeBoxNuvem')
  const txtNuvem = $<SVGTextElement>('#redeTxtNuvem')
  const rCaixa = $('#rCaixa')
  const rNet = $('#rNet')
  const rNetPonto = $('#rNetPonto')
  const rPedidos = $('#rPedidos')
  const rNuvem = $('#rNuvem')
  const rNota = $('#rNota')

  function aplicar(id: string): void {
    const f = FASES[id] ?? FASES.caiu!
    btns.forEach((b) => {
      const ativo = b.dataset.redeFase === id
      b.classList.toggle('is-active', ativo)
      b.setAttribute('aria-pressed', String(ativo))
    })
    rCaixa.textContent = f.caixa
    rNet.textContent = f.internet
    rNetPonto.classList.toggle('esp', f.internetEsp)
    rPedidos.textContent = f.pedidos
    rNuvem.textContent = f.nuvem
    rNota.textContent = f.nota
    linhaNuvem.classList.toggle('is-cut', f.corte)
    linhaNuvem.classList.toggle('is-sync', f.sync)
    caixaNuvem.classList.toggle('is-dim', f.corte)
    txtNuvem.textContent = f.corte ? 'Em fila' : f.sync ? 'Sincronizado' : 'Conectado'
  }

  btns.forEach((btn) => {
    btn.addEventListener('click', () => aplicar(btn.dataset.redeFase ?? 'caiu'))
  })
}
