import { describe, expect, it } from 'vitest'
import { destinoSeguro, formatarData, formatarReais, fusoDoRestaurante, lerETirarTokenDoEndereco, telefoneDoDono, tokenDoFragmento } from './conta'

describe('telefone do dono e DDD', () => {
  it('tira o DDD dos dois primeiros dígitos', () => {
    expect(telefoneDoDono('(11) 98765-4321')).toEqual({ ok: true, ddd: '11', e164: '+5511987654321' })
    expect(telefoneDoDono('21 3456-7890')).toEqual({ ok: true, ddd: '21', e164: '+552134567890' })
  })
  it('aceita +55 e o zero antes do DDD', () => {
    expect(telefoneDoDono('+55 48 99999-0000')).toMatchObject({ ok: true, ddd: '48' })
    expect(telefoneDoDono('0 85 98888-1111')).toMatchObject({ ok: true, ddd: '85' })
  })
  it('recusa telefone sem DDD, DDD que não existe e número que não é de telefone', () => {
    expect(telefoneDoDono('98765-4321')).toEqual({ ok: false })
    expect(telefoneDoDono('(20) 98765-4321')).toEqual({ ok: false })
    expect(telefoneDoDono('(11) 18765-4321')).toEqual({ ok: false })
    expect(telefoneDoDono('')).toEqual({ ok: false })
    expect(telefoneDoDono('+1 415 555 0100')).toEqual({ ok: false })
  })
})

describe('fuso do restaurante', () => {
  it('usa o do navegador quando é do Brasil', () => {
    expect(fusoDoRestaurante('America/Manaus')).toBe('America/Manaus')
    expect(fusoDoRestaurante('America/Recife')).toBe('America/Recife')
  })
  it('cai no de Brasília fora do Brasil ou sem fuso', () => {
    expect(fusoDoRestaurante('Europe/Lisbon')).toBe('America/Sao_Paulo')
    expect(fusoDoRestaurante('UTC')).toBe('America/Sao_Paulo')
    expect(fusoDoRestaurante(undefined)).toBe('America/Sao_Paulo')
  })
})

describe('token do link no fragmento', () => {
  it('lê #token=...', () => {
    expect(tokenDoFragmento('#token=abc123')).toBe('abc123')
    expect(tokenDoFragmento('#outra=1&token=xyz')).toBe('xyz')
  })
  it('sem token: nulo', () => {
    expect(tokenDoFragmento('')).toBeNull()
    expect(tokenDoFragmento('#')).toBeNull()
    expect(tokenDoFragmento('#token=')).toBeNull()
    expect(tokenDoFragmento('#outra=1')).toBeNull()
  })
  it('tira o fragmento do endereço depois de ler', () => {
    window.history.replaceState(null, '', '/confirmar-email?x=1#token=segredo')
    expect(lerETirarTokenDoEndereco()).toBe('segredo')
    expect(window.location.hash).toBe('')
    expect(window.location.pathname + window.location.search).toBe('/confirmar-email?x=1')
  })
})

describe('formatos', () => {
  it('data e reais', () => {
    expect(formatarData('2026-11-03')).toBe('03/11/2026')
    expect(formatarData('2026-11-03T10:00:00Z')).toBe('03/11/2026')
    expect(formatarReais(12900)).toBe('R$ 129,00')
  })
  it('voltar só para um caminho do próprio site', () => {
    expect(destinoSeguro('/minha-conta/plano')).toBe('/minha-conta/plano')
    expect(destinoSeguro('https://outro.com')).toBe('/minha-conta')
    expect(destinoSeguro('//outro.com')).toBe('/minha-conta')
    expect(destinoSeguro(null)).toBe('/minha-conta')
  })
})
