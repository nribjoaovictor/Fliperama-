import { useState, useEffect } from 'react'

import Atracao from './pages/Atracao/Atracao'
import Identificacao from './pages/Identificacao/Identificacao'
import Jogos from './pages/Jogos/Jogos'
import Jogo from './pages/Jogo/Jogo'
import Resultado from './pages/Resultado/Resultado'
import type { Jogo as TipoJogo } from './types/Jogo'
import type { PlacarRecebido } from './pages/Jogo/extrairPontuacao'
import { enviarResultado, verificarServidorLocal } from './service/apiLocal'
import { Manage } from './pages/Manage/Manage'


function App() {
  const [tela, setTela] = useState('atracao')
  const [jogoSelecionado, setJogoSelecionado] = useState<TipoJogo | null>(null)
  const [placar, setPlacar] = useState<PlacarRecebido | null>(null)
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
    setPlacar(null)
    setAvaliacao(null)
    setTela('atracao')
  }

  function SelecionarJogo(jogo: TipoJogo) {
    setJogoSelecionado(jogo)
    setPlacar(null)
    setAvaliacao(null)
    setTela('jogo')
  }

  function FinalizarJogo(resultado: PlacarRecebido) {
    setPlacar(resultado)
    setTela('resultado')
  }

  async function confirmarAvaliacao(nota: number) {
    if (!jogoSelecionado || !placar) throw new Error('Partida não encontrada')
    // Nos jogos aprovados pelo G1, o apelido já veio do próprio jogo.
    if (placar.apelido) {
      await enviarResultado({
        apelido: placar.apelido, jogoId: jogoSelecionado.id,
        pontuacao: placar.pontuacao, avaliacao: nota,
        versao: placar.versao,
        duracao_s: placar.duracao_s, acertos: placar.acertos,
        erros: placar.erros, tema: placar.tema,
      })
      voltarInicio()
      return
    }
    setAvaliacao(nota)
    setTela('identificacao')
  }

  async function IdentificarJogador(apelido: string) {
    if (!jogoSelecionado || !placar || avaliacao === null) {
      throw new Error('Partida não encontrada')
    }

    const resultadoPartida = {
      apelido,
      jogoId: jogoSelecionado.id,
      pontuacao: placar.pontuacao,
      avaliacao,
      versao: placar.versao,
      duracao_s: placar.duracao_s, acertos: placar.acertos,
      erros: placar.erros, tema: placar.tema,
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
  if (tela === 'resultado' && placar !== null) {
    return (
      <Resultado
        pontuacao={placar.pontuacao}
        onConfirmar={confirmarAvaliacao}
      />
    )
  }
  
  return null 
}


export default App
