import { useState } from 'react'
import './Identificacao.css'

type identificacaoProps = {
    onContinuar: (matricula:string, apelido:string) => void
}

function Identificacao( {onContinuar}: identificacaoProps ) {
    const [matricula, setMatricula] = useState('')
    const [apelido, setApelido] = useState('')

    function Confirmar() {
        if (matricula.length !== 12 || apelido.trim() === '') {
            alert('Preencha todos os campos corretamente.');
            return;
        }
        onContinuar(matricula, apelido);
    }
        
    return (
        <main className="identificacao-screen">
            <h1>IDENTIFICAÇÃO</h1>

            <section className="identificacao-form">
            <label>
                Matrícula
                <input
                type="text"
                value={matricula}
                maxLength={12}
                onChange={(event) => setMatricula(event.target.value)}
                />
            </label>

            <label>
                Apelido
                <input
                type="text"
                value={apelido}
                onChange={(event) => setApelido(event.target.value)}
                />
            </label>

            <p>Seu apelido aparecerá no ranking.</p>

            <button onClick={Confirmar}>
                CONTINUAR
            </button>
            </section>
        </main>
    )
}

export default Identificacao // essa exportação é necessária para que o componente seja utilizado em outros arquivos, como no App.tsx.