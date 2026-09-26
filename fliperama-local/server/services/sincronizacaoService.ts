import AdmZip from 'adm-zip'
import { createHash, randomUUID } from 'node:crypto'
import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { baseApiG1 } from './configuracaoG1'
import { salvarCatalogo } from './catalogoService'
import type { JogoCatalogo } from './catalogoService'

const PASTA_JOGOS = './data/jogos'
const LIMITE_ZIP = 20 * 1024 * 1024
const LIMITE_EXTRAIDO = 40 * 1024 * 1024

type JogoAprovado = {
  id: string
  nome: string
  autores: string[]
  versao: string
  status: string
  sha256: string
  pacote_url: string
}

function validarJogo(item: unknown): JogoAprovado {
  if (!item || typeof item !== 'object') throw new Error('Catálogo do G1 inválido')
  const jogo = item as Partial<JogoAprovado>
  if (
    typeof jogo.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(jogo.id) ||
    typeof jogo.nome !== 'string' || !jogo.nome ||
    !Array.isArray(jogo.autores) || !jogo.autores.every((a) => typeof a === 'string') ||
    typeof jogo.versao !== 'string' || jogo.status !== 'aprovado' ||
    typeof jogo.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(jogo.sha256) ||
    typeof jogo.pacote_url !== 'string'
  ) throw new Error('O G1 devolveu um jogo aprovado sem os dados do pacote')

  const url = new URL(jogo.pacote_url)
  const api = new URL(baseApiG1())
  if (url.origin !== api.origin ||
      !url.pathname.startsWith(`${api.pathname}/jogos/`) ||
      !url.pathname.endsWith('/pacote')) {
    throw new Error(`Endereço de pacote inválido para ${jogo.id}`)
  }
  return jogo as JogoAprovado
}

async function baixarPacote(jogo: JogoAprovado) {
  const resposta = await fetch(jogo.pacote_url, { signal: AbortSignal.timeout(30_000) })
  if (!resposta.ok) throw new Error(`Pacote de ${jogo.id}: HTTP ${resposta.status}`)
  if (Number(resposta.headers.get('content-length')) > LIMITE_ZIP) {
    throw new Error(`Pacote de ${jogo.id} excede 20 MB`)
  }
  const partes: Uint8Array[] = []
  let tamanho = 0
  if (!resposta.body) throw new Error(`Pacote de ${jogo.id} sem conteúdo`)
  for await (const parte of resposta.body) {
    tamanho += parte.byteLength
    if (tamanho > LIMITE_ZIP) throw new Error(`Pacote de ${jogo.id} excede 20 MB`)
    partes.push(parte)
  }
  const buffer = Buffer.concat(partes)
  const sha256 = createHash('sha256').update(buffer).digest('hex')
  if (resposta.headers.get('x-sha256') !== sha256 || jogo.sha256 !== sha256) {
    throw new Error(`SHA-256 incorreto no pacote de ${jogo.id}`)
  }
  return buffer
}

async function instalarPacote(jogo: JogoAprovado, zipBuffer: Buffer) {
  const destino = path.join(PASTA_JOGOS, jogo.id, jogo.sha256)
  const temporario = path.join(PASTA_JOGOS, `.instalacao-${randomUUID()}`)
  const zip = new AdmZip(zipBuffer)
  const entradas = zip.getEntries()
  if (!entradas.some((entrada) => entrada.entryName === 'index.html') ||
      !entradas.some((entrada) => entrada.entryName === 'game.json')) {
    throw new Error(`Pacote de ${jogo.id} sem index.html ou game.json na raiz`)
  }

  let totalExtraido = 0
  await mkdir(temporario, { recursive: true })
  try {
    for (const entrada of entradas) {
      const nome = entrada.entryName
      // Nunca deixe um zip escrever fora da pasta temporária, inclusive no Windows.
      if (nome.includes('\\') || nome.includes('\0') || nome.startsWith('/') ||
          nome.split('/').some((parte) => parte === '..' || parte === '.') ||
          /^[A-Za-z]:/.test(nome) ||
          ((entrada.header.attr >>> 16) & 0o170000) === 0o120000) {
        throw new Error(`Caminho inválido no pacote de ${jogo.id}`)
      }
      const arquivo = path.join(temporario, nome)
      if (entrada.isDirectory) {
        await mkdir(arquivo, { recursive: true })
        continue
      }
      totalExtraido += entrada.header.size
      if (totalExtraido > LIMITE_EXTRAIDO) throw new Error(`Pacote de ${jogo.id} muito grande`)
      await mkdir(path.dirname(arquivo), { recursive: true })
      const conteudo = entrada.getData()
      if (conteudo.length > LIMITE_EXTRAIDO) throw new Error(`Arquivo de ${jogo.id} muito grande`)
      await writeFile(arquivo, conteudo)
    }
    await mkdir(path.dirname(destino), { recursive: true })
    await rename(temporario, destino)
  } catch (erro) {
    await rm(temporario, { recursive: true, force: true })
    throw erro
  }
}

async function executarSincronizacao(): Promise<JogoCatalogo[]> {
  const resposta = await fetch(`${baseApiG1()}/jogos`, { signal: AbortSignal.timeout(30_000) })
  if (!resposta.ok) throw new Error(`Catálogo do G1: HTTP ${resposta.status}`)
  const itens: unknown = await resposta.json()
  if (!Array.isArray(itens)) throw new Error('Catálogo do G1 não é uma lista')
  const jogos = itens.map(validarJogo)
  await mkdir(PASTA_JOGOS, { recursive: true })

  const catalogo: JogoCatalogo[] = []
  for (const jogo of jogos) {
    const destino = path.join(PASTA_JOGOS, jogo.id, jogo.sha256)
    try {
      await access(path.join(destino, 'index.html'))
      await access(path.join(destino, 'game.json'))
    } catch {
      const zip = await baixarPacote(jogo)
      await instalarPacote(jogo, zip)
    }
    catalogo.push({
      id: jogo.id,
      nome: jogo.nome,
      autores: jogo.autores.join(', '),
      versao: jogo.versao,
      sha256: jogo.sha256,
      caminho: `http://localhost:3000/arquivos-jogos/${jogo.id}/${jogo.sha256}/index.html`,
    })
  }

  // O catálogo só muda depois que todos os jogos novos estiverem íntegros no disco.
  await salvarCatalogo(catalogo)
  return catalogo
}

let sincronizacao: Promise<JogoCatalogo[]> | undefined
export function sincronizarJogos() {
  if (!sincronizacao) {
    sincronizacao = executarSincronizacao().finally(() => { sincronizacao = undefined })
  }
  return sincronizacao
}
