import { describe, expect, it } from 'vitest'
import { caminhoDaFase, fracaoDoDeslocamento, luneta } from './fase-da-lua'

/** Lê os comandos de arco de um caminho: [rx, ry, rotação, arco grande, varredura, x, y]. */
const arcos = (d: string): number[][] => [...d.matchAll(/A(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) ([01]) ([01]) (-?[\d.]+) (-?[\d.]+)/g)].map((m) => m.slice(1).map(Number))

describe('caminho da fase', () => {
  it('nova é vazia e cheia é o disco inteiro', () => {
    expect(caminhoDaFase(0)).toBe('')
    expect(caminhoDaFase(1)).toBe('M0 -1A1 1 0 1 1 0 1A1 1 0 1 1 0 -1Z')
  })
  it('o terminador é meia elipse com eixo menor |1 − 2k|', () => {
    const [limbo, terminador] = arcos(caminhoDaFase(0.25))
    expect(limbo).toEqual([1, 1, 0, 0, 1, 0, 1])
    expect(terminador![0]).toBeCloseTo(0.5, 4)
    expect(terminador![1]).toBe(1)
    expect(arcos(caminhoDaFase(0.5))[1]![0]).toBeCloseTo(0, 3)
  })
  it('o crescente abaúla para a luz e a gibosa para a sombra', () => {
    expect(arcos(caminhoDaFase(0.3))[1]![4]).toBe(0)
    expect(arcos(caminhoDaFase(0.7))[1]![4]).toBe(1)
    expect(arcos(caminhoDaFase(0.7))[1]![0]).toBeCloseTo(0.4, 4)
  })
})

describe('luneta do eclipse', () => {
  it('sem a sombra encostar é o disco inteiro; coberta, nada', () => {
    expect(luneta(0, 0, 10, 30, 0, 10.4)).toBe('M0 -10A10 10 0 1 1 0 10A10 10 0 1 1 0 -10Z')
    expect(luneta(0, 0, 10, 0, 0, 10.4)).toBe('')
    expect(luneta(0, 0, 10, 0.2, 0, 10.4)).toBe('')
  })
  it('com a sombra pela metade, os pontos de cruzamento ficam no eixo vertical', () => {
    const [m, s] = arcos(luneta(0, 0, 10, 10, 0, 10))
    // cruzam em (5, ±8,66): o arco do disco é o grande, o da sombra o pequeno
    expect(m![5]).toBeCloseTo(5, 3)
    expect(Math.abs(m![6]!)).toBeCloseTo(8.66, 2)
    expect(m![3]).toBe(1)
    expect(s![3]).toBe(0)
  })
  it('os dois arcos fecham no mesmo ponto', () => {
    const d = luneta(100, 50, 40, 80, 30, 41.6)
    const inicio = /^M(-?[\d.]+) (-?[\d.]+)/.exec(d)!
    const fim = arcos(d)[1]!
    expect(fim[5]).toBeCloseTo(Number(inicio[1]), 3)
    expect(fim[6]).toBeCloseTo(Number(inicio[2]), 3)
  })
})

describe('fração do deslocamento dos ícones', () => {
  it('vai de 0 a 2 para 0 a 1', () => {
    expect(fracaoDoDeslocamento(0)).toBe(0)
    expect(fracaoDoDeslocamento(1)).toBe(0.5)
    expect(fracaoDoDeslocamento(2)).toBe(1)
    expect(fracaoDoDeslocamento(3)).toBe(1)
  })
})
