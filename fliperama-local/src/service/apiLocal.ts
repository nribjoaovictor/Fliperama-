import type { Jogo } from '../types/Jogo'

export type ResultadoPartida = {
  matricula: string
  apelido: string
  jogoId: string
  pontuacao: number
  avaliacao: number
}

export async function verificarServidorLocal() {
  const resposta = await fetch('http://localhost:3000/health') // fetch, por default, é Get. Faz uma requisição para o servidor.

  if (!resposta.ok) {
    throw new Error('Servidor local indisponível')
  }

  return resposta.json()
}


export async function buscarJogos(): Promise<Jogo[]> {
  const resposta = await fetch('http://localhost:3000/jogos')

  if (!resposta.ok) {
    throw new Error('Não foi possível buscar os jogos')
  }

  return resposta.json()
}


export async function enviarResultado(
  resultado: ResultadoPartida
) {
  const resposta = await fetch(
    'http://localhost:3000/resultados',
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
