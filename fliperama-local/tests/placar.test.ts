import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { extrairPontuacao, extrairPlacar } from '../src/pages/Jogo/extrairPontuacao'
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

test('aceita PLACAR do G1 apenas do jogo e versão selecionados', () => {
  const mensagem = {
    tipo: 'PLACAR', jogo: 'jogo-exemplo', versao: '1.1.0', jogador: 'ana',
    pontos: 1450, duracao_s: 95, acertos: 8, erros: 2, tema: 'Matemática',
  }
  assert.deepEqual(extrairPlacar(mensagem, 'jogo-exemplo', '1.1.0'), {
    pontuacao: 1450, apelido: 'ANA', versao: '1.1.0',
    duracao_s: 95, acertos: 8, erros: 2, tema: 'Matemática',
  })
  assert.equal(extrairPlacar(mensagem, 'outro-jogo', '1.1.0'), null)
  assert.equal(extrairPlacar(mensagem, 'jogo-exemplo', '2.0.0'), null)
  assert.equal(extrairPlacar({ ...mensagem, jogador: 'ANA-LU' }, 'jogo-exemplo', '1.1.0'), null)
  assert.equal(extrairPlacar({ ...mensagem, pontos: Infinity }, 'jogo-exemplo', '1.1.0'), null)
  assert.equal(extrairPlacar({ ...mensagem, tipo: 'GAME_OVER' }, 'jogo-exemplo', '1.1.0'), null)
})

test('envia um placar compatível com a API oficial sem expor a matrícula', () => {
  const placar = formatarPlacar({
    id: 'f6529ce2-70fe-45fe-9dac-9992a997a293',
    matricula: '202612345678',
    apelido: 'Jogador',
    jogoId: 'jogo-exemplo',
    pontuacao: 150,
    avaliacao: 5,
    duracao_s: 50, acertos: 8, erros: 2, tema: 'Matemática', versao: '1.1.0',
    jogadoEm: '2026-09-24T10:00:00.000Z',
  })

  assert.deepEqual(placar, {
    id_partida: 'f6529ce2-70fe-45fe-9dac-9992a997a293',
    jogo: 'jogo-exemplo',
    jogador: 'JOGADOR',
    pontos: 150,
    feedback: { nota: 5 },
    versao: '1.1.0', duracao_s: 50, acertos: 8, erros: 2, tema: 'Matemática',
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

  assert.equal(placarAntigo.jogo, 'orbita-do-saber')
  assert.equal(placarAntigo.pontos, 0)
})

test('mantém o resultado offline e o retira da fila após envio à API', async () => {
  const pastaTeste = await mkdtemp(path.join(tmpdir(), 'fliperama-placar-'))
  const pastaOriginal = process.cwd()
  const fetchOriginal = globalThis.fetch
  const tokenOriginal = process.env.TOKEN_ESTACAO_G1
  const apiOriginal = process.env.API_G1

  try {
    process.chdir(pastaTeste)
    process.env.API_G1 = 'http://localhost:4000'
    await prepararFilaResultados()
    await writeFile('data/fila-resultados.json', JSON.stringify([{
      id: '6e181e48-7513-4b78-a925-13f49daf977a',
      matricula: '202612345678', apelido: 'ABC', jogoId: 'jogo-exemplo',
      pontuacao: 42, avaliacao: 4,
    }]))
    await prepararFilaResultados()
    assert.equal((await readFile('data/fila-resultados.json', 'utf8')).includes('matricula'), false)
    assert.equal((await buscarFilaResultados()).length, 1)
    await writeFile('data/fila-resultados.json', '[]')

    const partida = await adicionarResultado({
      apelido: 'ABC',
      jogoId: 'jogo-exemplo',
      pontuacao: 42,
      avaliacao: 4,
    })

    // O servidor pode salvar sem a rede e sem o token da estação.
    delete process.env.TOKEN_ESTACAO_G1
    await reenviarPendentes()
    assert.equal((await buscarFilaResultados()).length, 1)

    process.env.TOKEN_ESTACAO_G1 = 'est_teste'
    globalThis.fetch = async () => { throw new Error('API offline') }
    await reenviarPendentes()
    assert.equal((await buscarFilaResultados()).length, 1)

    globalThis.fetch = async () => new Response(null, { status: 401 })
    await reenviarPendentes()
    assert.equal((await buscarFilaResultados()).length, 1)

    let placarEnviado: ReturnType<typeof formatarPlacar> | undefined
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:4000/api/placares')
      assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer est_teste')
      placarEnviado = JSON.parse(String(options?.body))
      return new Response(null, { status: 201 })
    }

    await reenviarPendentes()
    assert.equal((await buscarFilaResultados()).length, 0)
    assert.equal(placarEnviado?.id_partida, partida.id)
    assert.equal(placarEnviado?.jogo, 'jogo-exemplo')
    assert.equal(placarEnviado?.jogador, 'ABC')
    assert.equal(placarEnviado?.pontos, 42)
    assert.equal('matricula' in (placarEnviado ?? {}), false)
  } finally {
    globalThis.fetch = fetchOriginal
    if (tokenOriginal === undefined) delete process.env.TOKEN_ESTACAO_G1
    else process.env.TOKEN_ESTACAO_G1 = tokenOriginal
    if (apiOriginal === undefined) delete process.env.API_G1
    else process.env.API_G1 = apiOriginal
    process.chdir(pastaOriginal)
    await rm(pastaTeste, { recursive: true, force: true })
  }
})
