import { salvarCatalogo } from './catalogoService'

// mock é uma versão falsa/simulada de alguma parte do sistema que ainda não está pronta.
// futuramente API real do G1

const jogosAprovadosMock = [
  {
    id: 1,
    nome: 'Quiz de Biologia',
    autores: 'João e Maria',
    caminho: '/jogos/jogo_teste/index.html',
  },
  {
    id: 2,
    nome: 'Desafio Matemático',
    autores: 'Pedro e Ana',
    caminho: '/jogos/jogo_teste/index.html',
  },
  {
    id: 3,
    nome: 'História Arcade',
    autores: 'Carlos e Julia',
    caminho: '/jogos/jogo_teste/index.html',
  },
]

export async function sincronizarJogos() {
  console.log('Iniciando sincronização...')

  // Temporariamente representa a resposta da API do G1.
  const jogosAprovados = jogosAprovadosMock

  await salvarCatalogo(jogosAprovados)

  console.log(
    `${jogosAprovados.length} jogos sincronizados.`
  )

  return jogosAprovados
}