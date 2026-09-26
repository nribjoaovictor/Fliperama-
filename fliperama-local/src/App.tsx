import { useState, useEffect } from 'react'

import Atracao from './pages/Atracao/Atracao'
import Identificacao from './pages/Identificacao/Identificacao'
import Jogos from './pages/Jogos/Jogos'
import Jogo from './pages/Jogo/Jogo'
import Resultado from './pages/Resultado/Resultado'
import type { Jogo as TipoJogo } from './types/Jogo'
import { enviarResultado, verificarServidorLocal } from './service/apiLocal'
import { Manage } from './pages/Manage/Manage'


function App() {
  const [tela, setTela] = useState('atracao')
  const [jogoSelecionado, setJogoSelecionado] = useState<TipoJogo | null>(null)
  const [pontuacao, setPontuacao] = useState<number | null>(null)
  const [avaliacao, setAvaliacao] = useState<number | null>(null)

  useEffect(() => {
    async function testarServidor() {
      try {
        const dados = await verificarServidorLocal()
        console.log('Fastify respondeu:', dados)
      } catch (erro) {
        console.error('Erro ao conectar com Fastify:', erro)
      }
    }

    testarServidor()
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
  if (window.location.pathname === '/manage') {
      return <Manage />
  }

  if (tela === 'atracao') {
    return (<Atracao 
        onContinuar={() => setTela('jogos')}
    />)
  }

  if (tela === 'identificacao') {
    return (<Identificacao 
        onContinuar={IdentificarJogador}
    />)
  }

  if (tela === 'jogos') {
    return (
      <Jogos
        onSelecionarJogo={SelecionarJogo}
      />
  )}

  if (tela === 'jogo' && jogoSelecionado !== null) {
    return (
      <Jogo
        jogo={jogoSelecionado}
        onFinalizar={FinalizarJogo}
        onVoltarInicio={voltarInicio}
      />
    )
  }
  if (tela === 'resultado' && pontuacao !== null) {
    return (
      <Resultado
        pontuacao={pontuacao}
        onConfirmar={confirmarAvaliacao}
      />
    )
  }
  
  return null 
}


export default App
