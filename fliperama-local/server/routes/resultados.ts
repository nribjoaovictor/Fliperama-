import type { FastifyInstance } from 'fastify'
import { processarResultado } from '../services/processadorResultadosService'

export async function registrarRotaResultados(fastify: FastifyInstance) {
  fastify.post('/resultados', async (request, reply) => {
    const resultado = request.body as {
      matricula?: unknown
      apelido?: unknown
      jogoId?: unknown
      pontuacao?: unknown
      avaliacao?: unknown
    } | undefined
    const apelido = typeof resultado?.apelido === 'string'
      ? resultado.apelido.trim().toUpperCase() || 'ANON'
      : ''
    const anonimo = apelido === 'ANON'

    if (
      !resultado ||
      typeof resultado.matricula !== 'string' ||
      (!anonimo && resultado.matricula !== '' && !/^\d{12}$/.test(resultado.matricula)) ||
      typeof resultado.apelido !== 'string' ||
      !/^[A-Z0-9]{1,9}$/.test(apelido) ||
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

    const resultadoSalvo = await processarResultado({
      matricula: anonimo ? '' : resultado.matricula,
      apelido,
      jogoId: resultado.jogoId,
      pontuacao: resultado.pontuacao,
      avaliacao: resultado.avaliacao,
    })

    return {
      sucesso: true,
      resultado: resultadoSalvo,
    }
  })
}
