import { mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import path from 'node:path'

const PASTA_DATA = './data'
const PASTA_JOGOS = './data/jogos'
const ARQUIVO_CATALOGO = './data/catalogo.json'

export type ItemCatalogo = {
  id: string
  nome: string
  autores: string
  caminho: string
  versao?: string
  sha256?: string
}

async function gravarCatalogoAtomico(
  caminhoDestino: string,
  conteudo: string
): Promise<void> {
  await mkdir(path.dirname(caminhoDestino), { recursive: true })
  const caminhoTmp = `${caminhoDestino}.tmp`
  let handle
  try {
    handle = await open(caminhoTmp, 'w')
    await handle.writeFile(conteudo, 'utf-8')
    await handle.sync()
  } catch (erro) {
    if (handle) {
      await handle.close().catch(() => {})
    }
    await rm(caminhoTmp, { force: true }).catch(() => {})
    throw erro
  }
  await handle.close()

  try {
    await rename(caminhoTmp, caminhoDestino)
  } catch (erro) {
    await rm(caminhoTmp, { force: true }).catch(() => {})
    throw erro
  }
}

export async function prepararCatalogo() {
  await mkdir(PASTA_DATA, { recursive: true })
  await mkdir(PASTA_JOGOS, { recursive: true })

  try {
    await readFile(ARQUIVO_CATALOGO, 'utf-8')
  } catch {
    await gravarCatalogoAtomico(
      ARQUIVO_CATALOGO,
      JSON.stringify([], null, 2)
    )
  }
}

export async function buscarCatalogo(): Promise<ItemCatalogo[]> {
  try {
    const conteudo = await readFile(
      ARQUIVO_CATALOGO,
      'utf-8'
    )

    const parsed = JSON.parse(conteudo)
    return Array.isArray(parsed) ? (parsed as ItemCatalogo[]) : []
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw erro
  }
}

export async function salvarCatalogo(jogos: unknown[]) {
  await gravarCatalogoAtomico(
    ARQUIVO_CATALOGO,
    JSON.stringify(jogos, null, 2)
  )
}
