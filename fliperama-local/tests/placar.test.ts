import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { extrairPontuacao } from '../src/pages/Jogo/extrairPontuacao'
import { formatarPlacar } from '../server/services/envioResultadosService'
import { adicionarResultado, buscarFilaResultados, prepararFilaResultados } from '../server/services/filaResultadosService'
import { reenviarPendentes } from '../server/services/reenvioService'

test('captura o placar emitido pela Corrida ao terminar', () => {
  const mensagem = {
    type: 'GAME_OVER',
    jogo: 'corrida-contra-o-sino',
    payload: { score: 150, duration_seconds: 80 },
  }

  assert.equal(extrairPontuacao(mensagem), 150)
  assert.equal(extrairPontuacao({ type: 'EXIT_GAME', payload: {} }), null)
  assert.equal(extrairPontuacao({ type: 'GAME_OVER', payload: { score: -1 } }), null)
  assert.equal(extrairPontuacao({ type: 'GAME_OVER', payload: { score: Infinity } }), null)
})

test('envia um placar compatível com o ranking sem expor a matrícula', () => {
  const placar = formatarPlacar({
    id: 'partida-123',
    matricula: '202612345678',
    apelido: 'Jogador',
    jogoId: 'corrida-contra-o-sino',
    pontuacao: 150,
    avaliacao: 5,
    jogadoEm: '2026-09-24T10:00:00.000Z',
  })

  assert.deepEqual(placar, {
    id_partida: 'partida-123',
    jogo_id: 'corrida-contra-o-sino',
    jogador: 'JOGADOR',
    pontos: 150,
    nota: 5,
    jogado_em: '2026-09-24T10:00:00.000Z',
  })
})

test('converte IDs de partidas já salvas antes da mudança no catálogo', () => {
  const placarAntigo = formatarPlacar({
    id: 'partida-antiga',
    matricula: '202612345678',
    apelido: 'ABC',
    jogoId: 1 as unknown as string,
    pontuacao: 0,
    avaliacao: 3,
  })

  assert.equal(placarAntigo.jogo_id, 'orbita-do-saber')
  assert.equal(placarAntigo.pontos, 0)
})

test('mantém o resultado offline e o retira da fila após envio à API', async () => {
  const pastaTeste = await mkdtemp(path.join(tmpdir(), 'fliperama-placar-'))
  const pastaOriginal = process.cwd()
  const fetchOriginal = globalThis.fetch

  try {
    process.chdir(pastaTeste)
    await prepararFilaResultados()

    const partida = await adicionarResultado({
      matricula: '202612345678',
      apelido: 'ABC',
      jogoId: 'corrida-contra-o-sino',
      pontuacao: 42,
      avaliacao: 4,
    })

    globalThis.fetch = async () => { throw new Error('API offline') }
    await reenviarPendentes()
    assert.equal((await buscarFilaResultados()).length, 1)

    let placarEnviado: ReturnType<typeof formatarPlacar> | undefined
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:4000/api/placares')
      placarEnviado = JSON.parse(String(options?.body))
      return new Response(null, { status: 201 })
    }

    await reenviarPendentes()
    assert.equal((await buscarFilaResultados()).length, 0)
    assert.equal(placarEnviado?.id_partida, partida.id)
    assert.equal(placarEnviado?.jogo_id, 'corrida-contra-o-sino')
    assert.equal(placarEnviado?.jogador, 'ABC')
    assert.equal(placarEnviado?.pontos, 42)
    assert.equal('matricula' in (placarEnviado ?? {}), false)
  } finally {
    globalThis.fetch = fetchOriginal
    process.chdir(pastaOriginal)
    await rm(pastaTeste, { recursive: true, force: true })
  }
})
