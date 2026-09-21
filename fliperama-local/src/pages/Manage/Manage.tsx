import { useState } from 'react'
import './Manage.css'

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
  <main className="manage-screen">
    <section className="manage-panel">
      <h1>GERENCIAMENTO DO FLIPERAMA</h1>

      <p className="manage-description">
        Sincronize os jogos disponíveis com o armazenamento local.
      </p>

      <button
        className="manage-sync-button"
        onClick={sincronizar}
      >
        SINCRONIZAR JOGOS
      </button>

      {mensagem && (
        <p className="manage-message">
          {mensagem}
        </p>
      )}
    </section>
  </main>
  )
}