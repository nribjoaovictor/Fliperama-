import type { ResultadoPartida } from './filaResultadosService'

// Apontar API_G1 para a API oficial quando estiver disponível.
const API_G1 = (process.env.API_G1 ?? 'http://localhost:4000').replace(/\/$/, '')

const IDS_ANTIGOS: Record<string, string> = {
  '1': 'orbita-do-saber',
  '2': 'logica-em-dungeon',
  '3': 'corrida-contra-o-sino',
}

export function formatarPlacar(resultado: ResultadoPartida) {
  const jogoId = String(resultado.jogoId)

  return {
    id_partida: resultado.id,
    jogo_id: IDS_ANTIGOS[jogoId] ?? jogoId,
    jogador: resultado.apelido.trim().toUpperCase().slice(0, 9),
    pontos: resultado.pontuacao,
    nota: resultado.avaliacao,
    ...(resultado.jogadoEm ? { jogado_em: resultado.jogadoEm } : {}),
  }
}

export async function enviarResultadoParaG1(
  resultado: ResultadoPartida
) {
  try {
    const resposta = await fetch(
      `${API_G1}/api/placares`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formatarPlacar(resultado)),
      }
    )

    return resposta.ok
  } catch {
    return false
  }
}
