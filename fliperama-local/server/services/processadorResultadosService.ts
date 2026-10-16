import { randomUUID } from 'node:crypto'
import { adicionarResultado, type ResultadoPartida } from './filaResultadosService'
import { enviarResultadoParaG1 } from './envioResultadosService'

export type DadosPartidaEntrada = Omit<ResultadoPartida, 'id' | 'jogadoEm'>

export async function processarResultado(
  dados: DadosPartidaEntrada
): Promise<ResultadoPartida> {
  const destino =
    process.env.DESTINO_PLACARES ??
    (process.env.MODO_OPERACAO === 'web' ? 'log' : 'local')

  if (destino === 'log') {
    const resultado: ResultadoPartida = {
      id: randomUUID(),
      ...dados,
      jogadoEm: new Date().toISOString(),
    }
    console.log(
      '[MODO DEMO] Placar registrado (log):',
      JSON.stringify(resultado)
    )
    return resultado
  }

  if (destino === 'g1') {
    const resultado: ResultadoPartida = {
      id: randomUUID(),
      ...dados,
      jogadoEm: new Date().toISOString(),
    }
    const enviado = await enviarResultadoParaG1(resultado)
    if (!enviado) {
      console.warn('[AVISO] Falha ao enviar placar para G1:', resultado.id)
    }
    return resultado
  }

  // Padrão local: salva na fila atômica em disco
  return adicionarResultado(dados)
}
