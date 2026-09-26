import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { loadEnvFile } from 'node:process'
import { sincronizarJogos } from './services/sincronizacaoService'
import {prepararFilaResultados,adicionarResultado,} from './services/filaResultadosService'
import {prepararCatalogo,buscarCatalogo,} from './services/catalogoService'
import { reenviarPendentes } from './services/reenvioService'

try {
  loadEnvFile('.env')
} catch (erro) {
  if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro
}

const fastify = Fastify()

await fastify.register(cors, {
  // O jogo aprovado roda com sandbox e tem origem opaca (null).
  origin: ['http://localhost:5173', 'null'],
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
    apelido?: unknown
    jogoId?: unknown
    pontuacao?: unknown
    avaliacao?: unknown
    versao?: unknown
    duracao_s?: unknown
    acertos?: unknown
    erros?: unknown
    tema?: unknown
  } | undefined

  const validoOpcional = (valor: unknown) => valor === undefined ||
    (typeof valor === 'number' && Number.isFinite(valor) && valor >= 0)

  if (
    !resultado ||
    typeof resultado.apelido !== 'string' ||
    !/^[A-Z0-9]{1,9}$/i.test(resultado.apelido.trim()) ||
    typeof resultado.jogoId !== 'string' ||
    !resultado.jogoId.trim() ||
    typeof resultado.pontuacao !== 'number' ||
    !Number.isFinite(resultado.pontuacao) ||
    resultado.pontuacao < 0 ||
    typeof resultado.avaliacao !== 'number' ||
    !Number.isInteger(resultado.avaliacao) ||
    resultado.avaliacao < 1 ||
    resultado.avaliacao > 5 ||
    (resultado.versao !== undefined && (typeof resultado.versao !== 'string' || !resultado.versao)) ||
    !validoOpcional(resultado.duracao_s) || !validoOpcional(resultado.acertos) ||
    !validoOpcional(resultado.erros) ||
    (resultado.tema !== undefined && (typeof resultado.tema !== 'string' || !resultado.tema.trim()))
  ) {
    return reply.code(400).send({ sucesso: false, erro: 'Dados da partida inválidos.' })
  }

  const resultadoSalvo = await adicionarResultado({
    apelido: resultado.apelido.trim().toUpperCase(),
    jogoId: resultado.jogoId,
    pontuacao: resultado.pontuacao,
    avaliacao: resultado.avaliacao,
    ...(typeof resultado.versao === 'string' ? { versao: resultado.versao } : {}),
    ...(typeof resultado.duracao_s === 'number' ? { duracao_s: resultado.duracao_s } : {}),
    ...(typeof resultado.acertos === 'number' ? { acertos: resultado.acertos } : {}),
    ...(typeof resultado.erros === 'number' ? { erros: resultado.erros } : {}),
    ...(typeof resultado.tema === 'string' ? { tema: resultado.tema.trim() } : {}),
  })

  void reenviarPendentes().catch((erro) => {
    fastify.log.error(erro, 'Erro ao reenviar placares')
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
      host: '127.0.0.1',
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

    setInterval(() => {
      sincronizarJogos().catch((erro) => {
        console.error('Sincronização automática falhou; catálogo local preservado.', erro)
      })
    }, 3 * 60 * 60 * 1000)

  } catch (erro) {
    fastify.log.error(erro)
    process.exit(1)
  }
}

iniciarServidor()
