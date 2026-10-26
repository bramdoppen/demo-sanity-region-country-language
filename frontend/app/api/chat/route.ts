import {createMCPClient} from '@ai-sdk/mcp'
import {createOpenRouter} from '@openrouter/ai-sdk-provider'
import {createClient} from '@sanity/client'
import {sanityInsightsIntegration} from '@sanity/context/ai-sdk'
import {convertToModelMessages, isStepCount, streamText, type UIMessage} from 'ai'

const MCP_ENDPOINT = 'paxon-help'

type ChatRequest = {
  id: string
  messages: UIMessage[]
  market?: string
  language?: string
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} in frontend/.env.local`)
  return value
}

export async function POST(request: Request) {
  const {id, messages, market = 'BE', language = 'en'}: ChatRequest = await request.json()

  const token = required('SANITY_ORGANIZATION_TOKEN')
  const mcpUrl = required('SANITY_CONTEXT_MCP_URL')
  const authorization = {Authorization: `Bearer ${token}`}

  // Org-scoped: conversations are saved to the organization's Context store.
  const insightsClient = createClient({
    apiVersion: '2026-08-25',
    token,
    context: {organizationId: required('SANITY_ORGANIZATION_ID')},
    useCdn: false,
    useProjectHostname: false,
  })

  const initialContextUrl = new URL(mcpUrl)
  initialContextUrl.pathname = `${initialContextUrl.pathname.replace(/\/$/, '')}/initial-context`

  const [initialContext, mcp] = await Promise.all([
    fetch(initialContextUrl, {headers: authorization}).then((r) => (r.ok ? r.text() : '')),
    createMCPClient({transport: {type: 'http', url: mcpUrl, headers: authorization}}),
  ])
  const tools = await mcp.tools()
  delete tools.initial_context

  const openrouter = createOpenRouter({apiKey: required('OPENROUTER_API_KEY')})

  const result = streamText({
    model: openrouter(process.env.OPENROUTER_CHAT_MODEL || 'anthropic/claude-sonnet-5.5'),
    system: [
      'You are the Paxon help assistant. Paxon is a fulfillment and logistics company.',
      `The customer is in market ${market} and writes in "${language}". Answer in their language.`,
      'Answer only from the Knowledge Base: search it, read the entries you need, then answer in two or three sentences.',
      'If the Knowledge Base does not cover the question, or two sources disagree, say so plainly and offer to pass the question to the contact centre. Never guess.',
      '',
      '# Knowledge Base reference',
      initialContext,
    ].join('\n'),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(6),
    telemetry: {
      isEnabled: true,
      integrations: [
        sanityInsightsIntegration({
          client: insightsClient,
          threadId: id,
          metadata: {
            mcpEndpoints: [MCP_ENDPOINT],
            app: 'paxon-help-chat',
            channel: 'chatbot',
            market,
            language,
          },
        }),
      ],
    },
    onEnd: () => mcp.close(),
    onError: () => mcp.close(),
  })

  return result.toUIMessageStreamResponse()
}
