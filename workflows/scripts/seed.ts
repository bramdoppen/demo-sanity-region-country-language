/**
 * Seeds the Paxon (demo) content into jitb27qd/production.
 *
 *   npm run seed            English content + translations (from cache when available)
 *   npm run seed -- --fresh Re-translate everything with Agent Actions (~36 AI credits)
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {content} from '../lib/env.ts'
import {publishDocument} from '../lib/publish.ts'
import {FAQS, GLOSSARY, GUIDELINES, QUESTIONS} from '../seed/content.ts'
import {TARGET_LANGUAGES} from '../../studio/src/translation/languages.ts'
import {translateFaq, translationId} from '../../studio/src/translation/translateFaq.ts'

const CACHE = fileURLToPath(new URL('../seed/.translations-cache.json', import.meta.url))

type Translation = {_id: string; question: string; answer: string; language: string; sourceFaq: string; topic?: string}

export async function seedBaseContent() {
  const tx = content.transaction()
  for (const g of GUIDELINES) {
    tx.createOrReplace({_type: 'brandGuideline', ...g, useTerms: g.useTerms.map((t, i) => ({_key: `t${i}`, _type: 'termPair', ...t}))})
  }
  for (const g of GLOSSARY) {
    tx.createOrReplace<Record<string, unknown>>({
      _type: 'glossaryEntry',
      ...g,
      translations: (g.translations ?? []).map((t) => ({_key: t.language, _type: 'glossaryTranslation', ...t})),
    })
  }
  for (const f of FAQS) tx.createOrReplace({_type: 'faq', language: 'en', ...f})
  const now = Date.now()
  QUESTIONS.forEach((q, i) => {
    tx.createOrReplace({
      _type: 'customerQuestion',
      ...q,
      status: 'new',
      receivedAt: new Date(now - (QUESTIONS.length - i) * 7 * 60_000).toISOString(),
    })
  })
  await tx.commit()
  console.log(`✓ ${GUIDELINES.length} brand guidelines, ${GLOSSARY.length} glossary entries, ${FAQS.length} English FAQs, ${QUESTIONS.length} customer questions`)
}

async function translateAll(): Promise<Translation[]> {
  const jobs = FAQS.flatMap((f) => TARGET_LANGUAGES.map((l) => ({sourceId: f._id, language: l.id})))
  console.log(`… translating ${jobs.length} FAQ versions with Agent Actions (brand guidelines + glossary applied)`)
  const queue = [...jobs]
  let done = 0
  await Promise.all(
    Array.from({length: 4}, async () => {
      while (queue.length) {
        const job = queue.shift()!
        const draftId = await translateFaq(content, job)
        await publishDocument(content, draftId)
        done++
        console.log(`  ${String(done).padStart(2)}/${jobs.length} ${job.sourceId} → ${job.language}`)
      }
    }),
  )
  const translations = await content.fetch<Translation[]>(
    `*[_type == "faq" && language != "en" && _id in $ids]{_id, question, answer, language, topic, "sourceFaq": sourceFaq._ref}`,
    {ids: jobs.map((j) => translationId(j.sourceId, j.language))},
  )
  writeFileSync(CACHE, JSON.stringify(translations, null, 2))
  return translations
}

export async function restoreTranslations(): Promise<boolean> {
  if (!existsSync(CACHE)) return false
  const translations: Translation[] = JSON.parse(readFileSync(CACHE, 'utf8'))
  const tx = content.transaction()
  for (const t of translations) {
    tx.createOrReplace({
      _id: t._id,
      _type: 'faq',
      question: t.question,
      answer: t.answer,
      language: t.language,
      topic: t.topic,
      sourceFaq: {_type: 'reference', _ref: t.sourceFaq, _weak: true},
    })
  }
  await tx.commit()
  console.log(`✓ ${translations.length} translations restored from cache (no AI credits used)`)
  return true
}

async function main() {
  await seedBaseContent()
  const fresh = process.argv.includes('--fresh')
  if (fresh || !(await restoreTranslations())) await translateAll()
  console.log('Done. Open the Studio → Paxon (demo).')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
