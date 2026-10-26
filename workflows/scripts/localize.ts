/**
 * Start "Translate and review FAQ" for an English FAQ (the same as starting it in Studio).
 *
 *   npm run localize -- paxon-faq-kitting
 */
import {refDataset} from '@sanity/workflow-engine'
import {engine} from '../lib/engine.ts'
import {DATASET, PROJECT_ID} from '../lib/env.ts'

const faqId = process.argv[2]
if (!faqId) {
  console.error('Usage: npm run localize -- <english faq id>')
  process.exit(1)
}

const started = await engine.startInstance({
  definition: 'faq-localization',
  initialFields: [
    {type: 'subject', name: 'subject', value: refDataset({projectId: PROJECT_ID, dataset: DATASET, documentId: faqId, type: 'faq'})},
  ],
})
await engine.fireAction({instanceId: started.instance._id, activity: 'source-ready', action: 'ready'})
console.log(`Translating ${faqId} into NL, FR and DE. The drainer picks it up from here.`)
