import AdmZip from 'adm-zip'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { buscarCatalogo, salvarCatalogo, type ItemCatalogo } from './catalogoService'
import { adaptarArquivoDoJogo } from './adaptacaoJogosService'
import { obterConfiguracaoG1 } from './configService'

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
  {
    id: 'encaixe-cientifico',
    nome: 'Encaixe Científico',
    autores: 'Eliabe Loureiro, Isac Victor, Pedro Paglioni',
    repositorio: 'https://github.com/Arcade-IFES/Encaixe_cientifico',
    arquivoInicial: 'index.html',
  },
]

const PASTA_JOGOS = './data/jogos'

type JogoRemotoG1 = {
  id: string
  nome: string
  autores?: string[] | string
  versao?: string
  sha256?: string
  pacote_url?: string
}

function calcularSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

async function sincronizarJogosDaApiG1(
  catalogoAnterior: ItemCatalogo[]
): Promise<{ jogosApi: ItemCatalogo[]; apiAcessivel: boolean }> {
  const { apiUrl } = obterConfiguracaoG1()
  let listaRemota: JogoRemotoG1[]

  try {
    const resposta = await fetch(`${apiUrl}/api/jogos`)
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`)
    }
    const json = await resposta.json()
    if (!Array.isArray(json)) {
      throw new Error('Formato de catálogo inválido na API G1')
    }
    listaRemota = json as JogoRemotoG1[]
  } catch {
    const preservados = catalogoAnterior.filter(
      (item) =>
        item.sha256 &&
        existsSync(path.join(PASTA_JOGOS, item.id, 'index.html'))
    )
    return { jogosApi: preservados, apiAcessivel: false }
  }

  const porIdAnterior = new Map(catalogoAnterior.map((item) => [item.id, item]))
  const jogosApi: ItemCatalogo[] = []

  for (const remoto of listaRemota) {
    if (!remoto || typeof remoto.id !== 'string' || !remoto.id.trim()) {
      continue
    }

    const pastaJogo = path.join(PASTA_JOGOS, remoto.id)
    const caminhoHtml = path.join(pastaJogo, 'index.html')
    const anterior = porIdAnterior.get(remoto.id)
    const autores = Array.isArray(remoto.autores)
      ? remoto.autores.join(', ')
      : String(remoto.autores ?? '')

    const cacheValido =
      Boolean(remoto.sha256) &&
      anterior?.sha256 === remoto.sha256 &&
      existsSync(caminhoHtml)

    if (cacheValido) {
      await adaptarArquivoDoJogo(caminhoHtml, remoto.id).catch((erro) => {
        if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro
      })
    } else {
      const urlPacote =
        remoto.pacote_url ||
        `${apiUrl}/api/jogos/${encodeURIComponent(remoto.id)}/pacote`

      const respostaPacote = await fetch(urlPacote)
      if (!respostaPacote.ok) {
        throw new Error(
          `Erro ao baixar pacote de ${remoto.id} na API G1: ${respostaPacote.status}`
        )
      }

      const buffer = Buffer.from(await respostaPacote.arrayBuffer())
      const hashCalculado = calcularSha256(buffer)
      const hashEsperado = (
        remoto.sha256 ||
        respostaPacote.headers.get('x-sha256') ||
        ''
      )
        .trim()
        .toLowerCase()

      if (hashEsperado && hashCalculado !== hashEsperado) {
        throw new Error(
          `Hash SHA-256 divergente para ${remoto.id}: esperado ${hashEsperado}, calculado ${hashCalculado}`
        )
      }

      await mkdir(pastaJogo, { recursive: true })
      const zip = new AdmZip(buffer)
      zip.extractAllTo(pastaJogo, true)

      await adaptarArquivoDoJogo(caminhoHtml, remoto.id).catch((erro) => {
        if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro
      })
    }

    jogosApi.push({
      id: remoto.id,
      nome: remoto.nome,
      autores,
      caminho: `http://localhost:3000/arquivos-jogos/${remoto.id}/index.html`,
      ...(remoto.versao ? { versao: remoto.versao } : {}),
      ...(remoto.sha256 ? { sha256: remoto.sha256 } : {}),
    })
  }

  return { jogosApi, apiAcessivel: true }
}

export async function sincronizarJogos(opcoes?: { incluirFallbackGithub?: boolean }) {
  const incluirFallback = opcoes?.incluirFallbackGithub ?? true

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

  const catalogoAnterior = await buscarCatalogo()
  const { jogosApi, apiAcessivel } = await sincronizarJogosDaApiG1(catalogoAnterior)
  const idsSincronizados = new Set(jogosApi.map((item) => item.id))
  const catalogo: ItemCatalogo[] = [...jogosApi]

  if (incluirFallback) {
    for (const jogo of JOGOS) {
      if (idsSincronizados.has(jogo.id)) {
        continue
      }

      console.log(`Baixando ${jogo.nome}...`)
      const nomeRepositorio = jogo.repositorio.split('/').pop()
      const caminhoHtmlLocal = path.join(
        PASTA_JOGOS,
        `${nomeRepositorio}-main`,
        jogo.arquivoInicial
      )

      const urlZip =
        `${jogo.repositorio}/archive/refs/heads/main.zip`

      try {
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

        await adaptarArquivoDoJogo(caminhoHtmlLocal, jogo.id)
        console.log(`${jogo.nome} baixado com sucesso.`)
      } catch (erro) {
        if (!existsSync(caminhoHtmlLocal) && !apiAcessivel) {
          throw erro
        }
        if (!existsSync(caminhoHtmlLocal)) {
          console.warn(
            `Não foi possível baixar fallback ${jogo.nome} do GitHub; mantendo apenas jogos disponíveis.`
          )
          continue
        }
      }

      catalogo.push({
        id: jogo.id,
        nome: jogo.nome,
        autores: jogo.autores,
        caminho:
          `http://localhost:3000/arquivos-jogos/${nomeRepositorio}-main/${jogo.arquivoInicial}`,
      })
    }
  }

  await salvarCatalogo(catalogo)

  return catalogo
}
