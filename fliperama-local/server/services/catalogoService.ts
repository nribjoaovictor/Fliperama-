import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const PASTA_DATA = './data'
const PASTA_JOGOS = './data/jogos'
const ARQUIVO_CATALOGO = './data/catalogo.json'

export type JogoCatalogo = {
  id: string
  nome: string
  autores: string
  caminho: string
  versao: string
  sha256: string
}

export async function prepararCatalogo() {
  await mkdir(PASTA_DATA, { recursive: true })
  await mkdir(PASTA_JOGOS, { recursive: true })

  try {
    await readFile(ARQUIVO_CATALOGO, 'utf-8')
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro
    await writeFile(
      ARQUIVO_CATALOGO,
      JSON.stringify([], null, 2)
    )
  }
}

export async function buscarCatalogo() {
  const conteudo = await readFile(
    ARQUIVO_CATALOGO,
    'utf-8'
  )

  return JSON.parse(conteudo)
}

export async function salvarCatalogo(jogos: JogoCatalogo[]) {
  const temporario = `${ARQUIVO_CATALOGO}.${randomUUID()}.tmp`
  await writeFile(temporario, JSON.stringify(jogos, null, 2))
  try {
    await rename(temporario, ARQUIVO_CATALOGO)
  } catch (erro) {
    await rm(temporario, { force: true })
    throw erro
  }
}
