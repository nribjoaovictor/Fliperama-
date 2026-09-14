import Fastify from 'fastify'
import cors from '@fastify/cors'
import { sincronizarJogos } from './services/sincronizacaoService'
import {prepararFilaResultados,adicionarResultado,} from './services/filaResultadosService'
import {prepararCatalogo,buscarCatalogo,} from './services/catalogoService'
import { reenviarPendentes } from './services/reenvioService'

const fastify = Fastify()

await fastify.register(cors, {
  origin: 'http://localhost:5173',
})

fastify.get('/health', async () => {
  return {
    status: 'ok',
    sistema: 'Recreio Arcade',
  }
})

fastify.get('/jogos', async () => {
  return buscarCatalogo()
})

fastify.post('/sincronizar', async () => {
  const jogos = await sincronizarJogos()

  return {
    sucesso: true,
    quantidade: jogos.length,
  }
})

fastify.post('/resultados', async (request) => {
  const resultado = request.body as {
    matricula: string
    apelido: string
    jogoId: number
    pontuacao: number
    avaliacao: number
  }

  const resultadoSalvo = await adicionarResultado(resultado)

  return {
    sucesso: true,
    resultado: resultadoSalvo,
  }
})

async function iniciarServidor() {
  try {
    await prepararCatalogo()
    await sincronizarJogos()
    await prepararFilaResultados()

    await fastify.listen({
      port: 3000,
      host: '0.0.0.0',
    })

    console.log(
      'Servidor local rodando em http://localhost:3000'
    )

    setInterval(() => {
      reenviarPendentes().catch((erro) => {
        console.error(
          'Erro ao reenviar resultados:',
          erro
        )
      })
    }, 30_000)

  } catch (erro) {
    fastify.log.error(erro)
    process.exit(1)
  }
}

iniciarServidor()