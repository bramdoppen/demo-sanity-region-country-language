'use client'

import {useChat} from '@ai-sdk/react'
import {DefaultChatTransport} from 'ai'
import {useState} from 'react'

const MARKETS = [
  {market: 'BE', language: 'nl', label: 'België · Nederlands'},
  {market: 'BE', language: 'fr', label: 'Belgique · Français'},
  {market: 'NL', language: 'nl', label: 'Nederland · Nederlands'},
  {market: 'FR', language: 'fr', label: 'France · Français'},
  {market: 'DE', language: 'de', label: 'Deutschland · Deutsch'},
  {market: 'BE', language: 'en', label: 'Belgium · English'},
]

export default function HelpChat() {
  const [locale, setLocale] = useState(MARKETS[5])
  const [input, setInput] = useState('')

  const {messages, sendMessage, status, error} = useChat({
    transport: new DefaultChatTransport({api: '/api/chat'}),
  })
  const busy = status === 'submitted' || status === 'streaming'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16 text-lg">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">Paxon help</h1>
          <p className="mt-3 text-paxon-navy/70">
            Ask anything about storage, shipping, returns or integrations.
          </p>
        </div>
        <select
          className="rounded border border-paxon-warm-grey bg-white px-3 py-2 text-base"
          value={MARKETS.indexOf(locale)}
          onChange={(e) => setLocale(MARKETS[Number(e.target.value)])}
          disabled={messages.length > 0}
          aria-label="Market and language"
        >
          {MARKETS.map((m, i) => (
            <option key={m.label} value={i}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-h-80 flex-col gap-4 bg-paxon-warm p-6">
        {messages.length === 0 && (
          <p className="text-paxon-navy/60">
            Try: “What are your order cut-off times during Black Friday?”
          </p>
        )}
        {messages.map((message) => {
          const text = message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')
          const searching = message.parts.some(
            (part) => part.type.startsWith('tool-') || part.type === 'dynamic-tool',
          )
          if (message.role === 'user') {
            return (
              <div
                key={message.id}
                className="self-end max-w-[85%] bg-paxon-blue px-4 py-3 text-white"
              >
                {text}
              </div>
            )
          }
          return (
            <div
              key={message.id}
              className="self-start max-w-[85%] whitespace-pre-line bg-white px-4 py-3"
            >
              {text ||
                (searching ? (
                  <span className="text-paxon-navy/60">Checking the Knowledge Base…</span>
                ) : null)}
            </div>
          )
        })}
        {status === 'submitted' && <div className="self-start text-paxon-navy/60">…</div>}
        {error && (
          <div className="self-start text-red-700">Something went wrong. Please try again.</div>
        )}
      </div>

      <form
        className="flex gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!input.trim() || busy) return
          sendMessage({text: input}, {body: {market: locale.market, language: locale.language}})
          setInput('')
        }}
      >
        <input
          className="flex-1 rounded border border-paxon-warm-grey px-4 py-3 focus:border-paxon-blue focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question"
          aria-label="Your question"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="btn-paxon disabled:opacity-40"
        >
          Send <span aria-hidden="true">→</span>
        </button>
      </form>
    </div>
  )
}
