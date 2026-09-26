import type { ResultadoPartida } from './filaResultadosService'
import { baseApiG1 } from './configuracaoG1'


const IDS_ANTIGOS: Record<string, string> = {
  '1': 'orbita-do-saber',
  '2': 'logica-em-dungeon',
  '3': 'corrida-contra-o-sino',
}

export function formatarPlacar(resultado: ResultadoPartida) {
  const jogoId = String(resultado.jogoId)

  return {
    id_partida: resultado.id,
    jogo: IDS_ANTIGOS[jogoId] ?? jogoId,
    jogador: resultado.apelido.trim().toUpperCase().slice(0, 9),
    pontos: resultado.pontuacao,
    feedback: { nota: resultado.avaliacao },
    ...(resultado.versao ? { versao: resultado.versao } : {}),
    ...(resultado.duracao_s !== undefined ? { duracao_s: resultado.duracao_s } : {}),
    ...(resultado.acertos !== undefined ? { acertos: resultado.acertos } : {}),
    ...(resultado.erros !== undefined ? { erros: resultado.erros } : {}),
    ...(resultado.tema ? { tema: resultado.tema } : {}),
    ...(resultado.jogadoEm ? { jogado_em: resultado.jogadoEm } : {}),
  }
}

export async function enviarResultadoParaG1(
  resultado: ResultadoPartida
) {
  const token = process.env.TOKEN_ESTACAO_G1
  if (!token) {
    console.warn('TOKEN_ESTACAO_G1 ausente: placares permanecem na fila local.')
    return false
  }
  try {
    const resposta = await fetch(
      `${baseApiG1()}/placares`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formatarPlacar(resultado)),
        signal: AbortSignal.timeout(15_000),
      }
    )
    if (resposta.status !== 200 && resposta.status !== 201) {
      console.warn(`Placar ${resultado.id} pendente: G1 respondeu HTTP ${resposta.status}.`)
      return false
    }
    return true
  } catch {
    console.warn(`Placar ${resultado.id} pendente: falha de conexão com G1.`)
    return false
  }
}
