function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function extrairPontuacao(mensagem: unknown, jogoEsperado: string): number | null {
  if (!isRecord(mensagem) || mensagem.jogo !== jogoEsperado) {
    return null
  }

  const tipo = mensagem.type ?? mensagem.tipo
  if (tipo !== 'PLACAR' && tipo !== 'GAME_OVER') return null

  if (isRecord(mensagem.payload)) {
    const campoPontuacao = tipo === 'PLACAR' ? 'pontos' : 'score'
    const pontuacao = mensagem.payload[campoPontuacao]
    if (typeof pontuacao === 'number' && Number.isFinite(pontuacao) && pontuacao >= 0) {
      return pontuacao
    }
  }

  const campoDireto = tipo === 'PLACAR' ? 'pontos' : 'score'
  const pontuacaoDireta = mensagem[campoDireto]
  if (typeof pontuacaoDireta === 'number' && Number.isFinite(pontuacaoDireta) && pontuacaoDireta >= 0) {
    return pontuacaoDireta
  }

  return null
}

