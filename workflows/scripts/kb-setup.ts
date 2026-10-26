/**
 * Creates the Paxon help Knowledge Base and the `paxon-help` MCP endpoint through the API,
 * instead of clicking through the Context app (see KNOWLEDGE_BASE.md). Safe to re-run:
 * existing ones are reused, never replaced.
 *
 *   npm run kb:setup
 */
import {createClient} from '@sanity/client'
import {readFileSync} from 'node:fs'
import {DATASET, ORGANIZATION_ID, PROJECT_ID} from '../lib/env.ts'

const TITLE = 'Paxon help'
const MCP_NAME = 'paxon-help'
const API_VERSION = '2026-08-25'
const FAQ_QUERY = `*[_type == "faq" && !(_id in path("drafts.**"))]{_id, question, answer, topic, language}`

const token = process.env.SANITY_CONTEXT_TOKEN
if (!token) throw new Error('Missing SANITY_CONTEXT_TOKEN in workflows/.env')

const org = createClient({
  apiVersion: API_VERSION,
  token,
  context: {organizationId: ORGANIZATION_ID},
  useCdn: false,
  useProjectHostname: false,
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const {data: existing} = await org.context.knowledgeBases.list({organizationId: ORGANIZATION_ID})
let kbId = existing.find((kb) => kb.title === TITLE)?.publicId
if (kbId) {
  console.log(`Knowledge Base "${TITLE}" already exists (${kbId}).`)
} else {
  const created = await org.context.knowledgeBases.create({
    organizationId: ORGANIZATION_ID,
    title: TITLE,
    description:
      'Customer-facing help for Paxon (demo) webshops and contact-centre agents. Covers fulfillment, returns, transportation, regulated logistics, onboarding and API access, in English, Dutch, French and German.',
  })
  kbId = created.publicId
  console.log(`Created Knowledge Base "${TITLE}" (${kbId}).`)
}

const kb = org.withConfig({resource: {type: 'knowledge-base', id: kbId}})

const {data: imports} = await kb.context.imports.list()
if (!imports.some((i) => i.sourceKind === 'dataset')) {
  await kb.context.imports.create({
    type: 'dataset',
    sanityProjectId: PROJECT_ID,
    sanityDatasetId: DATASET,
    query: FAQ_QUERY,
  })
  console.log(`Added the FAQs from ${PROJECT_ID}.${DATASET} as a dataset source.`)
}
if (!imports.some((i) => i.name === 'Paxon returns – brand page (2023, legacy)')) {
  await kb.context.imports.create({
    type: 'text',
    title: 'Paxon returns – brand page (2023, legacy)',
    content: readFileSync(new URL('../seed/legacy-brand-page.md', import.meta.url), 'utf8'),
  })
  console.log('Added the legacy brand page (45-day returns).')
}

const {jobId} = await kb.context.build()
process.stdout.write('Building the Knowledge Base')
for (;;) {
  await sleep(5000)
  const state = await org.context.knowledgeBases.get(kbId)
  if (!state.isBuilding && state.activeJobId === jobId) break
  process.stdout.write('.')
}
const job = await kb.context.jobs.get({jobId})
const built = await org.context.knowledgeBases.get(kbId)
console.log(`\nBuild ${job.status}. Knowledge Base state: ${built.state}.`)

const endpoint = await org.context.mcpEndpoints.get({name: MCP_NAME})
if (endpoint) {
  console.log(`MCP endpoint "${MCP_NAME}" already exists.`)
} else {
  await org.context.mcpEndpoints.create({
    title: TITLE,
    name: MCP_NAME,
    sources: [{type: 'knowledge-base', id: kbId}],
    instructions: 'Answer only from Paxon help content. Say when the content conflicts.',
  })
  console.log(`Created MCP endpoint "${MCP_NAME}".`)
}
