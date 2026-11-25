// A geometria da lua minimalista, sem DOM: serve aos ícones de fase (gerados no servidor) e à lua da vitrine.
//
// A parte acesa de um disco em cada fase é limitada pelo limbo (um arco do círculo) e pelo terminador,
// que numa esfera vista de frente é meia elipse: eixo maior igual ao raio, eixo menor igual a |cos φ|,
// em que φ é o ângulo de fase. A fração iluminada é k = (1 − cos φ) / 2: 0 nova, 0,5 quarto, 1 cheia.
// No eclipse, a sombra é outro disco deslizando por cima: a parte acesa é a luneta entre os dois círculos.

const n = (v: number): string => (Math.abs(v) < 5e-5 ? '0' : v.toFixed(4).replace(/\.?0+$/, ''))

/** O caminho (SVG) da parte acesa numa fase k (0 nova … 1 cheia), no quadro unitário: centro (0,0), raio 1, luz vinda de +x. */
export function caminhoDaFase(k: number): string {
  if (k <= 0.0005) return ''
  if (k >= 0.9995) return 'M0 -1A1 1 0 1 1 0 1A1 1 0 1 1 0 -1Z'
  const a = Math.max(1e-4, Math.abs(1 - 2 * k))
  // o limbo aceso, de cima para baixo passando por +x; depois o terminador de volta: para o crescente a elipse
  // abaúla para o lado da luz (varredura 0), para a gibosa, para o lado escuro (varredura 1)
  return `M0 -1A1 1 0 0 1 0 1A${n(a)} 1 0 0 ${k > 0.5 ? 1 : 0} 0 -1Z`
}

/**
 * A luneta do eclipse: a parte do disco (cx, cy, r) que fica fora da sombra (sx, sy, rs), como caminho SVG.
 * Devolve o disco inteiro quando a sombra não toca, '' quando ela cobre tudo.
 */
export function luneta(cx: number, cy: number, r: number, sx: number, sy: number, rs: number): string {
  const dx = sx - cx
  const dy = sy - cy
  const d = Math.hypot(dx, dy)
  if (d >= r + rs) return `M${n(cx)} ${n(cy - r)}A${n(r)} ${n(r)} 0 1 1 ${n(cx)} ${n(cy + r)}A${n(r)} ${n(r)} 0 1 1 ${n(cx)} ${n(cy - r)}Z`
  if (d + r <= rs) return ''
  if (d < 1e-6) return ''
  const ux = dx / d
  const uy = dy / d
  const a = (r * r - rs * rs + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r * r - a * a))
  const px = cx + a * ux
  const py = cy + a * uy
  // os dois pontos em que os círculos se cruzam
  const p1x = px - h * uy
  const p1y = py + h * ux
  const p2x = px + h * uy
  const p2y = py - h * ux
  // o arco do disco fora da sombra passa pelo ponto mais longe dela; o arco da sombra dentro do disco, pelo mais perto
  const fx = cx - r * ux
  const fy = cy - r * uy
  const nx = sx - rs * ux
  const ny = sy - rs * uy
  const cruz = (ax: number, ay: number, bx: number, by: number): number => ax * by - ay * bx
  const varreduraM = cruz(p1x - cx, p1y - cy, fx - cx, fy - cy) > 0 ? 1 : 0
  const varreduraS = cruz(p2x - sx, p2y - sy, nx - sx, ny - sy) > 0 ? 1 : 0
  const grandeM = a > 0 ? 1 : 0
  const grandeS = d - a < 0 ? 1 : 0
  return `M${n(p1x)} ${n(p1y)}A${n(r)} ${n(r)} 0 ${grandeM} ${varreduraM} ${n(p2x)} ${n(p2y)}A${n(rs)} ${n(rs)} 0 ${grandeS} ${varreduraS} ${n(p1x)} ${n(p1y)}Z`
}

/** A fração acesa a partir do deslocamento do disco escuro do protótipo (0 nova … 2 cheia), para os ícones. */
export const fracaoDoDeslocamento = (d0: number): number => Math.min(1, Math.max(0, d0 / 2))
