import {
  buscarFilaResultados,
  removerResultado,
} from './filaResultadosService'

import { enviarResultadoParaG1 } from './envioResultadosService'

export async function reenviarPendentes() {
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