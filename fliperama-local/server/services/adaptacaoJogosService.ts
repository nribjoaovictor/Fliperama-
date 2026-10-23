import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Compatibilidade das cópias locais: os repositórios dos jogos não são alterados.
const ADAPTACOES: Record<string, { funcao: RegExp; codigo: string }> = {
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
const MARCADOR_QUESTOES = '/* fliperama: questoes embutidas */'

// O iframe roda com sandbox="allow-scripts" (origem opaca), então fetch('questoes.json')
// é bloqueado por CORS. A cópia local embute o JSON e responde ao fetch localmente.
function embutirQuestoes(html: string, questoesJson: string): string {
  if (html.includes(MARCADOR_QUESTOES)) return html

  const dados = JSON.stringify(JSON.parse(questoesJson)).replace(/</g, '\\u003c')
  const script = `<script>${MARCADOR_QUESTOES}
(function(){var Q=${dados};var f=window.fetch;
window.fetch=function(u){if(/(^|\\/)questoes\\.json(\\?|$)/.test(String(u&&u.url||u)))
return Promise.resolve(new Response(JSON.stringify(Q),{status:200,headers:{"Content-Type":"application/json"}}));
return f.apply(this,arguments)}})();</script>`

  const tagHead = /<head(\s[^>]*)?>/i
  return tagHead.test(html)
    ? html.replace(tagHead, (tag) => `${tag}\n${script}`)
    : `${script}\n${html}`
}

export function adaptarHtmlDoJogo(html: string, jogoId: string, questoesJson?: string): string {
  let resultado = html
  const adaptacao = ADAPTACOES[jogoId]

  if (adaptacao && !resultado.includes(MARCADOR)) {
    const funcoes = [...resultado.matchAll(adaptacao.funcao)]
    if (funcoes.length !== 1) {
      throw new Error(`Não foi possível integrar o placar de ${jogoId}: função de fim alterada.`)
    }

    resultado = resultado.replace(adaptacao.funcao, (funcao) => `${funcao}\n${MARCADOR}${adaptacao.codigo}`)
  }

  if (questoesJson !== undefined && /fetch\(\s*['"]questoes\.json/.test(resultado)) {
    resultado = embutirQuestoes(resultado, questoesJson)
  }

  return resultado
}

export async function adaptarArquivoDoJogo(caminho: string, jogoId: string) {
  const html = await readFile(caminho, 'utf-8')
  let questoes: string | undefined
  try {
    questoes = await readFile(path.join(path.dirname(caminho), 'questoes.json'), 'utf-8')
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro
  }
  const adaptado = adaptarHtmlDoJogo(html, jogoId, questoes)
  if (adaptado !== html) await writeFile(caminho, adaptado, 'utf-8')
}
