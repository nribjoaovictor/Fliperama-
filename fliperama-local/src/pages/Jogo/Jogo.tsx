import { useEffect, useRef } from 'react'
import './Jogo.css'
import type { Jogo as TipoJogo } from '../../types/Jogo'
import { extrairPontuacao } from './extrairPontuacao'


type JogoProps = {
  jogo: TipoJogo
  onFinalizar: (pontuacao: number)=> void
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
        event.origin !== origemJogo ||
        finalizado.current
      ) return

      const pontuacao = extrairPontuacao(event.data)
      if (pontuacao === null) return

      finalizado.current = true
      onFinalizar(pontuacao)
    }

    window.addEventListener('message', receberMensagem)

    return () => {
      window.removeEventListener('message', receberMensagem)
    }
  }, [jogo.caminho, onFinalizar])

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
        />
        </section>
    </main>
    )
}

export default Jogo
