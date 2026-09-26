export type PlacarRecebido = {
  pontuacao: number
  apelido?: string
  versao?: string
  duracao_s?: number
  acertos?: number
  erros?: number
  tema?: string
}

function numeroNaoNegativo(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
}

// O jogo aprovado usa PLACAR; jogos antigos podem emitir GAME_OVER.
export function extrairPlacar(mensagem: unknown, jogoId: string, versao?: string): PlacarRecebido | null {
  if (typeof mensagem !== 'object' || mensagem === null) return null
  const dados = mensagem as Record<string, unknown>
  if (dados.tipo === 'PLACAR') {
    if (dados.jogo !== jogoId || (versao && dados.versao !== versao) ||
        !numeroNaoNegativo(dados.pontos)) return null
    const apelido = typeof dados.jogador === 'string' ? dados.jogador.trim().toUpperCase() : ''
    if (versao && !/^[A-Z0-9]{1,9}$/.test(apelido)) return null
    if ([dados.duracao_s, dados.acertos, dados.erros].some((n) => n !== undefined && !numeroNaoNegativo(n))) return null
    return {
      pontuacao: dados.pontos,
      ...(apelido ? { apelido } : {}),
      ...(typeof dados.versao === 'string' ? { versao: dados.versao } : {}),
      ...(typeof dados.duracao_s === 'number' ? { duracao_s: dados.duracao_s } : {}),
      ...(typeof dados.acertos === 'number' ? { acertos: dados.acertos } : {}),
      ...(typeof dados.erros === 'number' ? { erros: dados.erros } : {}),
      ...(typeof dados.tema === 'string' && dados.tema.trim() ? { tema: dados.tema.trim() } : {}),
    }
  }
  if (versao || dados.type !== 'GAME_OVER' || (dados.jogo && dados.jogo !== jogoId)) return null
  const pontuacao = extrairPontuacao(mensagem)
  if (pontuacao === null) return null
  const payload = dados.payload as Record<string, unknown>
  const quiz = payload.quiz as Record<string, unknown> | undefined
  return {
    pontuacao,
    ...(numeroNaoNegativo(payload.duration_seconds) ? { duracao_s: payload.duration_seconds } : {}),
    ...(quiz && numeroNaoNegativo(quiz.correct) ? { acertos: quiz.correct } : {}),
    ...(quiz && numeroNaoNegativo(quiz.total) && numeroNaoNegativo(quiz.correct) && quiz.total >= quiz.correct
      ? { erros: quiz.total - quiz.correct } : {}),
  }
}

// Compatibilidade com testes e mensagens dos jogos antigos.
export function extrairPontuacao(mensagem: unknown): number | null {
  if (typeof mensagem !== 'object' || mensagem === null) return null

  const dados = mensagem as { type?: unknown; payload?: unknown }
  if (dados.type !== 'GAME_OVER' || typeof dados.payload !== 'object' || dados.payload === null) {
    return null
  }

  const { score } = dados.payload as { score?: unknown }
  return numeroNaoNegativo(score)
    ? score
    : null
}
