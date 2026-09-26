import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { buscarCatalogo, prepararCatalogo } from '../server/services/catalogoService'
import { sincronizarJogos } from '../server/services/sincronizacaoService'

test('sincroniza apenas pacote aprovado e íntegro; preserva catálogo se a API falhar', async () => {
  const pasta = await mkdtemp(path.join(tmpdir(), 'fliperama-g1-'))
  const cwdOriginal = process.cwd()
  const fetchOriginal = globalThis.fetch
  const apiOriginal = process.env.API_G1
  const zip = new AdmZip()
  zip.addFile('index.html', Buffer.from('<h1>Exemplo</h1>'))
  zip.addFile('game.json', Buffer.from('{"id":"jogo-exemplo"}'))
  const pacote = zip.toBuffer()
  const sha256 = createHash('sha256').update(pacote).digest('hex')
  const jogo = {
    id: 'jogo-exemplo', nome: 'Jogo exemplo', autores: ['G1'],
    status: 'aprovado', versao: '1.1.0', sha256,
    pacote_url: 'http://localhost:4000/api/jogos/jogo-exemplo/pacote?versao=1.1.0',
  }

  try {
    process.chdir(pasta)
    process.env.API_G1 = 'http://localhost:4000'
    await prepararCatalogo()
    let downloads = 0
    globalThis.fetch = async (url) => {
      if (String(url) === 'http://localhost:4000/api/jogos') {
        return Response.json([jogo])
      }
      assert.equal(url, jogo.pacote_url)
      downloads++
      return new Response(pacote, { headers: { 'X-Sha256': sha256 } })
    }

    const [instalado] = await sincronizarJogos()
    assert.equal(downloads, 1)
    assert.equal(instalado?.id, jogo.id)
    assert.equal(instalado?.versao, jogo.versao)
    assert.equal(instalado?.caminho, `http://localhost:3000/arquivos-jogos/jogo-exemplo/${sha256}/index.html`)
    assert.equal(await readFile(`data/jogos/jogo-exemplo/${sha256}/index.html`, 'utf8'), '<h1>Exemplo</h1>')

    await sincronizarJogos()
    assert.equal(downloads, 1, 'hash instalado não deve ser baixado outra vez')

    globalThis.fetch = async (url) => String(url).endsWith('/api/jogos')
      ? Response.json([{ ...jogo, sha256: 'a'.repeat(64) }])
      : new Response(pacote, { headers: { 'X-Sha256': sha256 } })
    await assert.rejects(sincronizarJogos(), /SHA-256 incorreto/)
    assert.deepEqual(await buscarCatalogo(), [instalado])

    globalThis.fetch = async () => { throw new Error('API offline') }
    await assert.rejects(sincronizarJogos(), /API offline/)
    assert.deepEqual(await buscarCatalogo(), [instalado])
  } finally {
    globalThis.fetch = fetchOriginal
    if (apiOriginal === undefined) delete process.env.API_G1
    else process.env.API_G1 = apiOriginal
    process.chdir(cwdOriginal)
    await rm(pasta, { recursive: true, force: true })
  }
})
