import { useState, useEffect } from 'react'

import Atracao from './pages/Atracao/Atracao'
import Identificacao from './pages/Identificacao/Identificacao'
import Jogos from './pages/Jogos/Jogos'
import Jogo from './pages/Jogo/Jogo'
import Resultado from './pages/Resultado/Resultado'
import type { Jogo as TipoJogo } from './types/Jogo'
import { enviarResultado, verificarServidorLocal } from './service/apiLocal'
import { Manage } from './pages/Manage/Manage'
import './App.css'

function App() {
  const [tela, setTela] = useState('atracao')
  const [jogoSelecionado, setJogoSelecionado] = useState<TipoJogo | null>(null)
  const [pontuacao, setPontuacao] = useState<number | null>(null)
  const [avaliacao, setAvaliacao] = useState<number | null>(null)
  const [acordandoServidor, setAcordandoServidor] = useState(false)

  const modoDemo = import.meta.env.VITE_DESTINO_PLACARES === 'log'

  useEffect(() => {
    let cancelado = false
    let tentativas = 0
    const maxTentativas = 15

    async function testarServidor() {
      try {
        await verificarServidorLocal()
        if (!cancelado) {
          setAcordandoServidor(false)
        }
      } catch {
        if (!cancelado) {
          tentativas++
          if (tentativas < maxTentativas) {
            setAcordandoServidor(true)
            setTimeout(testarServidor, 4000)
          } else {
            setAcordandoServidor(false)
          }
        }
      }
    }

    testarServidor()
    return () => {
      cancelado = true
    }
  }, [])

  function voltarInicio() {
    setJogoSelecionado(null)
    setPontuacao(null)
    setAvaliacao(null)
    setTela('atracao')
  }

  function SelecionarJogo(jogo: TipoJogo) {
    setJogoSelecionado(jogo)
    setPontuacao(null)
    setAvaliacao(null)
    setTela('jogo')
  }

  function FinalizarJogo(pontos: number) {
    setPontuacao(pontos)
    setTela('resultado')
  }

  function confirmarAvaliacao(nota: number) {
    setAvaliacao(nota)
    setTela('identificacao')
  }

  async function IdentificarJogador(matricula: string, apelido: string) {
    if (!jogoSelecionado || pontuacao === null || avaliacao === null) {
      throw new Error('Partida não encontrada')
    }

    const resultadoPartida = {
      matricula,
      apelido,
      jogoId: jogoSelecionado.id,
      pontuacao,
      avaliacao,
    }

    await enviarResultado(resultadoPartida)
    voltarInicio()
  }

  function renderizarBanners() {
    if (!modoDemo && !acordandoServidor) return null

    return (
      <aside className="status-banner-container" aria-live="polite">
        {acordandoServidor && (
          <div className="status-banner cold-start">
            ⏳ Acordando servidor na nuvem (free tier)... Os jogos continuam liberados!
          </div>
        )}
        {modoDemo && (
          <div className="status-banner demo">
            🕹️ Modo demonstração: placares registrados localmente
          </div>
        )}
      </aside>
    )
  }

  if (window.location.pathname === '/manage') {
    return (
      <>
        {renderizarBanners()}
        <Manage />
      </>
    )
  }

  if (tela === 'atracao') {
    return (
      <>
        {renderizarBanners()}
        <Atracao onContinuar={() => setTela('jogos')} />
      </>
    )
  }

  if (tela === 'identificacao') {
    return (
      <>
        {renderizarBanners()}
        <Identificacao onContinuar={IdentificarJogador} />
      </>
    )
  }

  if (tela === 'jogos') {
    return (
      <>
        {renderizarBanners()}
        <Jogos onSelecionarJogo={SelecionarJogo} />
      </>
    )
  }

  if (tela === 'jogo' && jogoSelecionado !== null) {
    return (
      <>
        {renderizarBanners()}
        <Jogo
          jogo={jogoSelecionado}
          onFinalizar={FinalizarJogo}
          onVoltarInicio={voltarInicio}
        />
      </>
    )
  }

  if (tela === 'resultado' && pontuacao !== null) {
    return (
      <>
        {renderizarBanners()}
        <Resultado pontuacao={pontuacao} onConfirmar={confirmarAvaliacao} />
      </>
    )
  }

  return null
}

export default App
