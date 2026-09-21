import { useEffect } from 'react'
import './Jogo.css'
import type { Jogo as TipoJogo } from '../../types/Jogo'


type JogoProps = {
  jogo: TipoJogo
  onFinalizar: (pontuacao: number)=> void
  onVoltarInicio: () => void
}

function Jogo({ jogo, onFinalizar, onVoltarInicio }: JogoProps) {

  useEffect(() => {
    function receberMensagem(event: MessageEvent) {
      const mensagem = event.data

      if (
        mensagem?.type === 'GAME_OVER' &&
        typeof mensagem.payload?.score === 'number'
      ) {
        onFinalizar(mensagem.payload.score)
      }
    }

    window.addEventListener('message', receberMensagem)

    return () => {
      window.removeEventListener('message', receberMensagem)
    }
  }, [onFinalizar])

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
            src={jogo.caminho}
            title={jogo.nome}
            className="game-frame"
        />
        </section>
    </main>
    )
}

export default Jogo