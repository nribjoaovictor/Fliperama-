import { useState, useEffect } from 'react'
import GameCard from '../../components/GameCard/GameCard'
import './Jogos.css'
import type { Jogo } from '../../types/Jogo'

type JogosProps = {
    apelido: string
    onSelecionarJogo: (jogo: Jogo) => void
}

const jogos = [
  {
    id: 1,
    nome: 'Quiz de Biologia',
    autores: 'João e Maria',
    caminho: '/jogos/jogo_teste/index.html',
  },
  {
    id: 2,
    nome: 'Desafio Matemático',
    autores: 'Pedro e Ana',
    caminho: '/jogos/jogo_teste/index.html',
  },
  {
    id: 3,
    nome: 'História Arcade',
    autores: 'Carlos e Julia',
    caminho: '/jogos/jogo_teste/index.html',
  },
]

function Jogos({ apelido, onSelecionarJogo }: JogosProps) {
  const [jogoSelecionado, setJogoSelecionado] = useState(0)

    useEffect(() => {
        function aoPressionarTecla(event: KeyboardEvent) {
            if (event.key === 'ArrowRight') {
                setJogoSelecionado((atual) =>
                atual < jogos.length - 1 ? atual + 1 : 0
                )
            }

            if (event.key === 'ArrowLeft') {
                setJogoSelecionado((atual) =>
                atual > 0 ? atual - 1 : jogos.length - 1
                )
            }
            
            if (event.key === 'Enter') {
                const jogo = jogos[jogoSelecionado]

                onSelecionarJogo(jogo)
            }
        }

        window.addEventListener('keydown', aoPressionarTecla)

        return () => {
        window.removeEventListener('keydown', aoPressionarTecla)
        }
    }, [jogoSelecionado, onSelecionarJogo])

    return (
        <main className="jogos-screen">

            <h1>SELEÇÃO DE JOGOS</h1>

            <p className="jogador-atual">
            Jogador: {apelido}
            </p>

            <section className="jogos-grid">
            {jogos.map((jogo, index) => (
                <GameCard
                key={jogo.id}
                nome={jogo.nome}
                autores={jogo.autores}
                selecionado={index === jogoSelecionado}
                />
            ))}
            </section>

            <p className="jogos-instrucao">
            ← → SELECIONAR • ENTER JOGAR
            </p>

        </main>
    )
}

export default Jogos