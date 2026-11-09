import type { ResultadoPartida } from './filaResultadosService'
import { obterConfiguracaoG1 } from './configService'

const IDS_ANTIGOS: Record<string, string> = {
  '1': 'orbita-do-saber',
  '2': 'logica-em-dungeon',
  '3': 'corrida-contra-o-sino',
}

export function formatarPlacar(resultado: ResultadoPartida) {
  const jogoId = IDS_ANTIGOS[String(resultado.jogoId)] ?? String(resultado.jogoId)

  return {
    id_partida: resultado.id,
    jogo: jogoId,
    jogo_id: jogoId,
    jogador: resultado.apelido.trim().toUpperCase().slice(0, 9),
    pontos: resultado.pontuacao,
    feedback: {
      nota: resultado.avaliacao,
    },
    nota: resultado.avaliacao,
    ...(resultado.jogadoEm ? { jogado_em: resultado.jogadoEm } : {}),
  }
}

export async function enviarResultadoParaG1(
  resultado: ResultadoPartida
) {
  const { apiUrl, tokenEstacao } = obterConfiguracaoG1()

  try {
    const resposta = await fetch(
      `${apiUrl}/api/placares`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenEstacao}`,
        },
        body: JSON.stringify(formatarPlacar(resultado)),
      }
    )

    return resposta.ok
  } catch {
    return false
  }
}
