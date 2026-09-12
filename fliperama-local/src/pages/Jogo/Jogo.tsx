import { useEffect } from 'react'
import './Jogo.css'
import type { Jogo as TipoJogo } from '../../types/Jogo'


type JogoProps = {
  jogo: TipoJogo
  onFinalizar: (pontuacao: number)=> void
}

function Jogo({ jogo, onFinalizar }: JogoProps) {

  useEffect(() => {
    function receberMensagem(event: MessageEvent) {
      if (event.data.tipo === 'PLACAR') {
        onFinalizar(event.data.pontos)
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