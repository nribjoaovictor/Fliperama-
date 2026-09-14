import type { ResultadoPartida } from './filaResultadosService'

const API_G1 = process.env.API_G1 ?? 'http://localhost:4000' // Como ainda nao tenho a api do G1, a porta 4000 é um mock
// da API do G1. Futuramente, quando a API real estiver pronta, vou alterar para a porta correta. Ela vai falhar agora por nao
// ter nada rodando nela, mas pelo menos a estrutura do código está pronta para quando a API real estiver pronta.

export async function enviarResultadoParaG1(
  resultado: ResultadoPartida
) {
  try {
    const resposta = await fetch(
      `${API_G1}/api/resultados`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resultado),
      }
    )

    return resposta.ok
  } catch {
    return false
  }
}