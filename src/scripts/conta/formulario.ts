// O que os formulários da conta fazem igual: ler campos, mostrar erro por campo, levar o foco
// ao primeiro erro, desligar o botão durante o envio e esperar o "muitas tentativas".
import { mensagemDeEspera } from '../../lib/api'

export function elemento<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (el === null) throw new Error(`Elemento não encontrado: #${id}`)
  return el as T
}

/** Mostra um aviso (erro, informação ou sucesso); texto nulo esconde. */
export function avisar(aviso: HTMLElement, texto: string | null, tipo: 'erro' | 'info' | 'ok' = 'erro'): void {
  aviso.className = `aviso aviso-${tipo}`
  aviso.textContent = texto ?? ''
  aviso.hidden = texto === null
}

export class Formulario<C extends string> {
  readonly form: HTMLFormElement
  readonly botao: HTMLButtonElement
  readonly aviso: HTMLElement
  private readonly textoDoBotao: string
  private esperaAte = 0
  private relogio: ReturnType<typeof setInterval> | null = null

  constructor(
    idDoFormulario: string,
    private readonly campos: readonly C[],
  ) {
    this.form = elemento<HTMLFormElement>(idDoFormulario)
    this.botao = this.form.querySelector<HTMLButtonElement>('button[type=submit]')!
    this.aviso = this.form.querySelector<HTMLElement>('.aviso')!
    this.textoDoBotao = this.botao.textContent ?? ''
    for (const campo of campos) this.campo(campo).addEventListener('input', () => this.erroDoCampo(campo, null))
    // O botão nasce desligado no HTML: sem o script, o envio nativo mandaria a senha no endereço.
    this.botao.disabled = false
  }

  campo(nome: C): HTMLInputElement {
    return this.form.querySelector<HTMLInputElement>(`[name="${nome}"]`)!
  }

  valor(nome: C): string {
    return this.campo(nome).value
  }

  erroDoCampo(nome: C, texto: string | null): void {
    const campo = this.campo(nome)
    const erro = document.getElementById(`erro-${nome}`)
    if (erro) erro.textContent = texto ?? ''
    if (texto) campo.setAttribute('aria-invalid', 'true')
    else campo.removeAttribute('aria-invalid')
  }

  /** Mostra os erros e leva o foco ao primeiro campo com erro, na ordem do formulário. Diz se houve algum. */
  mostrarErros(erros: Partial<Record<C, string>>): boolean {
    let primeiro: HTMLInputElement | null = null
    for (const campo of this.campos) {
      const texto = erros[campo] ?? null
      this.erroDoCampo(campo, texto)
      if (texto && primeiro === null) primeiro = this.campo(campo)
    }
    primeiro?.focus()
    return primeiro !== null
  }

  geral(texto: string | null, tipo: 'erro' | 'info' | 'ok' = 'erro'): void {
    avisar(this.aviso, texto, tipo)
  }

  /** Liga ou desliga o "enviando". Durante a espera de "muitas tentativas", o botão continua parado. */
  ocupado(sim: boolean, texto = 'Enviando…'): void {
    this.botao.disabled = sim || Date.now() < this.esperaAte
    this.botao.textContent = sim ? texto : this.textoDoBotao
    this.form.setAttribute('aria-busy', String(sim))
  }

  /**
   * Para o botão pelos segundos do "muitas tentativas". O alerta anuncia uma vez, no começo e no fim;
   * a contagem fica num elemento à parte, que o leitor de tela não repete a cada segundo.
   */
  esperar(segundos: number): void {
    this.esperaAte = Date.now() + segundos * 1000
    this.botao.disabled = true
    if (this.relogio !== null) clearInterval(this.relogio)
    this.geral(mensagemDeEspera(segundos))
    const contagem = this.contagem()
    const atualizar = (): void => {
      const faltam = Math.ceil((this.esperaAte - Date.now()) / 1000)
      if (faltam <= 0) {
        if (this.relogio !== null) clearInterval(this.relogio)
        this.relogio = null
        this.botao.disabled = false
        contagem.hidden = true
        this.geral('Já pode tentar de novo.', 'info')
        return
      }
      contagem.hidden = false
      contagem.textContent = `Faltam ${faltam} ${faltam === 1 ? 'segundo' : 'segundos'}.`
    }
    atualizar()
    this.relogio = setInterval(atualizar, 1000)
  }

  /** O elemento da contagem, logo depois do aviso geral, criado na primeira espera. */
  private contagem(): HTMLElement {
    const seguinte = this.aviso.nextElementSibling
    if (seguinte instanceof HTMLElement && seguinte.classList.contains('contagem')) return seguinte
    const el = document.createElement('p')
    el.className = 'contagem'
    el.setAttribute('aria-live', 'off')
    el.hidden = true
    this.aviso.after(el)
    return el
  }

  emEspera(): boolean {
    return Date.now() < this.esperaAte
  }
}
