import './GameCard.css'

type GameCardProps = {
  nome: string
  autores: string
  selecionado: boolean
}

function GameCard({ nome, autores, selecionado }: GameCardProps) {
  return (
    <article className={`game-card ${selecionado ? 'selecionado' : ''}`}>
      <h2>{nome}</h2>

      <p>{autores}</p>

      <span>ENTER PARA JOGAR</span>
    </article>
  )
}

export default GameCard