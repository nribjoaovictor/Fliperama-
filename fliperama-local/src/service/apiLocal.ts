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

function normalizarCaminho(caminho: string): string {
  if (caminho.startsWith('http://localhost:3000/arquivos-jogos/')) {
    return caminho.replace('http://localhost:3000/arquivos-jogos/', '/jogos/')
  }
  return caminho
}

export async function verificarServidorLocal() {
  const resposta = await fetch(`${obterUrlApi()}/health`)

  if (!resposta.ok) {
    throw new Error('Servidor local indisponível')
  }

  return resposta.json()
}

export async function buscarJogos(): Promise<Jogo[]> {
  try {
    const resposta = await fetch(`${obterUrlApi()}/jogos`)
    if (resposta.ok) {
      const jogos: Jogo[] = await resposta.json()
      return jogos.map((j) => ({ ...j, caminho: normalizarCaminho(j.caminho) }))
    }
  } catch {
    // API dormindo ou offline: busca catálogo estático na CDN
  }

  try {
    const respostaEstatica = await fetch('/jogos/catalogo.json')
    if (respostaEstatica.ok) {
      return await respostaEstatica.json()
    }
  } catch {
    // Catálogo estático indisponível
  }

  throw new Error('Não foi possível buscar os jogos')
}

export async function enviarResultado(
  resultado: ResultadoPartida
) {
  const resposta = await fetch(
    `${obterUrlApi()}/resultados`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resultado),
    }
  )

  if (!resposta.ok) {
    throw new Error('Não foi possível salvar o resultado')
  }

  return resposta.json()
}

