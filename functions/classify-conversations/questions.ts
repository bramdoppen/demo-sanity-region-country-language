import type {SanityClient} from '@sanity/client'
import {
  classifyConversation,
  getConversationsToClassify,
  getPreviousContentGaps,
} from '@sanity/context/insights'
import type {LanguageModel} from 'ai'

export const MCP_ENDPOINT = 'paxon-help'
export const INSIGHTS_API_VERSION = '2026-08-25'

export type ClassifyOptions = {
  /** Org-scoped client (`context: {organizationId}`) with a token that can read and classify conversations. */
  insights: SanityClient
  /** Project client with write access to the dataset that holds `customerQuestion` documents. */
  content: SanityClient
  model: LanguageModel
  /** Only classify conversations that have been quiet this long. */
  settledForMinutes?: number
  onClassified?: (result: ClassifiedConversation) => void
}

export type ClassifiedConversation = {
  threadId: string
  firstMessage: string | null
  successScore: number
  sentiment: string
  contentGaps: string[]
  questionId?: string
}

/**
 * Classifies settled help-chat conversations with Insights, and turns every conversation
 * with a content gap into a customer question for the Question Desk.
 */
export async function classifyIntoQuestions({
  insights,
  content,
  model,
  settledForMinutes,
  onClassified,
}: ClassifyOptions): Promise<ClassifiedConversation[]> {
  const pending = await getConversationsToClassify({
    client: insights,
    mcpEndpoint: MCP_ENDPOINT,
    settledForMinutes,
  })
  const previousContentGaps = await getPreviousContentGaps({client: insights})
  const results: ClassifiedConversation[] = []

  for (const conversation of pending) {
    const {coreMetrics} = await classifyConversation({
      client: insights,
      threadId: conversation.threadId,
      model,
      previousContentGaps,
    })
    const result: ClassifiedConversation = {
      threadId: conversation.threadId,
      firstMessage: conversation.firstMessage,
      ...coreMetrics,
    }

    if (coreMetrics.contentGaps.length > 0) {
      const doc = await insights.context.conversations.get({threadId: conversation.threadId})
      const metadata = doc?.metadata ?? {}
      const firstUserMessage =
        doc?.messages.find((m) => m.role === 'user')?.content ?? conversation.firstMessage
      if (firstUserMessage) {
        const questionId = `paxon-question-chat-${conversation.threadId.replace(/[^a-zA-Z0-9_-]/g, '')}`
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
            threadId: conversation.threadId,
          },
        })
        result.questionId = questionId
      }
      previousContentGaps.push(...coreMetrics.contentGaps)
    }

    results.push(result)
    onClassified?.(result)
  }
  return results
}
