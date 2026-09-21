import { useState, useEffect } from 'react' //É um hook do react que permite adicionar estado a componentes funcionais
// Ele armazena um valor e fornece uma função para atualizá-lo, garantindo que o React saiba quando re-renderizar o componente

import Atracao from './pages/Atracao/Atracao'
import Identificacao from './pages/Identificacao/Identificacao'
import Jogos from './pages/Jogos/Jogos'
import Jogo from './pages/Jogo/Jogo'
import Resultado from './pages/Resultado/Resultado'
import type { Jogo as TipoJogo } from './types/Jogo'
import { verificarServidorLocal } from './service/apiLocal'
import { enviarResultado } from './service/apiLocal'
import { Manage } from './pages/Manage/Manage'


function App() { 
  const [tela, setTela] = useState('atracao') 

  const [matricula, setMatricula] = useState('') 
  const [apelido, setApelido] = useState('') 
  const [jogoSelecionado, setJogoSelecionado] = useState<TipoJogo | null>(null)
  const [pontuacao, setPontuacao] = useState<number | null>(null)

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

  function IdentificarJogador(NovaMatricula:string, NovoApelido:string) {
      setMatricula(NovaMatricula)
      setApelido(NovoApelido)
      setTela('jogos') 
  }

  function SelecionarJogo(jogo: TipoJogo) {
    setJogoSelecionado(jogo)
    setTela('jogo')
  }

  function FinalizarJogo(pontos: number) {
    setPontuacao(pontos)
  }

  async function confirmarAvaliacao(avaliacao: number) {
    if (!jogoSelecionado || pontuacao === null) {
      return
    }

    const resultadoPartida = {
      matricula,
      apelido,
      jogoId: jogoSelecionado.id,
      pontuacao,
      avaliacao,
    }

    try {
      const resposta = await enviarResultado(resultadoPartida)

      console.log('Resultado salvo:', resposta)
    } catch (erro) {
      console.error('Erro ao salvar resultado:', erro)
    }
  }
  if (window.location.pathname === '/manage') {
      return <Manage />
  }

  // OnContinuar é uma função que será passada como prop para o componente Atracao. Está em Atracao.tsx 
  if (tela === 'atracao') {
    return (<Atracao 
        onContinuar={() => setTela('identificacao')}
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
        apelido={apelido}
        onSelecionarJogo={SelecionarJogo}
      />
  )}

  if (tela === 'jogo' && jogoSelecionado !== null) {
    return (
      <Jogo
        jogo={jogoSelecionado}
        onFinalizar={FinalizarJogo}
        onVoltarInicio={() => setTela('atracao')}
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