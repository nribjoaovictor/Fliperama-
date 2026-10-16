import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { criarApp } from '../server/server'

test('MODO_OPERACAO=web registra placar em log sem tocar no disco', async () => {
  const pastaTeste = await mkdtemp(path.join(tmpdir(), 'fliperama-web-'))
  const pastaOriginal = process.cwd()

  const envOriginalModo = process.env.MODO_OPERACAO

  try {
    process.chdir(pastaTeste)
    process.env.MODO_OPERACAO = 'web'

    const app = await criarApp()

    const resposta = await app.inject({
      method: 'POST',
      url: '/resultados',
      payload: {
        matricula: '',
        apelido: 'ANON',
        jogoId: 'corrida-contra-o-sino',
        pontuacao: 100,
        avaliacao: 5,
      },
    })

    assert.equal(resposta.statusCode, 200)
    const corpo = resposta.json()
    assert.equal(corpo.sucesso, true)
    assert.equal(corpo.resultado.apelido, 'ANON')
    assert.equal(corpo.resultado.pontuacao, 100)
    assert.equal(typeof corpo.resultado.id, 'string')
    assert.equal(typeof corpo.resultado.jogadoEm, 'string')

    // Confirma que nenhuma pasta data/fila foi criada
    let entradas: string[] = []
    try {
      entradas = await readdir('data')
    } catch {
      // Pasta data nem existe
    }
    assert.equal(entradas.includes('fila'), false)
  } finally {
    if (envOriginalModo === undefined) {
      delete process.env.MODO_OPERACAO
    } else {
      process.env.MODO_OPERACAO = envOriginalModo
    }
    process.chdir(pastaOriginal)
    await rm(pastaTeste, { recursive: true, force: true })
  }
})

test('GET /health reflete o modo de operacao e status', async () => {
  const envOriginalModo = process.env.MODO_OPERACAO

  try {
    process.env.MODO_OPERACAO = 'web'
    const app = await criarApp()

    const resposta = await app.inject({
      method: 'GET',
      url: '/health',
    })

    assert.equal(resposta.statusCode, 200)
    const corpo = resposta.json()
    assert.equal(corpo.status, 'ok')
    assert.equal(corpo.modo, 'web')
  } finally {
    if (envOriginalModo === undefined) {
      delete process.env.MODO_OPERACAO
    } else {
      process.env.MODO_OPERACAO = envOriginalModo
    }
  }
})

test('CORS_ORIGIN permite requisicoes da origem configurada', async () => {
  const app = await criarApp()

  const resposta = await app.inject({
    method: 'OPTIONS',
    url: '/health',
    headers: {
      origin: 'http://localhost:5173',
      'access-control-request-method': 'GET',
    },
  })

  assert.equal(resposta.statusCode, 204)
  assert.equal(
    resposta.headers['access-control-allow-origin'],
    'http://localhost:5173'
  )
})
