import { useState } from 'react'
import './Identificacao.css'

type identificacaoProps = {
    onContinuar: (matricula: string, apelido: string) => Promise<void>
}

function Identificacao( {onContinuar}: identificacaoProps ) {
    const [matricula, setMatricula] = useState('')
    const [apelido, setApelido] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')

    async function Confirmar() {
        if (salvando) return

        if (!/^\d{12}$/.test(matricula) || apelido.trim() === '') {
            setErro('Informe uma matrícula de 12 números e um apelido.')
            return
        }

        setSalvando(true)
        setErro('')

        try {
            await onContinuar(matricula, apelido.trim().toUpperCase())
        } catch {
            setErro('Não foi possível salvar a partida. Verifique o servidor e tente novamente.')
            setSalvando(false)
        }
    }
        
    return (
        <main className="identificacao-screen">
            <h1>REGISTRAR PARTIDA</h1>

            <form className="identificacao-form" onSubmit={(event) => {
                event.preventDefault()
                void Confirmar()
            }}>
            <label>
                Matrícula
                <input
                type="text"
                value={matricula}
                maxLength={12}
                inputMode="numeric"
                onChange={(event) => setMatricula(event.target.value.replace(/\D/g, ''))}
                />
            </label>

            <label>
                Apelido
                <input
                type="text"
                value={apelido}
                maxLength={9}
                onChange={(event) => setApelido(event.target.value)}
                />
            </label>

            <p>Seu apelido aparecerá no ranking.</p>

            {erro && <p className="identificacao-erro" role="alert">{erro}</p>}

            <button type="submit" disabled={salvando}>
                {salvando ? 'SALVANDO...' : 'SALVAR PARTIDA'}
            </button>
            </form>
        </main>
    )
}

export default Identificacao // essa exportação é necessária para que o componente seja utilizado em outros arquivos, como no App.tsx.
