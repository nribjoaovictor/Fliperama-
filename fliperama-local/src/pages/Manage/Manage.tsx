import { useState } from 'react'

export function Manage() {
  const [mensagem, setMensagem] = useState('')

  async function sincronizar() {
    setMensagem('Sincronizando...')

    try {
      const resposta = await fetch(
        'http://localhost:3000/sincronizar',
        {
          method: 'POST',
        }
      )

      if (!resposta.ok) {
        throw new Error('Erro ao sincronizar')
      }

      const dados = await resposta.json()

      setMensagem(
        `${dados.quantidade} jogo(s) sincronizado(s).`
      )
    } catch {
      setMensagem('Erro ao sincronizar jogos.')
    }
  }

  return (
    <main>
      <h1>Gerenciamento do Fliperama</h1>

      <button onClick={sincronizar}>
        Sincronizar jogos
      </button>

      {mensagem && <p>{mensagem}</p>}
    </main>
  )
}