import AdmZip from 'adm-zip'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { salvarCatalogo } from './catalogoService'
import { adaptarArquivoDoJogo } from './adaptacaoJogosService'

export const JOGOS = [
  {
    id: 'orbita-do-saber',
    nome: 'Órbita do Saber',
    autores: 'Grupo do Órbita do Saber',
    repositorio: 'https://github.com/Arcade-IFES/Orbita-do-Saber',
    arquivoInicial: 'index.html',
  },
  {
    id: 'logica-em-dungeon',
    nome: 'Logic Dungeon',
    autores: 'Grupo Logic Dungeon',
    repositorio: 'https://github.com/Arcade-IFES/-Logic-Dungeon-',
    arquivoInicial: 'index.html',
  },
  {
    id: 'corrida-contra-o-sino',
    nome: 'Corrida Contra o Sino',
    autores: 'Grupo Corrida Contra o Sino',
    repositorio: 'https://github.com/Arcade-IFES/Corrida-Contra-o-Sino',
    arquivoInicial: 'corrida-contra-o-sino.html',
  },
  {
    id: 'estrelas-da-ciencia',
    nome: 'Estrelas da Ciência',
    autores: 'Pedro Paglioni, Isac Victor, Eliabe Loureiro',
    repositorio: 'https://github.com/Arcade-IFES/estrelas-da-ciencia',
    arquivoInicial: 'index.html',
  },
]

const PASTA_JOGOS = './data/jogos'

export async function sincronizarJogos() {
  await mkdir(PASTA_JOGOS, {
    recursive: true,
  })

  // Atualiza também o cache existente, mesmo se o download falhar sem internet.
  for (const jogo of JOGOS) {
    const nomeRepositorio = jogo.repositorio.split('/').pop()
    try {
      await adaptarArquivoDoJogo(
        path.join(PASTA_JOGOS, `${nomeRepositorio}-main`, jogo.arquivoInicial),
        jogo.id,
      )
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro
    }
  }

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

    await adaptarArquivoDoJogo(
      path.join(PASTA_JOGOS, `${nomeRepositorio}-main`, jogo.arquivoInicial),
      jogo.id,
    )

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
