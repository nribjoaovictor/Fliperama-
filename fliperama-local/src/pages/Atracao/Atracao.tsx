import { useEffect } from 'react'
import './Atracao.css'

type AtracaoProps = {
  onContinuar: () => void
}

// UseEffect é um hook do React que permite executar efeitos colaterais em componentes funcionais.
//  Ele é chamado após a renderização do componente e pode ser usado para manipular o DOM,
//  fazer requisições de rede, configurar assinaturas, entre outros efeitos.

function Atracao({ onContinuar }: AtracaoProps) {
  useEffect(() => {
    function aoPressionarTecla() {
      onContinuar()
    }

    window.addEventListener('keydown', aoPressionarTecla)

    return () => {
      window.removeEventListener('keydown', aoPressionarTecla) //Limpeza do evento. Quando a tela atração desaparece, o evento
      //é removido para evitar vazamentos de memória e comportamentos inesperados.
    }
  }, [onContinuar])

  return (
    <main className="arcade-screen">
      <section className="attraction-screen">
        <div className="arcade-dots">● ● ● ● ●</div>

        <h1 className="arcade-title">
          <span>RECREIO</span>
          <span>ARCADE</span>
        </h1>

        <div className="arcade-line"></div>

        <p className="arcade-call">
          APERTE QUALQUER TECLA
          <br />
          PARA JOGAR
        </p>

        <p className="arcade-subtitle">
          Jogue, aprenda e conquiste o ranking!
        </p>
      </section>
    </main>
  )
}


export default Atracao // essa exportação é necessária para que o componente seja utilizado em outros arquivos, como no App.tsx.