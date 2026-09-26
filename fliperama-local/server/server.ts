import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { sincronizarJogos } from './services/sincronizacaoService'
import {prepararFilaResultados,adicionarResultado,} from './services/filaResultadosService'
import {prepararCatalogo,buscarCatalogo,} from './services/catalogoService'
import { reenviarPendentes } from './services/reenvioService'

const fastify = Fastify()

await fastify.register(cors, {
  origin: 'http://localhost:5173',
})

await fastify.register(fastifyStatic, {
  root: path.resolve('./data/jogos'),
  prefix: '/arquivos-jogos/',
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

fastify.post('/resultados', async (request, reply) => {
  const resultado = request.body as {
    matricula?: unknown
    apelido?: unknown
    jogoId?: unknown
    pontuacao?: unknown
    avaliacao?: unknown
  } | undefined

  if (
    !resultado ||
    typeof resultado.matricula !== 'string' ||
    !/^\d{12}$/.test(resultado.matricula) ||
    typeof resultado.apelido !== 'string' ||
    !resultado.apelido.trim() ||
    resultado.apelido.trim().length > 9 ||
    typeof resultado.jogoId !== 'string' ||
    !resultado.jogoId.trim() ||
    typeof resultado.pontuacao !== 'number' ||
    !Number.isFinite(resultado.pontuacao) ||
    resultado.pontuacao < 0 ||
    typeof resultado.avaliacao !== 'number' ||
    !Number.isInteger(resultado.avaliacao) ||
    resultado.avaliacao < 1 ||
    resultado.avaliacao > 5
  ) {
    return reply.code(400).send({ sucesso: false, erro: 'Dados da partida inválidos.' })
  }

  const resultadoSalvo = await adicionarResultado({
    matricula: resultado.matricula,
    apelido: resultado.apelido.trim().toUpperCase(),
    jogoId: resultado.jogoId,
    pontuacao: resultado.pontuacao,
    avaliacao: resultado.avaliacao,
  })

  return {
    sucesso: true,
    resultado: resultadoSalvo,
  }
})

async function iniciarServidor() {
  try {
    await prepararCatalogo()
    await prepararFilaResultados()

    try {
      await sincronizarJogos()
    } catch (erro) {
      console.error('Não foi possível atualizar os jogos. Usando o catálogo local.', erro)
    }

    await fastify.listen({
      port: 3000,
      host: '0.0.0.0',
    })

    console.log(
      'Servidor local rodando em http://localhost:3000'
    )

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

  } catch (erro) {
    fastify.log.error(erro)
    process.exit(1)
  }
}

iniciarServidor()
