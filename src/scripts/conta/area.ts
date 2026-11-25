// A guarda de "Minha conta": só o dono, com a sessão aberta.
import { api, mensagemDoErro } from '../../lib/api'
import { avisar, elemento } from './formulario'
import { irParaEntrar, sessaoAtual } from './sessao'
import type { Sessao } from './sessao'

export const SO_O_DONO = 'Só o dono gerencia a assinatura.'

/** Mostra um erro no lugar do conteúdo. */
export function erroDaArea(texto: string): void {
  elemento('conta-carregando').hidden = true
  elemento('conta-conteudo').hidden = true
  avisar(elemento('conta-erro'), texto)
}

/** Esconde o "Carregando…" e mostra o conteúdo. */
export function mostrarArea(): void {
  elemento('conta-carregando').hidden = true
  elemento('conta-conteudo').hidden = false
}

/**
 * A sessão do dono, ou nulo (e a página já foi levada a /entrar ou mostra o aviso).
 */
export async function exigirDono(): Promise<Sessao | null> {
  elemento('sair').addEventListener('click', async () => {
    try {
      await api().auth.sair.mutate()
    } catch {
      // Sem sessão para encerrar: o resultado é o mesmo.
    }
    location.assign('/entrar/')
  })
  let sessao: Sessao | null
  try {
    sessao = await sessaoAtual()
  } catch (erro) {
    erroDaArea(mensagemDoErro(erro))
    return null
  }
  if (sessao === null) {
    irParaEntrar()
    return null
  }
  elemento('quem').textContent = `${sessao.funcionario.nome} · ${sessao.restaurante.nome}`
  if (!sessao.funcionario.ehDono) {
    erroDaArea(SO_O_DONO)
    return null
  }
  if (sessao.precisaTrocarSenha) {
    erroDaArea('Por segurança, crie uma senha nova antes de continuar. Peça o link em "Esqueci a senha", na tela de entrar.')
    return null
  }
  return sessao
}
