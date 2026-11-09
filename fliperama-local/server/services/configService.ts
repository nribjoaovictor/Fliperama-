export type ConfiguracaoG1 = {
  apiUrl: string
  tokenEstacao: string
}

export function obterConfiguracaoG1(
  env: NodeJS.ProcessEnv = process.env
): ConfiguracaoG1 {
  const apiUrl = (env.API_G1?.trim() || 'http://localhost:4000').replace(/\/+$/, '')
  const tokenEstacao = env.TOKEN_ESTACAO?.trim() || 'dev-estacao'

  return {
    apiUrl,
    tokenEstacao,
  }
}

