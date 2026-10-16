import type { Jogo } from '../types/Jogo'

export type ResultadoPartida = {
  matricula: string
  apelido: string
  jogoId: string
  pontuacao: number
  avaliacao: number
}

export function obterUrlApi(): string {
  const url = import.meta.env.VITE_API_URL
  return url ? url.replace(/\/$/, '') : 'http://localhost:3000'
}

export function normalizarCaminhoJogo(caminho: string): string {
  if (caminho.startsWith('http://localhost:3000/arquivos-jogos/')) {
    return caminho.replace('http://localhost:3000/arquivos-jogos/', '/jogos/')
  }
  return caminho
}

export async function verificarServidorLocal() {
  const urlApi = obterUrlApi()
  const resposta = await fetch(`${urlApi}/health`)

  if (!resposta.ok) {
    throw new Error('Servidor local indisponível')
  }

  return resposta.json()
}

export async function buscarJogos(): Promise<Jogo[]> {
  const urlApi = obterUrlApi()

  try {
    const resposta = await fetch(`${urlApi}/jogos`)
    if (resposta.ok) {
      const jogos: Jogo[] = await resposta.json()
      return jogos.map((j) => ({
        ...j,
        caminho: normalizarCaminhoJogo(j.caminho),
      }))
    }
  } catch (erro) {
    console.warn('API indisponível, buscando catálogo estático...', erro)
  }

  try {
    const respostaEstatica = await fetch('/jogos/catalogo.json')
    if (respostaEstatica.ok) {
      return await respostaEstatica.json()
    }
  } catch (erro) {
    console.warn('Catálogo estático não encontrado:', erro)
  }

  throw new Error('Não foi possível buscar os jogos')
}

export async function enviarResultado(resultado: ResultadoPartida) {
  const urlApi = obterUrlApi()
  let tentativa = 0
  const maxTentativas = 3

  while (tentativa < maxTentativas) {
    tentativa++
    try {
      const resposta = await fetch(`${urlApi}/resultados`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resultado),
      })

      if (resposta.ok) {
        return await resposta.json()
      }
    } catch (erro) {
      console.warn(
        `Tentativa ${tentativa}/${maxTentativas} de envio do placar falhou:`,
        erro
      )
      if (tentativa >= maxTentativas) {
        throw erro
      }
      await new Promise((resolve) => setTimeout(resolve, 1500 * tentativa))
    }
  }

  throw new Error('Não foi possível salvar o resultado')
}
