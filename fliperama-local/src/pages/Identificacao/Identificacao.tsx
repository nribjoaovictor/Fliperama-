import { useState } from 'react'
import './Identificacao.css'

type identificacaoProps = {
    onContinuar: (apelido: string) => Promise<void>
}

function Identificacao( {onContinuar}: identificacaoProps ) {
    const [apelido, setApelido] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')

    async function Confirmar() {
        if (salvando) return

        if (!/^[A-Za-z0-9]{1,9}$/.test(apelido.trim())) {
            setErro('Informe um apelido de até 9 letras ou números.')
            return
        }

        setSalvando(true)
        setErro('')

        try {
            await onContinuar(apelido.trim().toUpperCase())
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
                Apelido
                <input
                type="text"
                value={apelido}
                maxLength={9}
                onChange={(event) => setApelido(event.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
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
