/**
 * Bulk translate English FAQs with the brand guidelines and glossary from Studio.
 *
 *   npm run translate                         every English FAQ missing a translation
 *   npm run translate -- --id paxon-faq-returns --lang fr
 *   npm run translate -- --all --publish      re-translate everything and publish
 */
import {parseArgs} from 'node:util'
import {content} from '../lib/env.ts'
import {publishDocument} from '../lib/publish.ts'
import {TARGET_LANGUAGES} from '../../studio/src/translation/languages.ts'
import {translateFaq} from '../../studio/src/translation/translateFaq.ts'

const {values} = parseArgs({
  options: {
    id: {type: 'string'},
    lang: {type: 'string'},
    all: {type: 'boolean', default: false},
    publish: {type: 'boolean', default: false},
  },
})

const languages = values.lang ? [values.lang] : TARGET_LANGUAGES.map((l) => l.id)

const jobs: {sourceId: string; language: string}[] = []
for (const language of languages) {
  const ids = await content.fetch<string[]>(
    `*[_type == "faq" && language == "en" && !(_id in path("drafts.**"))
      && ($id == null || _id == $id)
      && ($all || !(_id in *[_type == "faq" && language == $language].sourceFaq._ref))
    ]._id`,
    {id: values.id ?? null, all: values.all || Boolean(values.id), language},
  )
  jobs.push(...ids.map((sourceId) => ({sourceId, language})))
}

if (!jobs.length) {
  console.log('Nothing to translate: every English FAQ has its translations.')
  process.exit(0)
}

console.log(`Translating ${jobs.length} FAQ version(s) with the Paxon brand guidelines…`)
for (const job of jobs) {
  const draftId = await translateFaq(content, job)
  if (values.publish) await publishDocument(content, draftId)
  console.log(`  ✓ ${job.sourceId} → ${job.language}${values.publish ? ' (published)' : ' (draft)'}`)
}
