import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const ARQUIVO_FILA = './data/fila-resultados.json'

export type ResultadoPartida = {
  id: string
  // Resultados antigos ainda podem trazer matrícula; ela nunca é enviada ao G1.
  matricula?: string
  apelido: string
  jogoId: string
  pontuacao: number
  avaliacao: number
  jogadoEm?: string
  versao?: string
  duracao_s?: number
  acertos?: number
  erros?: number
  tema?: string
}

let operacoes: Promise<unknown> = Promise.resolve()
function serializar<T>(operacao: () => Promise<T>): Promise<T> {
  const resultado = operacoes.then(operacao)
  operacoes = resultado.catch(() => {})
  return resultado
}

async function gravarFila(fila: ResultadoPartida[]) {
  const temporario = `${ARQUIVO_FILA}.${randomUUID()}.tmp`
  await writeFile(temporario, JSON.stringify(fila, null, 2))
  try {
    await rename(temporario, ARQUIVO_FILA)
  } catch (erro) {
    await rm(temporario, { force: true })
    throw erro
  }
}

async function lerFila(): Promise<ResultadoPartida[]> {
  return JSON.parse(await readFile(ARQUIVO_FILA, 'utf-8')) as ResultadoPartida[]
}

export async function prepararFilaResultados() {
  await mkdir('./data', { recursive: true })
  try {
    const fila = await lerFila()
    if (!Array.isArray(fila)) throw new Error('Fila de resultados inválida')
    // Remove matrículas deixadas pela versão anterior sem descartar partidas pendentes.
    if (fila.some((resultado) => 'matricula' in resultado)) {
      for (const resultado of fila) delete resultado.matricula
      await gravarFila(fila)
    }
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro
    await writeFile(
      ARQUIVO_FILA,
      JSON.stringify([], null, 2)
    )
  }
}

export async function buscarFilaResultados() {
  await operacoes
  return lerFila()
}

export async function removerResultado(id: string) {
  return serializar(async () => {
    const fila = await lerFila()
    await gravarFila(fila.filter((resultado) => resultado.id !== id))
  })
}

export async function adicionarResultado(
  resultado: Omit<ResultadoPartida, 'id' | 'jogadoEm' | 'matricula'>
) {
  return serializar(async () => {
    const fila = await lerFila()
    const novoResultado: ResultadoPartida = {
      id: randomUUID(),
      ...resultado,
      jogadoEm: new Date().toISOString(),
    }
    fila.push(novoResultado)
    await gravarFila(fila)
    return novoResultado
  })
}
