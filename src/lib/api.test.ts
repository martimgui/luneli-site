import { TRPCClientError } from '@trpc/client'
import { describe, expect, it } from 'vitest'
import { MENSAGEM_SEM_SERVIDOR, causaDoErro, errosDoFormulario, esperaDoErro, mensagemDeEspera, mensagemDoErro, servidorIndisponivel } from './api'

/** Um erro como o servidor manda. */
function erroDoServidor(message: string, data: Record<string, unknown>): TRPCClientError<never> {
  return TRPCClientError.from({ error: { code: -32600, message, data } }) as TRPCClientError<never>
}

describe('tradução de erro em mensagem', () => {
  it('erro de negócio: a mensagem do servidor', () => {
    const erro = erroDoServidor('Este e-mail já tem uma conta.', { code: 'CONFLICT', causa: { tipo: 'email_em_uso' } })
    expect(causaDoErro(erro)?.tipo).toBe('email_em_uso')
    expect(mensagemDoErro(erro)).toBe('Este e-mail já tem uma conta.')
  })
  it('muitas tentativas: com a espera', () => {
    const erro = erroDoServidor('x', { code: 'TOO_MANY_REQUESTS', causa: { tipo: 'muitas_tentativas', tentarDeNovoEmSegundos: 42 } })
    expect(esperaDoErro(erro)).toBe(42)
    expect(mensagemDoErro(erro)).toBe('Muitas tentativas. Aguarde 42 segundos e tente de novo.')
    expect(mensagemDeEspera(1)).toBe('Muitas tentativas. Aguarde 1 segundo e tente de novo.')
    expect(mensagemDeEspera(125)).toBe('Muitas tentativas. Aguarde 3 minutos e tente de novo.')
  })
  it('servidor indisponível: o fetch falhou', () => {
    const erro = TRPCClientError.from(new TypeError('Failed to fetch'))
    expect(servidorIndisponivel(erro)).toBe(true)
    expect(mensagemDoErro(erro)).toBe(MENSAGEM_SEM_SERVIDOR)
    expect(mensagemDoErro(new Error('qualquer'))).toBe(MENSAGEM_SEM_SERVIDOR)
  })
  it('erro sem mensagem para a tela: texto genérico', () => {
    const erro = erroDoServidor('No procedure found', { code: 'NOT_FOUND' })
    expect(mensagemDoErro(erro)).toBe('Não foi possível concluir. Tente de novo.')
  })
  it('validação por campo e erro de negócio que vira erro de campo', () => {
    const validacao = erroDoServidor('Entrada inválida', { code: 'BAD_REQUEST', validacao: { gerais: [], campos: { email: ['E-mail inválido.'], outro: ['x'] } } })
    expect(errosDoFormulario(validacao, ['email', 'senha'] as const)).toEqual({ campos: { email: 'E-mail inválido.' }, geral: null })
    const emUso = erroDoServidor('Este e-mail já tem uma conta.', { code: 'CONFLICT', causa: { tipo: 'email_em_uso' } })
    expect(errosDoFormulario(emUso, ['email'] as const, { email_em_uso: 'email' })).toEqual({ campos: { email: 'Este e-mail já tem uma conta.' }, geral: null })
    expect(errosDoFormulario(emUso, ['email'] as const)).toEqual({ campos: {}, geral: 'Este e-mail já tem uma conta.' })
  })
})
