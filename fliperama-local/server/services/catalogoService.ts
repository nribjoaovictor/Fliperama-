import { mkdir, readFile, writeFile } from 'node:fs/promises'

const PASTA_DATA = './data'
const PASTA_JOGOS = './data/jogos'
const ARQUIVO_CATALOGO = './data/catalogo.json'

export async function prepararCatalogo() {
  await mkdir(PASTA_DATA, { recursive: true })
  await mkdir(PASTA_JOGOS, { recursive: true })

  try {
    await readFile(ARQUIVO_CATALOGO, 'utf-8')
  } catch {
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

export async function salvarCatalogo(jogos: unknown[]) {
  await writeFile(
    ARQUIVO_CATALOGO,
    JSON.stringify(jogos, null, 2)
  )
}