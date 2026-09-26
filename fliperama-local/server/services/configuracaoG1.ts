// A API do G1 é configurada apenas no servidor local; o token nunca vai para o navegador.
export function baseApiG1() {
  const base = (process.env.API_G1 || 'https://plataforma-gestao-api.onrender.com')
    .replace(/\/+$/, '')
  return base.endsWith('/api') ? base : `${base}/api`
}
