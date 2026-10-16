import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { sincronizarJogos, JOGOS } from './services/sincronizacaoService'
import { buscarCatalogo } from './services/catalogoService'
import { registrarRotaResultados } from './routes/resultados'

export async function criarApp() {
  const fastify = Fastify()

  const corsOriginEnv = process.env.CORS_ORIGIN
  let originConfig: string | string[] | boolean = 'http://localhost:5173'

  if (corsOriginEnv) {
    if (corsOriginEnv === '*') {
      originConfig = true
    } else if (corsOriginEnv.includes(',')) {
      originConfig = corsOriginEnv.split(',').map((o) => o.trim())
    } else {
      originConfig = corsOriginEnv.trim()
    }
  }

  await fastify.register(cors, {
    origin: originConfig,
  })

  const pastaJogos = path.resolve('./data/jogos')
  if (process.env.MODO_OPERACAO !== 'web' || existsSync(pastaJogos)) {
    await fastify.register(fastifyStatic, {
      root: pastaJogos,
      prefix: '/arquivos-jogos/',
    })
  }

  fastify.get('/health', async () => {
    return {
      status: 'ok',
      sistema: 'Recreio Arcade',
      modo: process.env.MODO_OPERACAO || 'local',
    }
  })

  fastify.get('/jogos', async () => {
    try {
      return await buscarCatalogo()
    } catch {
      // Fallback em memória para execução web ou ausência de disco
      return JOGOS.map((jogo) => {
        const nomeRepositorio = jogo.repositorio.split('/').pop()
        return {
          id: jogo.id,
          nome: jogo.nome,
          autores: jogo.autores,
          caminho: `/jogos/${nomeRepositorio}-main/${jogo.arquivoInicial}`,
        }
      })
    }
  })

  fastify.post('/sincronizar', async () => {
    if (process.env.MODO_OPERACAO === 'web') {
      return {
        sucesso: true,
        quantidade: JOGOS.length,
        aviso: 'Sincronização em modo web preserva catálogo estático',
      }
    }

    const jogos = await sincronizarJogos()
    return {
      sucesso: true,
      quantidade: jogos.length,
    }
  })

  await fastify.register(registrarRotaResultados)

  return fastify
}
