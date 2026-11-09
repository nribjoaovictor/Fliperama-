import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { executarSeed } from './seed-jogos-api-local'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PASTA_FLIPERAMA = path.resolve(__dirname, '..')
const PASTA_PORTAL_WEB = process.env.PORTAL_WEB_DIR
  ? path.resolve(process.env.PORTAL_WEB_DIR)
  : path.resolve(PASTA_FLIPERAMA, '..', '..', 'Portal-Web')

const modoIntegrado = process.argv.includes('--integrado')
const filhos: ChildProcess[] = []

function prefixarSaida(nome: string, stream: NodeJS.ReadableStream | null, destino: NodeJS.WriteStream) {
  if (!stream) return
  let buffer = ''
  stream.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf-8')
    const linhas = buffer.split('\n')
    buffer = linhas.pop() ?? ''
    for (const linha of linhas) {
      destino.write(`[${nome}] ${linha}\n`)
    }
  })
}

function iniciarProcesso(
  nome: string,
  comando: string,
  args: string[],
  cwd: string,
  envExtra: Record<string, string> = {}
): ChildProcess {
  const proc = spawn(comando, args, {
    cwd,
    env: { ...process.env, ...envExtra },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  prefixarSaida(nome, proc.stdout, process.stdout)
  prefixarSaida(nome, proc.stderr, process.stderr)
  filhos.push(proc)
  return proc
}

async function aguardarHealth(url: string, tentativas = 30, intervaloMs = 500): Promise<void> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Ainda subindo
    }
    await new Promise((r) => setTimeout(r, intervaloMs))
  }
  console.warn(`[ambiente] Aviso: ${url} não respondeu dentro do tempo esperado.`)
}

function prepararBancoApiLocal() {
  const pastaApi = path.join(PASTA_PORTAL_WEB, 'api')
  if (!existsSync(pastaApi)) {
    throw new Error(`Diretório da API não encontrado em ${pastaApi}`)
  }

  const envApi = path.join(pastaApi, '.env')
  const envExampleApi = path.join(pastaApi, '.env.example')
  if (!existsSync(envApi) && existsSync(envExampleApi)) {
    copyFileSync(envExampleApi, envApi)
  }

  if (!existsSync(path.join(pastaApi, 'node_modules'))) {
    console.log('[ambiente] Instalando dependências de Portal-Web/api...')
    execFileSync('npm', ['install'], { cwd: pastaApi, stdio: 'inherit' })
  }

  console.log('[ambiente] Subindo PostgreSQL (Docker), rodando migrations e seed da API G1...')
  execFileSync('npm', ['run', 'db:up'], { cwd: pastaApi, stdio: 'inherit' })
  execFileSync('npm', ['run', 'db:migrate'], { cwd: pastaApi, stdio: 'inherit' })
  execFileSync('npm', ['run', 'db:seed'], { cwd: pastaApi, stdio: 'inherit' })

  executarSeed()
}

function encerrarTodos() {
  for (const proc of filhos) {
    if (!proc.killed) {
      proc.kill('SIGTERM')
    }
  }
}

process.on('SIGINT', () => {
  encerrarTodos()
  process.exit(0)
})

process.on('SIGTERM', () => {
  encerrarTodos()
  process.exit(0)
})

async function main() {
  const envFliperama = path.join(PASTA_FLIPERAMA, '.env')
  const envExampleFliperama = path.join(PASTA_FLIPERAMA, '.env.example')
  if (!existsSync(envFliperama) && existsSync(envExampleFliperama)) {
    copyFileSync(envExampleFliperama, envFliperama)
  }

  if (modoIntegrado) {
    prepararBancoApiLocal()
    console.log('[ambiente] Iniciando API G1 (Portal-Web/api) em http://localhost:4000 ...')
    iniciarProcesso(
      'api-g1',
      'npm',
      ['run', 'dev'],
      path.join(PASTA_PORTAL_WEB, 'api'),
      { PORT: '4000' }
    )
    await aguardarHealth('http://localhost:4000/health')
  }

  console.log('[ambiente] Iniciando servidor Fastify do Fliperama (porta 3000) e Vite (porta 5173)...')
  iniciarProcesso('server', 'npm', ['run', 'server'], PASTA_FLIPERAMA)
  iniciarProcesso('web', 'npm', ['run', 'dev'], PASTA_FLIPERAMA)
}

main().catch((erro) => {
  console.error('[ambiente] Erro ao iniciar ambiente:', (erro as Error).message)
  encerrarTodos()
  process.exit(1)
})

