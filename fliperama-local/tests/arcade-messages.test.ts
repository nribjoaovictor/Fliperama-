import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { test } from 'node:test'
import { GameFrame } from '../src/pages/Jogo/GameFrame'
import {
  ARCADE_IFRAME_SANDBOX,
  extrairPontuacaoDaMensagemAtiva,
  sendArcadeInitMessage,
} from '../src/pages/Jogo/arcadeMessages'
import type { IframeMessageTarget } from '../src/pages/Jogo/arcadeMessages'
import { extrairPontuacao } from '../src/pages/Jogo/extrairPontuacao'

function createFrame(): {
  frame: IframeMessageTarget
  messages: Array<{ data: unknown; targetOrigin: string }>
} {
  const messages: Array<{ data: unknown; targetOrigin: string }> = []
  const frame: IframeMessageTarget = {
    isConnected: true,
    contentWindow: {
      postMessage(data, targetOrigin) {
        messages.push({ data, targetOrigin })
      },
    },
  }

  return { frame, messages }
}

test('renders the game iframe with only the scripts sandbox permission', () => {
  const markup = renderToStaticMarkup(
    createElement(GameFrame, {
      src: '/games/example/index.html',
      title: 'Example game',
    }),
  )
  const sandbox = markup.match(/sandbox="([^"]*)"/)?.[1]

  assert.equal(sandbox, 'allow-scripts')
  const permissions = new Set(sandbox?.split(/\s+/))
  assert.equal(permissions.has('allow-same-origin'), false)
  assert.equal(permissions.has('allow-popups'), false)
  assert.equal(permissions.has('allow-top-navigation'), false)
})

test('sends the exact ARCADE_INIT payload once to the connected active iframe', () => {
  const { frame, messages } = createFrame()

  assert.equal(sendArcadeInitMessage(frame, frame), true)
  assert.deepEqual(messages, [{
    data: { type: 'ARCADE_INIT', mudo: false, recordes: [] },
    targetOrigin: '*',
  }])
  assert.equal(sendArcadeInitMessage(frame, frame), false)
  assert.equal(messages.length, 1)
})

test('does not send ARCADE_INIT when the iframe is absent, disconnected, or replaced', () => {
  const { frame: loadedFrame, messages } = createFrame()
  const { frame: activeFrame } = createFrame()

  assert.equal(sendArcadeInitMessage(null, null), false)
  assert.equal(sendArcadeInitMessage(loadedFrame, null), false)
  assert.equal(sendArcadeInitMessage(loadedFrame, activeFrame), false)

  loadedFrame.isConnected = false
  assert.equal(sendArcadeInitMessage(loadedFrame, loadedFrame), false)
  assert.deepEqual(messages, [])
})

test('extracts a score only from the connected active iframe and matching game', () => {
  const { frame } = createFrame()
  const placar = {
    type: 'PLACAR',
    jogo: 'example-game',
    payload: { pontos: 10 },
  }

  assert.equal(extrairPontuacaoDaMensagemAtiva(frame.contentWindow, frame, 'example-game', placar), 10)
  assert.equal(extrairPontuacaoDaMensagemAtiva({}, frame, 'example-game', placar), null)
  assert.equal(extrairPontuacaoDaMensagemAtiva(frame.contentWindow, null, 'example-game', placar), null)
  assert.equal(extrairPontuacaoDaMensagemAtiva(frame.contentWindow, frame, 'other-game', placar), null)
  assert.equal(extrairPontuacaoDaMensagemAtiva(frame.contentWindow, frame, 'example-game', {
    ...placar,
    payload: { pontos: Number.POSITIVE_INFINITY },
  }), null)
})

test('extracts official PLACAR and legacy GAME_OVER scores', () => {
  assert.equal(extrairPontuacao({
    type: 'PLACAR',
    jogo: 'example-game',
    payload: { pontos: 25 },
  }, 'example-game'), 25)
  assert.equal(extrairPontuacao({
    type: 'GAME_OVER',
    jogo: 'example-game',
    payload: { score: 30 },
  }, 'example-game'), 30)
  assert.equal(extrairPontuacao({
    tipo: 'PLACAR',
    jogo: 'estrelas-da-ciencia',
    versao: '1.0.0',
    pontos: 1500,
  }, 'estrelas-da-ciencia'), 1500)
  assert.equal(extrairPontuacao({
    tipo: 'PLACAR',
    jogo: 'estrelas-da-ciencia',
    versao: '1.0.0',
    pontos: -1,
  }, 'estrelas-da-ciencia'), null)
  assert.equal(extrairPontuacao({
    type: 'PLACAR',
    jogo: 'other-game',
    payload: { pontos: 25 },
  }, 'example-game'), null)
  assert.equal(extrairPontuacao({
    type: 'PLACAR',
    jogo: 'example-game',
    payload: { pontos: -1 },
  }, 'example-game'), null)
  assert.equal(extrairPontuacao({
    type: 'GAME_OVER',
    jogo: 'example-game',
    payload: { score: Number.NaN },
  }, 'example-game'), null)
})

test('exposes the sandbox token used by the iframe contract', () => {
  assert.equal(ARCADE_IFRAME_SANDBOX, 'allow-scripts')
  assert.equal(ARCADE_IFRAME_SANDBOX.includes('allow-same-origin'), false)
  assert.equal(ARCADE_IFRAME_SANDBOX.includes('allow-popups'), false)
  assert.equal(ARCADE_IFRAME_SANDBOX.includes('allow-top-navigation'), false)
})
