import { useState, useEffect } from 'react'
import GameCard from '../../components/GameCard/GameCard'
import { buscarJogos } from '../../service/apiLocal'
import './Jogos.css'
import type { Jogo } from '../../types/Jogo'

type JogosProps = {
    onSelecionarJogo: (jogo: Jogo) => void
}



function Jogos({ onSelecionarJogo }: JogosProps) {
  const [jogoSelecionado, setJogoSelecionado] = useState(0)
  const [jogos, setJogos] = useState<Jogo[]>([])
    useEffect(() => {
        async function carregarJogos() {
            try {
            const jogosRecebidos = await buscarJogos()
            setJogos(jogosRecebidos)
            } catch (erro) {
            console.error('Erro ao carregar jogos:', erro)
            }
        }

        carregarJogos()
    }, [])

    useEffect(() => {
        function aoPressionarTecla(event: KeyboardEvent) {
            if (jogos.length === 0) {
                return
            }

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

                if (jogo) {
                    onSelecionarJogo(jogo)
                }
            }
        }

        window.addEventListener('keydown', aoPressionarTecla)

        return () => {
        window.removeEventListener('keydown', aoPressionarTecla)
        }
    }, [jogos, jogoSelecionado, onSelecionarJogo])

    

    return (
        <main className="jogos-screen">

            <h1>SELEÇÃO DE JOGOS</h1>

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
