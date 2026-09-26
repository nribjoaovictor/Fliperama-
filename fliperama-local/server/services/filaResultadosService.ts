import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const ARQUIVO_FILA = './data/fila-resultados.json'

export type ResultadoPartida = {
  id: string
  matricula: string
  apelido: string
  jogoId: string
  pontuacao: number
  avaliacao: number
  jogadoEm?: string
}

export async function prepararFilaResultados() {
  await mkdir('./data', { recursive: true })
  try {
    await readFile(ARQUIVO_FILA, 'utf-8')
  } catch {
    await writeFile(
      ARQUIVO_FILA,
      JSON.stringify([], null, 2)
    )
  }
}

export async function buscarFilaResultados() {
  const conteudo = await readFile(
    ARQUIVO_FILA,
    'utf-8'
  )

  return JSON.parse(conteudo) as ResultadoPartida[]
}

export async function removerResultado(id: string) {
  const fila = await buscarFilaResultados()

  const novaFila = fila.filter(
    (resultado) => resultado.id !== id
  )

  await writeFile(
    ARQUIVO_FILA,
    JSON.stringify(novaFila, null, 2)
  )
}

export async function adicionarResultado(
  resultado: Omit<ResultadoPartida, 'id' | 'jogadoEm'>
) {
  const conteudo = await readFile(ARQUIVO_FILA, 'utf-8')

  const fila: ResultadoPartida[] = JSON.parse(conteudo)

  const novoResultado: ResultadoPartida = {
    id: randomUUID(),
    ...resultado,
    jogadoEm: new Date().toISOString(),
  }

  fila.push(novoResultado)

  await writeFile(
    ARQUIVO_FILA,
    JSON.stringify(fila, null, 2)
  )

  return novoResultado
}
