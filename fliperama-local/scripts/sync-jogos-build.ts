import AdmZip from 'adm-zip'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JOGOS } from '../server/services/sincronizacaoService'
import { adaptarArquivoDoJogo } from '../server/services/adaptacaoJogosService'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PASTA_ROOT = path.resolve(__dirname, '..')
const PASTA_DESTINO = path.join(PASTA_ROOT, 'public', 'jogos')

async function baixarComRetry(url: string, maxTentativas = 3, timeoutMs = 15000): Promise<Buffer> {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const resposta = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`)
      }

      return Buffer.from(await resposta.arrayBuffer())
    } catch (erro) {
      console.warn(`[sync:jogos] Tentativa ${tentativa}/${maxTentativas} falhou para ${url}: ${(erro as Error).message}`)
      if (tentativa === maxTentativas) throw erro
      await new Promise((resolve) => setTimeout(resolve, 2000 * tentativa))
    }
  }
  throw new Error(`Falha ao baixar ${url}`)
}

async function sincronizar() {
  console.log('[sync:jogos] Sincronizando catálogo estático para public/jogos/...')
  await mkdir(PASTA_DESTINO, { recursive: true })

  const catalogo = []

  for (const jogo of JOGOS) {
    const nomeRepositorio = jogo.repositorio.split('/').pop()!
    const pastaJogo = path.join(PASTA_DESTINO, `${nomeRepositorio}-main`)
    const arquivoEntrada = path.join(pastaJogo, jogo.arquivoInicial)

    if (existsSync(arquivoEntrada)) {
      console.log(`[sync:jogos] ${jogo.nome} já presente em public/jogos/.`)
    } else {
      console.log(`[sync:jogos] Baixando ${jogo.nome}...`)
      const urlZip = `${jogo.repositorio}/archive/refs/heads/main.zip`
      const bufferZip = await baixarComRetry(urlZip)

      const zip = new AdmZip(bufferZip)
      zip.extractAllTo(PASTA_DESTINO, true)

      if (existsSync(arquivoEntrada)) {
        await adaptarArquivoDoJogo(arquivoEntrada, jogo.id)
        console.log(`[sync:jogos] ${jogo.nome} adaptado com sucesso.`)
      }
    }

    catalogo.push({
      id: jogo.id,
      nome: jogo.nome,
      autores: jogo.autores,
      caminho: `/jogos/${nomeRepositorio}-main/${jogo.arquivoInicial}`,
    })
  }

  const arquivoCatalogo = path.join(PASTA_DESTINO, 'catalogo.json')
  await writeFile(arquivoCatalogo, JSON.stringify(catalogo, null, 2), 'utf-8')
  console.log(`[sync:jogos] Catálogo estático gerado em ${arquivoCatalogo} (${catalogo.length} jogos).`)
}

sincronizar().catch((erro) => {
  console.error('[sync:jogos] Erro fatal no download dos jogos:', erro)
  process.exit(1)
})
