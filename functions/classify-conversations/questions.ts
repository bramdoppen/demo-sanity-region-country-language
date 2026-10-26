import type {SanityClient} from '@sanity/client'
import {getConversationsToClassify, getPreviousContentGaps} from '@sanity/context/insights'

export const MCP_ENDPOINT = 'paxon-help'
export const INSIGHTS_API_VERSION = '2026-08-25'

export type ClassifyOptions = {
  /** Org-scoped client (`context: {organizationId}`) with a Context Editor token. */
  insights: SanityClient
  /** Project client with write access to the dataset that holds `customerQuestion` documents. Also runs Agent Actions. */
  content: SanityClient
  /** Only classify conversations that have been quiet this long. */
  settledForMinutes?: number
  onClassified?: (result: ClassifiedConversation) => void
}

type CoreMetrics = {
  successScore: number
  sentiment: 'positive' | 'neutral' | 'negative'
  contentGaps: string[]
}

export type ClassifiedConversation = CoreMetrics & {
  threadId: string
  firstMessage: string | null
  questionId?: string
}

type Transcript = {role: string; content: string | null; error: string | null}[]

const transcriptText = (messages: Transcript) =>
  messages
    .map((m) => {
      const failure = m.error ? ` (failed: ${m.error.split('\n', 1)[0]})` : ''
      return `[${m.role}]: ${m.content ?? '(no content)'}${failure}`
    })
    .join('\n\n')

/** The same classification as `classifyConversation` from `@sanity/context/insights`, run with Agent Actions. */
export async function classify(agent: SanityClient, messages: Transcript, previousContentGaps: string[]) {
  const metrics = (await agent.agent.action.prompt({
    instruction: `You are analyzing a conversation between a user and an AI assistant.
Return JSON {"successScore": number, "sentiment": "positive" | "neutral" | "negative", "contentGaps": string[]}.
- successScore: an integer from 1 to 10. How well did the assistant resolve the user's needs? 1=complete failure, 5=partially addressed, 10=fully resolved.
- sentiment: the user's overall emotional tone across the entire conversation.
- contentGaps: topics where the assistant lacked information in its knowledge base. Only include gaps where the assistant could not provide information, not refusals, off-topic requests, or tool errors. Be specific (e.g., "international return policy" not "returns"). Empty array if no content gaps.
Previously identified content gaps (reuse these exact terms when they match the gaps you find; only create new terms for genuinely new topics): $previousGaps
Conversation:
$transcript`,
    instructionParams: {
      previousGaps: previousContentGaps.length ? previousContentGaps.join('; ') : '(none)',
      transcript: transcriptText(messages),
    },
    format: 'json',
  })) as Partial<CoreMetrics>

  return {
    successScore: Math.min(10, Math.max(1, Math.round(Number(metrics.successScore) || 1))),
    sentiment: (['positive', 'neutral', 'negative'] as const).includes(metrics.sentiment!)
      ? metrics.sentiment!
      : 'neutral',
    contentGaps: Array.isArray(metrics.contentGaps) ? metrics.contentGaps.map(String) : [],
  } satisfies CoreMetrics
}

/**
 * Classifies settled help-chat conversations for Insights, and turns every conversation
 * with a content gap into a customer question for the Question Desk.
 */
export async function classifyIntoQuestions({
  insights,
  content,
  settledForMinutes,
  onClassified,
}: ClassifyOptions): Promise<ClassifiedConversation[]> {
  const agent = content.withConfig({apiVersion: 'vX'})
  const pending = await getConversationsToClassify({
    client: insights,
    mcpEndpoint: MCP_ENDPOINT,
    settledForMinutes,
  })
  const previousContentGaps = await getPreviousContentGaps({client: insights})
  const results: ClassifiedConversation[] = []

  for (const conversation of pending) {
    const {threadId} = conversation
    const doc = await insights.context.conversations.get({threadId})
    if (!doc?.messages.length) continue

    let coreMetrics: CoreMetrics
    try {
      coreMetrics = await classify(agent, doc.messages, previousContentGaps)
      await insights.context.conversations.classify({threadId, coreMetrics})
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await insights.context.conversations.classify({
        threadId,
        classificationError: message.slice(0, 500),
      })
      continue
    }

    const result: ClassifiedConversation = {
      threadId,
      firstMessage: conversation.firstMessage,
      ...coreMetrics,
    }
    const firstUserMessage = doc.messages.find((m) => m.role === 'user')?.content
    if (coreMetrics.contentGaps.length > 0 && firstUserMessage) {
      const metadata = doc.metadata ?? {}
      const questionId = `paxon-question-chat-${threadId.replace(/[^a-zA-Z0-9_-]/g, '')}`
      await content.createIfNotExists({
        _id: questionId,
        _type: 'customerQuestion',
        questionText: firstUserMessage,
        channel: 'chatbot',
        market: typeof metadata.market === 'string' ? metadata.market : undefined,
        language: typeof metadata.language === 'string' ? metadata.language : 'en',
        receivedAt: conversation.messagesUpdatedAt,
        status: 'new',
        insights: {
          contentGap: coreMetrics.contentGaps.join('; '),
          successScore: coreMetrics.successScore,
          sentiment: coreMetrics.sentiment,
          threadId,
        },
      })
      result.questionId = questionId
      previousContentGaps.push(...coreMetrics.contentGaps)
    }

    results.push(result)
    onClassified?.(result)
  }
  return results
}
