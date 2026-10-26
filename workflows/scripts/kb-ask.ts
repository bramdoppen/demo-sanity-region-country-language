/**
 * Ask the Knowledge Base directly, without a workflow:
 *
 *   npm run kb:ask -- "Can I return a parcel after 40 days?"
 */
import {askKnowledgeBase} from '../lib/kb.ts'

const question = process.argv.slice(2).join(' ').trim()
if (!question) {
  console.error('Usage: npm run kb:ask -- "your question"')
  process.exit(1)
}

const result = await askKnowledgeBase(question)
console.log(`\nVerdict: ${result.verdict}\n${result.reason}`)
if (result.answer) console.log(`\nAnswer: ${result.answer}`)
for (const c of result.citations) console.log(`  · ${c.path}: "${c.excerpt}"`)
