import {createOpenRouter} from '@openrouter/ai-sdk-provider'
import {createClient} from '@sanity/client'
import {scheduledEventHandler} from '@sanity/functions'

import {classifyIntoQuestions, INSIGHTS_API_VERSION} from './questions.ts'

function required(name: string) {
  const value = process.env[name]
  if (!value)
    throw new Error(
      `Missing ${name}. Add it with: npx sanity functions env add classify-conversations ${name} <value>`,
    )
  return value
}

export const handler = scheduledEventHandler(async ({context}) => {
  const insights = createClient({
    apiVersion: INSIGHTS_API_VERSION,
    token: required('SANITY_ORGANIZATION_TOKEN'),
    context: {organizationId: required('SANITY_ORGANIZATION_ID')},
    useCdn: false,
    useProjectHostname: false,
  })
  const content = createClient({
    projectId: required('SANITY_PROJECT_ID'),
    dataset: required('SANITY_DATASET'),
    apiVersion: INSIGHTS_API_VERSION,
    token: context.clientOptions?.token,
    useCdn: false,
  })
  const openrouter = createOpenRouter({apiKey: required('OPENROUTER_API_KEY')})

  const results = await classifyIntoQuestions({
    insights,
    content,
    model: openrouter(process.env.OPENROUTER_CLASSIFY_MODEL || 'anthropic/claude-haiku-5.5'),
  })
  const questions = results.filter((r) => r.questionId).length
  console.log(
    `Classified ${results.length} conversation(s); ${questions} new customer question(s) from content gaps.`,
  )
})
