import { api, causaDoErro, errosDoFormulario, mensagemDoErro } from '../../lib/api'
import { fusoDoNavegador, fusoDoRestaurante } from '../../lib/conta'
import { mostrarArea } from './area'
import { Formulario, avisar, elemento } from './formulario'

const formEntrar = new Formulario<'email' | 'senha'>('form-portal-entrar', ['email', 'senha'])
const formLoja = new Formulario<'nomeDoRestaurante' | 'documento' | 'endereco'>('form-criar-loja', ['nomeDoRestaurante', 'documento', 'endereco'])

async function carregarPortal(): Promise<void> {
  mostrarArea()
  elemento('portal-carregando').hidden = false
  elemento('portal-deslogado').hidden = true
  elemento('portal-conteudo').hidden = true
  try {
    const res = await api().conta.portal.query()
    elemento('portal-carregando').hidden = true
    if (!res.logado) {
      elemento('portal-deslogado').hidden = false
      return
    }
    elemento('portal-conteudo').hidden = false
    elemento('portal-ola').textContent = res.pessoa.nome ? `Olá, ${res.pessoa.nome}` : 'Sua conta'
    elemento('portal-dados').textContent = [res.pessoa.email, res.pessoa.telefone].filter(Boolean).join(' · ')

    const listaConvites = elemento('lista-convites')
    listaConvites.innerHTML = ''
    elemento('bloco-convites').hidden = res.convitesAbertos.length === 0
    for (const c of res.convitesAbertos) {
      const li = document.createElement('li')
      li.style.display = 'flex'
      li.style.justifyContent = 'space-between'
      li.style.alignItems = 'center'
      li.style.gap = '12px'
      const texto = document.createElement('span')
      texto.textContent = `${c.restauranteNome} (${c.papel === 'entregador' ? 'Entregador' : 'Equipe'})`
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn dois'
      btn.textContent = 'Aceitar convite'
      btn.addEventListener('click', async () => {
        btn.disabled = true
        try {
          await api().conta.aceitarConvitePortal.mutate({ conviteId: c.conviteId })
          await carregarPortal()
        } catch (erro) {
          btn.disabled = false
          avisar(elemento('aviso-convite'), mensagemDoErro(erro), 'erro')
        }
      })
      li.append(texto, btn)
      listaConvites.append(li)
    }

    const listaLojas = elemento('lista-lojas')
    listaLojas.innerHTML = ''
    elemento('sem-restaurantes').hidden = res.restaurantes.length > 0
    for (const r of res.restaurantes) {
      const li = document.createElement('li')
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn dois'
      btn.textContent = `${r.nome} (${r.codigo})`
      btn.addEventListener('click', async () => {
        btn.disabled = true
        try {
          await api().auth.escolherRestaurante.mutate({ restauranteId: r.restauranteId })
          location.assign('/minha-conta/')
        } catch {
          btn.disabled = false
        }
      })
      li.append(btn)
      listaLojas.append(li)
    }
  } catch (erro) {
    elemento('portal-carregando').hidden = true
    elemento('portal-deslogado').hidden = false
    avisar(formEntrar.form.querySelector('.aviso') as HTMLElement, mensagemDoErro(erro), 'erro')
  }
}

formEntrar.form.addEventListener('submit', async (e) => {
  e.preventDefault()
  formEntrar.geral(null)
  const email = formEntrar.valor('email').trim()
  const senha = formEntrar.valor('senha')
  if (formEntrar.mostrarErros({ email: email === '' ? 'Informe o e-mail.' : undefined, senha: senha === '' ? 'Informe a senha.' : undefined })) return
  formEntrar.ocupado(true, 'Entrando…')
  try {
    await api().conta.entrarPortal.mutate({ email, senha })
    formEntrar.campo('senha').value = ''
    await carregarPortal()
  } catch (erro) {
    formEntrar.geral(mensagemDoErro(erro))
  } finally {
    formEntrar.ocupado(false)
  }
})

formLoja.form.addEventListener('submit', async (e) => {
  e.preventDefault()
  formLoja.geral(null)
  const nomeDoRestaurante = formLoja.valor('nomeDoRestaurante').trim()
  const documento = formLoja.valor('documento').replace(/\D/g, '')
  const endereco = formLoja.valor('endereco').trim()
  const erros: Partial<Record<'nomeDoRestaurante' | 'documento', string>> = {}
  if (nomeDoRestaurante === '') erros.nomeDoRestaurante = 'Informe o nome do restaurante.'
  if (documento.length !== 11 && documento.length !== 14) erros.documento = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).'
  if (formLoja.mostrarErros(erros)) return

  formLoja.ocupado(true, 'Criando restaurante…')
  try {
    const criada = await api().conta.criarRestaurante.mutate({
      nomeDoRestaurante,
      dddPadrao: '11',
      fusoHorario: fusoDoRestaurante(fusoDoNavegador()),
      documento,
      ...(endereco === '' ? {} : { endereco }),
    })
    await api().auth.escolherRestaurante.mutate({ restauranteId: criada.restauranteId })
    location.assign('/minha-conta/')
  } catch (erro) {
    const causa = causaDoErro(erro)
    if (causa?.tipo === 'teste_ja_usado') {
      formLoja.geral('Este CPF/CNPJ já utilizou o teste grátis nos últimos 12 meses.')
      return
    }
    const { campos, geral } = errosDoFormulario(erro, ['nomeDoRestaurante', 'documento', 'endereco'])
    formLoja.mostrarErros(campos)
    formLoja.geral(geral)
  } finally {
    formLoja.ocupado(false)
  }
})

void carregarPortal()
