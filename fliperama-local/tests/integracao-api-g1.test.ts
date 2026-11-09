import AdmZip from 'adm-zip'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import Fastify from 'fastify'
import { obterConfiguracaoG1 } from '../server/services/configService'
import { buscarCatalogo, prepararCatalogo } from '../server/services/catalogoService'
import { enviarResultadoParaG1 } from '../server/services/envioResultadosService'
import { buscarFilaResultados, prepararFilaResultados } from '../server/services/filaResultadosService'
import { sincronizarJogos } from '../server/services/sincronizacaoService'
import { registrarRotaResultados } from '../server/routes/resultados'
import { gerarSqlSeedJogos } from '../scripts/seed-jogos-api-local'

function criarPacoteZipJogo(id: string, nome: string): { buffer: Buffer; sha256: string } {
  const zip = new AdmZip()
  const html = `<!doctype html><html><head><title>${nome}</title></head><body><script>fetch('questoes.json')</script></body></html>`
  const questoes = JSON.stringify({ tema: 'Matemática', questoes: [{ id: 'q1', correta: 0 }] })
  const manifesto = JSON.stringify({ id, nome, versao: '1.0.0', entrada: 'index.html' })

  zip.addFile('index.html', Buffer.from(html, 'utf-8'))
  zip.addFile('questoes.json', Buffer.from(questoes, 'utf-8'))
  zip.addFile('game.json', Buffer.from(manifesto, 'utf-8'))

  const buffer = zip.toBuffer()
  const sha256 = createHash('sha256').update(buffer).digest('hex')
  return { buffer, sha256 }
}

test('US3: obterConfiguracaoG1 usa variáveis customizadas e fallback local', () => {
  const padrao = obterConfiguracaoG1({})
  assert.equal(padrao.apiUrl, 'http://localhost:4000')
  assert.equal(padrao.tokenEstacao, 'dev-estacao')

  const custom = obterConfiguracaoG1({
    API_G1: 'https://plataforma-gestao-api.onrender.com///',
    TOKEN_ESTACAO: 'est_producao_123',
  })
  assert.equal(custom.apiUrl, 'https://plataforma-gestao-api.onrender.com')
  assert.equal(custom.tokenEstacao, 'est_producao_123')
})

test('US1: enviarResultadoParaG1 autentica com Bearer token e aceita 201 e 200 duplicada', async () => {
  const fetchOriginal = globalThis.fetch
  const envApiOriginal = process.env.API_G1
  const envTokenOriginal = process.env.TOKEN_ESTACAO

  try {
    process.env.API_G1 = 'http://localhost:4555'
    process.env.TOKEN_ESTACAO = 'est_token_teste'

    const chamadas: Array<{ url: string; auth: string | undefined; body: Record<string, unknown> }> = []
    let statusResposta = 201

    globalThis.fetch = async (url, options) => {
      const headers = options?.headers as Record<string, string> | undefined
      chamadas.push({
        url: String(url),
        auth: headers?.Authorization,
        body: JSON.parse(String(options?.body)),
      })
      return new Response(
        JSON.stringify({ ok: true, duplicada: statusResposta === 200 }),
        { status: statusResposta, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const amostra = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      matricula: '202612345678',
      apelido: 'ana',
      jogoId: 'quiz-invaders',
      pontuacao: 320,
      avaliacao: 5,
      jogadoEm: '2026-11-09T01:00:00.000Z',
    }

    assert.equal(await enviarResultadoParaG1(amostra), true)
    statusResposta = 200
    assert.equal(await enviarResultadoParaG1(amostra), true)
    statusResposta = 401
    assert.equal(await enviarResultadoParaG1(amostra), false)

    assert.equal(chamadas.length, 3)
    assert.equal(chamadas[0].url, 'http://localhost:4555/api/placares')
    assert.equal(chamadas[0].auth, 'Bearer est_token_teste')
    assert.equal(chamadas[0].body.jogo, 'quiz-invaders')
    assert.deepEqual(chamadas[0].body.feedback, { nota: 5 })
  } finally {
    globalThis.fetch = fetchOriginal
    if (envApiOriginal === undefined) delete process.env.API_G1
    else process.env.API_G1 = envApiOriginal
    if (envTokenOriginal === undefined) delete process.env.TOKEN_ESTACAO
    else process.env.TOKEN_ESTACAO = envTokenOriginal
  }
})

test('US1: POST /resultados com reenviarImediato envia em background e move para data/enviadas', async () => {
  const pastaTeste = await mkdtemp(path.join(tmpdir(), 'fliperama-imediato-'))
  const pastaOriginal = process.cwd()
  const fetchOriginal = globalThis.fetch
  const fastify = Fastify()

  try {
    process.chdir(pastaTeste)
    await prepararFilaResultados()
    await fastify.register(registrarRotaResultados, { reenviarImediato: true })

    let promessaEnvioResolve!: () => void
    const promessaEnvio = new Promise<void>((resolve) => {
      promessaEnvioResolve = resolve
    })

    globalThis.fetch = async () => {
      setTimeout(() => promessaEnvioResolve(), 10)
      return new Response(JSON.stringify({ ok: true, duplicada: false }), { status: 201 })
    }

    const resposta = await fastify.inject({
      method: 'POST',
      url: '/resultados',
      payload: {
        matricula: '',
        apelido: 'CAIO42',
        jogoId: 'quiz-invaders',
        pontuacao: 500,
        avaliacao: 5,
      },
    })

    assert.equal(resposta.statusCode, 200)
    const idGerado = resposta.json().resultado.id as string

    await promessaEnvio
    await new Promise((r) => setTimeout(r, 30))

    assert.equal((await buscarFilaResultados()).length, 0)
    const statEnviada = await stat(path.join('data/enviadas', `${idGerado}.json`))
    assert.equal(statEnviada.isFile(), true)
  } finally {
    await fastify.close()
    globalThis.fetch = fetchOriginal
    process.chdir(pastaOriginal)
    await rm(pastaTeste, { recursive: true, force: true })
  }
})

test('US2: sincronizarJogos baixa pacote da API G1, valida sha256, adapta questoes.json e usa cache na repetição', async () => {
  const pastaTeste = await mkdtemp(path.join(tmpdir(), 'fliperama-sync-api-'))
  const pastaOriginal = process.cwd()
  const fetchOriginal = globalThis.fetch

  try {
    process.chdir(pastaTeste)
    await prepararCatalogo()

    const pacote = criarPacoteZipJogo('quiz-invaders', 'Quiz Invaders')
    let downloadsPacote = 0

    globalThis.fetch = async (url) => {
      const urlStr = String(url)
      if (urlStr.endsWith('/api/jogos')) {
        return new Response(
          JSON.stringify([
            {
              id: 'quiz-invaders',
              nome: 'Quiz Invaders',
              autores: ['G1', 'G2'],
              versao: '1.0.0',
              sha256: pacote.sha256,
              pacote_url: 'http://localhost:4000/api/jogos/quiz-invaders/pacote?versao=1.0.0',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlStr.includes('/api/jogos/quiz-invaders/pacote')) {
        downloadsPacote += 1
        return new Response(new Uint8Array(pacote.buffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'X-Sha256': pacote.sha256,
          },
        })
      }
      throw new Error(`URL inesperada: ${urlStr}`)
    }

    const catalogo1 = await sincronizarJogos({ incluirFallbackGithub: false })
    assert.equal(downloadsPacote, 1)
    assert.equal(catalogo1.length, 1)
    assert.equal(catalogo1[0].id, 'quiz-invaders')
    assert.equal(catalogo1[0].autores, 'G1, G2')
    assert.equal(catalogo1[0].sha256, pacote.sha256)
    assert.equal(catalogo1[0].caminho, 'http://localhost:3000/arquivos-jogos/quiz-invaders/index.html')

    const htmlExtraido = await readFile(path.join('data/jogos/quiz-invaders/index.html'), 'utf-8')
    assert.ok(htmlExtraido.includes('/* fliperama: questoes embutidas */'))

    // Segunda sincronização com mesmo sha256 não deve baixar o zip novamente
    const catalogo2 = await sincronizarJogos({ incluirFallbackGithub: false })
    assert.equal(downloadsPacote, 1)
    assert.deepEqual(catalogo2, catalogo1)
    assert.deepEqual(await buscarCatalogo(), catalogo1)
  } finally {
    globalThis.fetch = fetchOriginal
    process.chdir(pastaOriginal)
    await rm(pastaTeste, { recursive: true, force: true })
  }
})

test('US2: sincronizarJogos rejeita pacote com sha256 corrompido', async () => {
  const pastaTeste = await mkdtemp(path.join(tmpdir(), 'fliperama-sync-corrupt-'))
  const pastaOriginal = process.cwd()
  const fetchOriginal = globalThis.fetch

  try {
    process.chdir(pastaTeste)
    await prepararCatalogo()

    const pacote = criarPacoteZipJogo('quiz-invaders', 'Quiz Invaders')

    globalThis.fetch = async (url) => {
      const urlStr = String(url)
      if (urlStr.endsWith('/api/jogos')) {
        return new Response(
          JSON.stringify([
            {
              id: 'quiz-invaders',
              nome: 'Quiz Invaders',
              autores: ['G1'],
              versao: '1.0.0',
              sha256: '0'.repeat(64),
              pacote_url: 'http://localhost:4000/api/jogos/quiz-invaders/pacote',
            },
          ]),
          { status: 200 }
        )
      }
      return new Response(new Uint8Array(pacote.buffer), { status: 200 })
    }

    await assert.rejects(
      async () => sincronizarJogos({ incluirFallbackGithub: false }),
      /Hash SHA-256 divergente/
    )
  } finally {
    globalThis.fetch = fetchOriginal
    process.chdir(pastaOriginal)
    await rm(pastaTeste, { recursive: true, force: true })
  }
})

test('US3: gerarSqlSeedJogos inclui todos os 5 jogos do acervo local de forma idempotente', () => {
  const sql = gerarSqlSeedJogos()
  assert.ok(sql.includes('ON CONFLICT (id) DO NOTHING'))
  for (const id of [
    'orbita-do-saber',
    'logica-em-dungeon',
    'corrida-contra-o-sino',
    'estrelas-da-ciencia',
    'encaixe-cientifico',
  ]) {
    assert.ok(sql.includes(`'${id}'`), `SQL deve incluir ${id}`)
  }
})

