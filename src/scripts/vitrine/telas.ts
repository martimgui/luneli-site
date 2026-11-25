// O estado das telas do produto ligado ao passo da rolagem (ver componentes/telas/estado.ts):
//   data-de="0.36"        aparece a partir do instante 0,36; num grupo .tr só o último alcançado fica visível;
//   data-cls="pronto@0.6" liga a classe "pronto" a partir de 0,6.
// Cada tela é preparada uma vez (os elementos e os instantes ficam em cache): por quadro não há querySelectorAll,
// e cada classe só é escrita quando muda de verdade.

interface Ligado {
  el: HTMLElement
  de: number
  ate: number
  /** Num grupo .tr: o instante do irmão seguinte, que toma o lugar deste. */
  seguinteDe: number | null
  estado: boolean
}
interface Classe {
  el: HTMLElement
  classe: string
  valor: number
  estado: boolean
}
export interface Tela {
  raiz: HTMLElement
  ligados: Ligado[]
  classes: Classe[]
  ultimo: number
}

/** Lê uma tela uma vez: o que aparece a partir de quando, e que classe liga em que instante. */
export function preparar(raiz: HTMLElement): Tela {
  const ligados: Ligado[] = [...raiz.querySelectorAll<HTMLElement>('[data-de]')].map((el) => {
    const noGrupo = el.parentElement?.classList.contains('tr') === true
    const seguinte = noGrupo ? (el.nextElementSibling as HTMLElement | null) : null
    const seguinteDe = seguinte?.dataset.de !== undefined ? Number(seguinte.dataset.de) : null
    return { el, de: Number(el.dataset.de), ate: el.dataset.ate === undefined ? Infinity : Number(el.dataset.ate), seguinteDe, estado: el.classList.contains('on') }
  })
  const classes: Classe[] = []
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-cls]')) {
    for (const par of (el.dataset.cls ?? '').split(' ')) {
      const [classe, valor] = par.split('@')
      if (!classe || valor === undefined) continue
      classes.push({ el, classe, valor: Number(valor), estado: el.classList.contains(classe) })
    }
  }
  return { raiz, ligados, classes, ultimo: NaN }
}

/** Aplica o instante p (0 a 1) do passo a uma tela preparada; só escreve o que mudou. */
export function aplicar(tela: Tela, p: number): void {
  if (p === tela.ultimo) return
  tela.ultimo = p
  for (const l of tela.ligados) {
    let ligado = p >= l.de && p < l.ate
    if (ligado && l.seguinteDe !== null && p >= l.seguinteDe) ligado = false
    if (ligado !== l.estado) {
      l.estado = ligado
      l.el.classList.toggle('on', ligado)
    }
  }
  for (const c of tela.classes) {
    const ligado = p >= c.valor
    if (ligado !== c.estado) {
      c.estado = ligado
      c.el.classList.toggle(c.classe, ligado)
    }
  }
}

/** O instante em que a tela fica parada fora do palco. */
export const estatico = (pdv: HTMLElement): number => Number(pdv.dataset.estatico ?? 1)
