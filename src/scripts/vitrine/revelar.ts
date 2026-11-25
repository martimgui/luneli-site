// Entradas suaves: o que leva a classe .revela aparece (opacidade e um deslize de 18 px) na primeira vez que entra
// na janela, uma vez só, com o atraso --i para escalonar vizinhos. Só com script e sem "reduzir movimento";
// nos dois outros casos o CSS já mostra tudo. Nada de layout: só opacity e transform.
import { $$, semMovimento } from './comum'

const alvos = $$('.revela')
if (semMovimento() || !('IntersectionObserver' in window)) alvos.forEach((a) => a.classList.add('visto'))
else {
  const observador = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visto')
          observador.unobserve(entrada.target)
        }
      }),
    { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
  )
  alvos.forEach((a) => observador.observe(a))
}
