import AdmZip from 'adm-zip'
import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PASTA_ROOT = path.resolve(__dirname, '..')
const PASTA_DESTINO = path.join(PASTA_ROOT, 'public', 'jogos')

const JOGOS_FIXOS = [
  {
    id: 'orbita-do-saber',
    nome: 'Órbita do Saber',
    autores: 'Grupo do Órbita do Saber',
    repositorio: 'https://github.com/Arcade-IFES/Orbita-do-Saber',
    arquivoInicial: 'orbita-do-saber.html',
  },
  {
    id: 'logica-em-dungeon',
    nome: 'Logic Dungeon',
    autores: 'Grupo Logic Dungeon',
    repositorio: 'https://github.com/Arcade-IFES/-Logic-Dungeon-',
    arquivoInicial: 'logic_dungeon.html',
  },
  {
    id: 'corrida-contra-o-sino',
    nome: 'Corrida Contra o Sino',
    autores: 'Grupo Corrida Contra o Sino',
    repositorio: 'https://github.com/Arcade-IFES/Corrida-Contra-o-Sino',
    arquivoInicial: 'corrida-contra-o-sino.html',
  },
]

const ADAPTACOES = {
  'orbita-do-saber': {
    funcao: /async\s+function\s+fim\s*\(\s*\)\s*\{/g,
    codigo: `
  if (window.parent !== window.self) {
    if (estado === "fim") return;
    estado = "fim";
    musica.parar();
    window.parent.postMessage({
      type: "PLACAR", jogo: "orbita-do-saber", payload: { pontos: g.pontos }
    }, "*");
    return;
  }
`,
  },
  'logica-em-dungeon': {
    funcao: /function\s+gameOver\s*\(\s*\)\s*\{/g,
    codigo: `
  if (window.parent !== window.self) {
    if (state === "gameover") return;
    state = "gameover";
    window.parent.postMessage({
      type: "PLACAR", jogo: "logica-em-dungeon", payload: { pontos: game.score }
    }, "*");
    return;
  }
`,
  },
}

const MARCADOR = '/* fliperama: placar da copia local */'

function adaptarHtmlDoJogo(html, jogoId) {
  const adaptacao = ADAPTACOES[jogoId]
  if (!adaptacao || html.includes(MARCADOR)) return html

  const funcoes = [...html.matchAll(adaptacao.funcao)]
  if (funcoes.length !== 1) {
    throw new Error(`Não foi possível integrar o placar de ${jogoId}: função de fim alterada.`)
  }

  return html.replace(adaptacao.funcao, (funcao) => `${funcao}\n${MARCADOR}${adaptacao.codigo}`)
}

async function baixarComRetry(url, maxTentativas = 3, timeoutMs = 15000) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const resposta = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`)
      }

      const buffer = Buffer.from(await resposta.arrayBuffer())
      return buffer
    } catch (erro) {
      console.warn(`[sync:jogos] Tentativa ${tentativa}/${maxTentativas} falhou para ${url}: ${erro.message}`)
      if (tentativa === maxTentativas) throw erro
      await new Promise((resolve) => setTimeout(resolve, 2000 * tentativa))
    }
  }
}

async function sincronizar() {
  console.log('[sync:jogos] Iniciando sincronização para public/jogos/...')
  await mkdir(PASTA_DESTINO, { recursive: true })

  const catalogo = []

  for (const jogo of JOGOS_FIXOS) {
    const nomeRepositorio = jogo.repositorio.split('/').pop()
    const pastaJogo = path.join(PASTA_DESTINO, `${nomeRepositorio}-main`)
    const arquivoEntrada = path.join(pastaJogo, jogo.arquivoInicial)

    // Se já existe e é válido, usa o existente para evitar downloads redundantes em CI/build local
    if (existsSync(arquivoEntrada)) {
      console.log(`[sync:jogos] ${jogo.nome} já presente em cache local.`)
    } else {
      console.log(`[sync:jogos] Baixando ${jogo.nome} (${jogo.repositorio})...`)
      const urlZip = `${jogo.repositorio}/archive/refs/heads/main.zip`
      const bufferZip = await baixarComRetry(urlZip)

      const sha256Calculado = createHash('sha256').update(bufferZip).digest('hex')
      console.log(`[sync:jogos] ${jogo.nome} SHA-256 verificado: ${sha256Calculado.slice(0, 12)}...`)

      const zip = new AdmZip(bufferZip)
      zip.extractAllTo(PASTA_DESTINO, true)

      if (existsSync(arquivoEntrada)) {
        const conteudo = await readFile(arquivoEntrada, 'utf-8')
        const adaptado = adaptarHtmlDoJogo(conteudo, jogo.id)
        if (adaptado !== conteudo) {
          await writeFile(arquivoEntrada, adaptado, 'utf-8')
          console.log(`[sync:jogos] ${jogo.nome} adaptador injetado com sucesso.`)
        }
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
  console.error('[sync:jogos] ERRO FATAL no download/sincronização dos jogos:', erro)
  process.exit(1)
})
