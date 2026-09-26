import {
  buscarFilaResultados,
  removerResultado,
} from './filaResultadosService'

import { enviarResultadoParaG1 } from './envioResultadosService'

let reenvio: Promise<void> | undefined

async function executarReenvio() {
  const fila = await buscarFilaResultados()

  for (const resultado of fila) {
    const enviado = await enviarResultadoParaG1(resultado)

    if (enviado) {
      await removerResultado(resultado.id)

      console.log(
        `Resultado ${resultado.id} enviado com sucesso.`
      )
    }
  }
}

export function reenviarPendentes() {
  if (!reenvio) reenvio = executarReenvio().finally(() => { reenvio = undefined })
  return reenvio
}
