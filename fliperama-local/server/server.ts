import { criarApp } from './app'
import { sincronizarJogos } from './services/sincronizacaoService'
import { prepararFilaResultados } from './services/filaResultadosService'
import { prepararCatalogo } from './services/catalogoService'
import { reenviarPendentes } from './services/reenvioService'

const modoOperacao = process.env.MODO_OPERACAO ?? 'local'
const porta = Number(process.env.PORT) || 3000
const host = '0.0.0.0'

async function iniciarServidor() {
  const fastify = await criarApp()

  try {
    if (modoOperacao !== 'web') {
      await prepararCatalogo()
      await prepararFilaResultados()

      try {
        await sincronizarJogos()
      } catch (erro) {
        console.error('Não foi possível atualizar os jogos. Usando o catálogo local.', erro)
      }
    }

    await fastify.listen({
      port: porta,
      host,
    })

    console.log(
      `Servidor rodando em http://${host}:${porta} [modo: ${modoOperacao}]`
    )

    if (modoOperacao !== 'web') {
      reenviarPendentes().catch((erro) => {
        console.error('Erro ao reenviar resultados:', erro)
      })

      setInterval(() => {
        reenviarPendentes().catch((erro) => {
          console.error(
            'Erro ao reenviar resultados:',
            erro
          )
        })
      }, 30_000)
    }
  } catch (erro) {
    fastify.log.error(erro)
    process.exit(1)
  }
}

iniciarServidor()
