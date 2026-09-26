// Contrato comum para jogos exibidos dentro do iframe do fliperama.
export function extrairPontuacao(mensagem: unknown): number | null {
  if (typeof mensagem !== 'object' || mensagem === null) return null

  const dados = mensagem as { type?: unknown; payload?: unknown }
  if (dados.type !== 'GAME_OVER' || typeof dados.payload !== 'object' || dados.payload === null) {
    return null
  }

  const { score } = dados.payload as { score?: unknown }
  return typeof score === 'number' && Number.isFinite(score) && score >= 0
    ? score
    : null
}
