/**
 * Cue command for the recording: a customer question "lands" and gets checked.
 *
 *   npm run ask -- 2          start "Question to FAQ" for paxon-question-2 and fire "Check"
 *   npm run ask -- 2 --land   only start it (the Check button in the Question Desk fires it)
 */
import {refDataset} from '@sanity/workflow-engine'
import {engine} from '../lib/engine.ts'
import {content, DATASET, PROJECT_ID} from '../lib/env.ts'

const n = process.argv[2]
if (!n) {
  console.error('Usage: npm run ask -- <question number 1-6> [--land]')
  process.exit(1)
}
const questionId = `paxon-question-${n}`
const question = await content.fetch<{questionText: string} | null>(`*[_id == $id][0]{questionText}`, {id: questionId})
if (!question) throw new Error(`${questionId} does not exist. Run npm run seed first.`)

await content
  .patch(questionId)
  .set({status: 'new'})
  .unset(['signals', 'kbVerdict', 'kbReason', 'kbAnswer', 'citations', 'draftFaq', 'faqBefore', 'faqAfter'])
  .commit()

const started = await engine.startInstance({
  definition: 'question-to-faq',
  initialFields: [
    {
      type: 'subject',
      name: 'subject',
      value: refDataset({projectId: PROJECT_ID, dataset: DATASET, documentId: questionId, type: 'customerQuestion'}),
    },
  ],
})
const instanceId = started.instance._id
console.log(`Question landed: "${question.questionText}"`)

if (!process.argv.includes('--land')) {
  await engine.fireAction({instanceId, activity: 'triage', action: 'check'})
  console.log('Checking it now. The drainer picks it up from here.')
}
