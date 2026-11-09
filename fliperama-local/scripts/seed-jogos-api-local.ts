import { execFileSync } from 'node:child_process'
import { JOGOS } from '../server/services/sincronizacaoService'

function escaparSql(valor: string): string {
  return valor.replace(/'/g, "''")
}

export function gerarSqlSeedJogos(): string {
  const valores = JOGOS.map((jogo) => {
    const autores = jogo.autores
      .split(',')
      .map((a) => `'${escaparSql(a.trim())}'`)
      .join(', ')

    return `(
      '${escaparSql(jogo.id)}',
      '${escaparSql(jogo.nome)}',
      'Jogo educacional do Recreio Arcade (${escaparSql(jogo.nome)}).',
      ARRAY[${autores}]::text[],
      'Setas direcionais e Enter.',
      'Arcade Clássico',
      'arcade',
      'Ciências e Lógica',
      'ensino médio',
      'capa.png',
      '${escaparSql(jogo.repositorio)}'
    )`
  }).join(',\n')

  return `
INSERT INTO jogos (
  id, nome, descricao, autores, controles,
  classico_referencia, mecanica, tema, nivel, capa, repositorio_url
)
VALUES
${valores}
ON CONFLICT (id) DO NOTHING;
`.trim()
}

function descobrirContainerPostgres(): string {
  const saida = execFileSync(
    'docker',
    ['ps', '--filter', 'ancestor=postgres:17-alpine', '--format', '{{.Names}}'],
    { encoding: 'utf-8' }
  ).trim()

  const nome = saida.split('\n').map((s) => s.trim()).find(Boolean)
  if (!nome) {
    throw new Error(
      'Nenhum container postgres:17-alpine em execução. Rode "npm run db:up" e "npm run db:migrate" em Portal-Web primeiro.'
    )
  }
  return nome
}

function executarSeed() {
  const container = process.env.POSTGRES_CONTAINER || descobrirContainerPostgres()
  const sql = gerarSqlSeedJogos()

  execFileSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'gestao', '-d', 'gestao', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, stdio: ['pipe', 'inherit', 'inherit'] }
  )

  console.log(`[seed:api-local] ${JOGOS.length} jogos do fliperama garantidos no banco da API (${container}).`)
}

import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    executarSeed()
  } catch (erro) {
    console.error('[seed:api-local] Erro ao registrar jogos no banco local:', (erro as Error).message)
    process.exit(1)
  }
}

