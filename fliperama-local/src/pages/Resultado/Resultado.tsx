import { useEffect, useState } from 'react'
import './Resultado.css'

type ResultadoProps = {
  pontuacao: number
  onConfirmar: (avaliacao: number) => void
}

function Resultado({ pontuacao, onConfirmar }: ResultadoProps) {
  const [avaliacao, setAvaliacao] = useState(3)

  useEffect(() => {
    function aoPressionarTecla(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') {
        setAvaliacao((atual) =>
          atual < 5 ? atual + 1 : 1
        )
      }

      if (event.key === 'ArrowLeft') {
        setAvaliacao((atual) =>
          atual > 1 ? atual - 1 : 5
        )
      }

      if (event.key === 'Enter') {
        onConfirmar(avaliacao)
      }
    }

    window.addEventListener('keydown', aoPressionarTecla)

    return () => {
      window.removeEventListener('keydown', aoPressionarTecla)
    }
  }, [avaliacao, onConfirmar])

  return (
    <main className="resultado-screen">
      <section className="resultado-container">
        <p className="resultado-status">PARTIDA FINALIZADA</p>

        <h1>FIM DE JOGO</h1>

        <div className="pontuacao-box">
          <span>PONTUAÇÃO</span>
          <strong>{pontuacao}</strong>
        </div>

        <div className="avaliacao-container">
          <h2>AVALIE O JOGO</h2>

          <div className="notas">
            {[1, 2, 3, 4, 5].map((nota) => (
              <span
                key={nota}
                className={
                  nota === avaliacao
                    ? 'nota nota-selecionada'
                    : 'nota'
                }
              >
                {nota}
              </span>
            ))}
          </div>
        </div>

        <p className="resultado-instrucao">
          ← → SELECIONAR
        </p>

        <p className="resultado-confirmar">
          [ ENTER ] CONFIRMAR E IDENTIFICAR
        </p>
      </section>
    </main>
  )
}

export default Resultado
