import {createClient} from '@sanity/client'
import {createUIMessageStream, createUIMessageStreamResponse, type UIMessage} from 'ai'

import {dataset, projectId} from '@/sanity/lib/api'
import {token as readToken} from '@/sanity/lib/token'

import {lookUp} from './knowledgeBase'

const MCP_ENDPOINT = 'paxon-help'
const MAX_RECORDED_RESULT = 4000

type ChatRequest = {
  id: string
  messages: UIMessage[]
  market?: string
  language?: string
}

type RecordedMessage = {
  role: 'user' | 'assistant' | 'tool'
  content: string | null
  toolName?: string | null
  toolType?: 'call' | 'result' | null
  error?: string | null
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} in frontend/.env.local`)
  return value
}

const plainText = (message: UIMessage) =>
  message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')

export async function POST(request: Request) {
  const {id, messages, market = 'BE', language = 'en'}: ChatRequest = await request.json()
  const question = plainText(messages[messages.length - 1])

  const orgToken = required('SANITY_ORGANIZATION_TOKEN')
  const insights = createClient({
    apiVersion: '2026-08-25',
    token: orgToken,
    context: {organizationId: required('SANITY_ORGANIZATION_ID')},
    useCdn: false,
    useProjectHostname: false,
  })
  // Agent Actions run against the project; prompt only needs read access.
  const agent = createClient({
    projectId,
    dataset,
    apiVersion: 'vX',
    token: readToken,
    useCdn: false,
  })

  const stream = createUIMessageStream({
    execute: async ({writer}) => {
      const turn: RecordedMessage[] = [{role: 'user', content: question}]
      let answer = ''
      let failure: string | undefined

      try {
        const {entries, steps} = await lookUp(question, {
          mcpUrl: required('SANITY_CONTEXT_MCP_URL'),
          token: orgToken,
          agent,
        })
        for (const step of steps) {
          turn.push({role: 'tool', toolName: step.toolName, toolType: 'call', content: step.call})
          turn.push({
            role: 'tool',
            toolName: step.toolName,
            toolType: 'result',
            content: step.result.slice(0, MAX_RECORDED_RESULT),
          })
        }

        const history = messages
          .slice(0, -1)
          .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${plainText(m)}`)
          .join('\n')
        answer = (await agent.agent.action.prompt({
          instruction: `You are the Paxon help assistant. Paxon is a fulfillment and logistics company.
The customer is in market $market and writes in language "$language". Answer in that language.
Answer only from the Knowledge Base entries below, in two or three friendly sentences. Plain text, no markdown.
If the entries don't answer the question, or two entries disagree, say so plainly and offer to pass the question to the contact centre. Never guess.
Earlier in this conversation: $history
Customer question: $question
Knowledge Base entries: $entries`,
          instructionParams: {
            market,
            language,
            history: history || '(nothing yet)',
            question,
            entries: entries || '(no entries found)',
          },
        })) as string
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error)
        answer =
          "Sorry, I can't look that up right now. I'll pass your question to our contact centre."
      }

      writer.write({type: 'text-start', id: 'answer'})
      writer.write({type: 'text-delta', id: 'answer', delta: answer})
      writer.write({type: 'text-end', id: 'answer'})
      turn.push({role: 'assistant', content: answer, error: failure ?? null})

      // Saves replace the transcript, so append this turn to what's already recorded.
      try {
        const recorded = await insights.context.conversations.get({threadId: id})
        await insights.context.conversations.save({
          threadId: id,
          messages: [...(recorded?.messages ?? []), ...turn].map(
            ({role, content, toolName, toolType, error}) => ({
              role,
              content,
              toolName,
              toolType,
              error,
            }),
          ),
          modelProvider: 'sanity',
          modelId: 'agent-actions',
          metadata: {
            mcpEndpoints: [MCP_ENDPOINT],
            app: 'paxon-help-chat',
            channel: 'chatbot',
            market,
            language,
          },
        })
      } catch (error) {
        console.error('Could not save the conversation to Insights:', error)
      }
    },
  })

  return createUIMessageStreamResponse({stream})
}
