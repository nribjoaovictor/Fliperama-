import AdmZip from 'adm-zip'
import { mkdir } from 'node:fs/promises'
import { salvarCatalogo } from './catalogoService'

const JOGOS = [
  {
    id: 1,
    nome: 'Órbita do Saber',
    autores: 'Grupo do Órbita do Saber',
    repositorio: 'https://github.com/Arcade-IFES/Orbita-do-Saber',
    arquivoInicial: 'orbita-do-saber.html',
  },
  {
    id: 2,
    nome: 'Logic Dungeon',
    autores: 'Grupo Logic Dungeon',
    repositorio: 'https://github.com/Arcade-IFES/-Logic-Dungeon-',
    arquivoInicial: 'logic_dungeon.html',
  },
  {
    id: 3,
    nome: 'Corrida Contra o Sino',
    autores: 'Grupo Corrida Contra o Sino',
    repositorio: 'https://github.com/Arcade-IFES/Corrida-Contra-o-Sino',
    arquivoInicial: 'corrida-contra-o-sino.html',
  },
]

const PASTA_JOGOS = './data/jogos'

export async function sincronizarJogos() {
  await mkdir(PASTA_JOGOS, {
    recursive: true,
  })

  const catalogo = []

  for (const jogo of JOGOS) {
    console.log(`Baixando ${jogo.nome}...`)

    const urlZip =
      `${jogo.repositorio}/archive/refs/heads/main.zip`

    const resposta = await fetch(urlZip)

    if (!resposta.ok) {
      throw new Error(
        `Erro ao baixar ${jogo.nome}: ${resposta.status}`
      )
    }

    const arrayBuffer = await resposta.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const zip = new AdmZip(buffer)

    zip.extractAllTo(PASTA_JOGOS, true)

    const nomeRepositorio = jogo.repositorio.split('/').pop()

    catalogo.push({
      id: jogo.id,
      nome: jogo.nome,
      autores: jogo.autores,
      caminho:
        `http://localhost:3000/arquivos-jogos/${nomeRepositorio}-main/${jogo.arquivoInicial}`,
    })

    console.log(`${jogo.nome} baixado com sucesso.`)
  }
  await salvarCatalogo(catalogo)

  return catalogo
}