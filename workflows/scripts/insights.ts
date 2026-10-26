/**
 * Cue command for the recording: classify the help-chat conversations now instead of
 * waiting for the scheduled function. Conversations with a content gap land in the
 * Question Desk inbox as new customer questions.
 *
 *   npm run insights
 */
import {createClient} from '@sanity/client'
import {
  classifyIntoQuestions,
  INSIGHTS_API_VERSION,
} from '../../functions/classify-conversations/questions.ts'
import {content, ORGANIZATION_ID} from '../lib/env.ts'

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} in workflows/.env (see .env.example)`)
  return value
}

const insights = createClient({
  apiVersion: INSIGHTS_API_VERSION,
  token: required('SANITY_CONTEXT_TOKEN'),
  context: {organizationId: ORGANIZATION_ID},
  useCdn: false,
  useProjectHostname: false,
})

console.log('Classifying help-chat conversations with Agent Actions…')
const results = await classifyIntoQuestions({
  insights,
  content,
  settledForMinutes: 0,
  onClassified: (r) => {
    const gaps = r.contentGaps.length
      ? `content gap: ${r.contentGaps.join('; ')}`
      : 'no content gap'
    console.log(
      `  “${r.firstMessage ?? '(empty)'}”  score ${r.successScore}/10, ${r.sentiment}, ${gaps}`,
    )
    if (r.questionId) console.log('    → new question in the Question Desk inbox')
  },
})
if (results.length === 0) console.log('No new conversations to classify. Chat on /help first.')
