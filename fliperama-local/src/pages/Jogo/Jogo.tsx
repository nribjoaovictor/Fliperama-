import { useEffect, useRef } from 'react'
import './Jogo.css'
import type { Jogo as TipoJogo } from '../../types/Jogo'
import { extrairPlacar } from './extrairPontuacao'
import type { PlacarRecebido } from './extrairPontuacao'


type JogoProps = {
  jogo: TipoJogo
  onFinalizar: (placar: PlacarRecebido) => void
  onVoltarInicio: () => void
}

function Jogo({ jogo, onFinalizar, onVoltarInicio }: JogoProps) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const finalizado = useRef(false)

  useEffect(() => {
    finalizado.current = false
    const origemJogo = new URL(jogo.caminho, window.location.href).origin

    function receberMensagem(event: MessageEvent) {
      if (
        event.source !== iframe.current?.contentWindow ||
        event.origin !== (jogo.versao ? 'null' : origemJogo) ||
        finalizado.current
      ) return

      const placar = extrairPlacar(event.data, jogo.id, jogo.versao)
      if (placar === null) return

      finalizado.current = true
      onFinalizar(placar)
    }

    window.addEventListener('message', receberMensagem)

    return () => {
      window.removeEventListener('message', receberMensagem)
    }
  }, [jogo.caminho, jogo.id, jogo.versao, onFinalizar])

  function iniciarJogo() {
    iframe.current?.contentWindow?.postMessage({
      tipo: 'ARCADE_INIT', jogo: jogo.id, versao: jogo.versao,
      mudo: false, melhores: [],
    }, jogo.versao ? '*' : new URL(jogo.caminho, window.location.href).origin)
    iframe.current?.focus()
  }

  return (
    <main className="jogo-screen">
        <header className="jogo-header">
          <h1>JOGO EM EXECUÇÃO</h1>

          <p>Jogo selecionado: {jogo.nome}</p>

          <button
            className="botao-inicio"
            onClick={onVoltarInicio}
          >
            VOLTAR AO INÍCIO
          </button>
        </header>

        <section className="game-container">
        <iframe
            ref={iframe}
            src={jogo.caminho}
            title={jogo.nome}
            className="game-frame"
            sandbox={jogo.versao ? 'allow-scripts' : undefined}
            onLoad={iniciarJogo}
        />
        </section>
    </main>
    )
}

export default Jogo
