// O mapa do site para os buscadores, gerado no build sem dependência nova: só as páginas públicas da vitrine.
// As páginas de conta (confirmar e-mail, senha, minha conta) ficam fora, e também levam noindex (Base.astro).
// Os endereços terminam em barra, como o canônico de cada página, porque o build gera uma pasta por página.
import type { APIRoute } from 'astro'

const PUBLICAS = ['/', '/planos', '/perguntas', '/o-que-vem-por-ai', '/testar-gratis', '/entrar', '/termos', '/privacidade', '/contrato-de-dados', '/contato']

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://luneli.com.br')
  const urls = PUBLICAS.map((caminho) => new URL(caminho === '/' ? '/' : `${caminho}/`, base).href)
  const corpo = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')
  return new Response(corpo, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
