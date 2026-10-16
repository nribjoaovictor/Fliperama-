import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { sincronizarJogos } from './services/sincronizacaoService'
import { prepararFilaResultados } from './services/filaResultadosService'
import {prepararCatalogo,buscarCatalogo,} from './services/catalogoService'
import { reenviarPendentes } from './services/reenvioService'
import { registrarRotaResultados } from './routes/resultados'

const fastify = Fastify()

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
})

await fastify.register(fastifyStatic, {
  root: path.resolve('./data/jogos'),
  prefix: '/arquivos-jogos/',
})

fastify.get('/health', async () => {
  return {
    status: 'ok',
    modo: process.env.MODO_OPERACAO || 'local',
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

await fastify.register(registrarRotaResultados)

export async function criarApp() {
  return fastify
}

async function iniciarServidor() {
  try {
    const modoWeb = process.env.MODO_OPERACAO === 'web'
    const porta = Number(process.env.PORT) || 3000

    if (!modoWeb) {
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
      host: '0.0.0.0',
    })

    console.log(
      `Servidor rodando em http://0.0.0.0:${porta} (modo: ${process.env.MODO_OPERACAO || 'local'})`
    )

    if (!modoWeb) {
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

import { fileURLToPath } from 'node:url'

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  iniciarServidor()
}

