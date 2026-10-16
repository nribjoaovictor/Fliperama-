import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { criarApp } from '../server/app'

test('MODO_OPERACAO=web e DESTINO_PLACARES=log registra placar sem tocar no disco', async () => {
  const pastaTeste = await mkdtemp(path.join(tmpdir(), 'fliperama-web-'))
  const pastaOriginal = process.cwd()

  const envOriginalModo = process.env.MODO_OPERACAO
  const envOriginalDestino = process.env.DESTINO_PLACARES

  try {
    process.chdir(pastaTeste)
    process.env.MODO_OPERACAO = 'web'
    process.env.DESTINO_PLACARES = 'log'

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
    process.env.MODO_OPERACAO = envOriginalModo
    process.env.DESTINO_PLACARES = envOriginalDestino
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
    process.env.MODO_OPERACAO = envOriginalModo
  }
})

test('CORS_ORIGIN personalizado permite requisicoes da origem configurada', async () => {
  const envOriginalCors = process.env.CORS_ORIGIN

  try {
    process.env.CORS_ORIGIN = 'https://fliperama-local.vercel.app'
    const app = await criarApp()

    const resposta = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'https://fliperama-local.vercel.app',
        'access-control-request-method': 'GET',
      },
    })

    assert.equal(resposta.statusCode, 204)
    assert.equal(
      resposta.headers['access-control-allow-origin'],
      'https://fliperama-local.vercel.app'
    )
  } finally {
    process.env.CORS_ORIGIN = envOriginalCors
  }
})
