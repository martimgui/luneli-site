// O estado das telas do produto ligado ao passo da rolagem (ver componentes/telas/estado.ts):
//   data-de="0.36"        aparece a partir do instante 0,36; num grupo .tr só o último alcançado fica visível;
//   data-cls="pronto@0.6" liga a classe "pronto" a partir de 0,6.

/** Aplica o instante p (0 a 1) do passo a uma tela. */
export function aplicar(raiz: Element, p: number): void {
  raiz.querySelectorAll<HTMLElement>('[data-de]').forEach((el) => {
    let ligado = p >= Number(el.dataset.de)
    if (ligado && el.dataset.ate !== undefined && p >= Number(el.dataset.ate)) ligado = false
    if (ligado && el.parentElement?.classList.contains('tr')) {
      const seguinte = el.nextElementSibling as HTMLElement | null
      if (seguinte?.dataset.de !== undefined && p >= Number(seguinte.dataset.de)) ligado = false
    }
    if (el.classList.contains('on') !== ligado) el.classList.toggle('on', ligado)
  })
  raiz.querySelectorAll<HTMLElement>('[data-cls]').forEach((el) => {
    for (const par of (el.dataset.cls ?? '').split(' ')) {
      const [classe, valor] = par.split('@')
      if (!classe || valor === undefined) continue
      const ligado = p >= Number(valor)
      if (el.classList.contains(classe) !== ligado) el.classList.toggle(classe, ligado)
    }
  })
}

/** O instante em que a tela fica parada fora do palco. */
export const estatico = (pdv: HTMLElement): number => Number(pdv.dataset.estatico ?? 1)
