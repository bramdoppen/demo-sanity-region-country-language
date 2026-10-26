/**
 * Asks the Paxon help Knowledge Base (served by Context MCP) whether a customer
 * question is already answered, answered with outdated information, or missing.
 */
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {readFileSync} from 'node:fs'
import {content, contextConfig, promptJson} from './env.ts'

export type KbVerdict = 'answered' | 'outdated' | 'missing'
export type Citation = {path: string; excerpt: string}
export type KbResult = {verdict: KbVerdict; reason: string; answer: string; citations: Citation[]}

type Tool = {name: string; inputSchema?: {properties?: Record<string, unknown>}}

const ALIASES: Record<string, string[]> = {
  query: ['query', 'q', 'keywords', 'search', 'text'],
  knowledgeBase: ['knowledgebaseid', 'knowledge_base_id', 'kbid', 'kb', 'knowledgebase', 'id'],
  paths: ['paths', 'entrypaths', 'entry_paths', 'entries'],
}

/** Map our logical arguments onto whatever names the served tool declares. */
function argsFor(tool: Tool | undefined, values: Record<string, unknown>) {
  const props = Object.keys(tool?.inputSchema?.properties ?? {})
  const args: Record<string, unknown> = {}
  for (const [logical, value] of Object.entries(values)) {
    const match = props.find((p) => ALIASES[logical]?.includes(p.toLowerCase()))
    args[match ?? logical] = value
  }
  return args
}

function text(result: unknown): string {
  const content = (result as {content?: {type: string; text?: string}[]}).content ?? []
  return content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
}

/** Rehearsal mode only: when no Context token is set and KB_REHEARSAL=true. */
async function rehearsalEntries(): Promise<string> {
  const faqs = await content.fetch<{_id: string; question: string; answer: string}[]>(
    `*[_type == "faq" && language == "en" && !(_id in path("drafts.**"))]{_id, question, answer}`,
  )
  const legacy = readFileSync(new URL('../seed/legacy-brand-page.md', import.meta.url), 'utf8')
  return [
    ...faqs.map((f) => `## faq/${f._id}\n${f.question}\n${f.answer}`),
    `## files/legacy-brand-page.md\n${legacy}`,
  ].join('\n\n')
}

export const isRehearsal = () =>
  !process.env.SANITY_CONTEXT_TOKEN && process.env.KB_REHEARSAL === 'true'

export async function askKnowledgeBase(question: string): Promise<KbResult> {
  if (isRehearsal()) return classify(question, await rehearsalEntries())
  const {url, token} = contextConfig()
  const client = new Client({name: 'paxon-question-desk', version: '1.0.0'})
  await client.connect(
    new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {headers: {Authorization: `Bearer ${token}`}},
    }),
  )

  try {
    const {tools} = await client.listTools()
    const tool = (name: string) => tools.find((t) => t.name === name) as Tool | undefined

    const outline = text(await client.callTool({name: 'initial_context', arguments: {}}))
    const kbId = outline.match(/\bkb[A-Za-z0-9]+\b/)?.[0]
    if (!kbId)
      throw new Error(
        'Context MCP returned no Knowledge Base. Is a Knowledge Base attached to the MCP endpoint?',
      )

    const search = text(
      await client.callTool({
        name: 'knowledge_base_search',
        arguments: argsFor(tool('knowledge_base_search'), {query: question, knowledgeBase: kbId}),
      }),
    )

    const {paths} = await promptJson<{paths: string[]}>({
      instruction: `Pick up to 5 Knowledge Base entry paths that are most likely to answer the customer question.
Copy paths verbatim from the outline or the search results. Return JSON {"paths": string[]}.
Question: $question
Outline: $outline
Search results: $search`,
      instructionParams: {question, outline, search},
    })

    const entries = paths.length
      ? text(
          await client.callTool({
            name: 'knowledge_base_read',
            arguments: argsFor(tool('knowledge_base_read'), {
              knowledgeBase: kbId,
              paths: paths.slice(0, 20),
            }),
          }),
        )
      : ''

    return await classify(question, entries)
  } finally {
    await client.close()
  }
}

async function classify(question: string, entries: string): Promise<KbResult> {
  return promptJson<KbResult>({
    instruction: `You check whether Paxon's help content answers a customer question.
Classify it as exactly one verdict:
- "answered": the entries answer it and the information is consistent.
- "outdated": the entries answer it, but entries contradict each other or the Knowledge Base flags a conflict (for example an old page with a different number). Prefer the most recent FAQ content as the truth.
- "missing": nothing in the entries answers it.
Return JSON {"verdict", "reason" (one plain sentence for a support lead), "answer" (the correct answer in one or two sentences, empty when missing), "citations": [{"path", "excerpt" (a short quote)}]}.
Only cite paths that appear in the entries below.
Question: $question
Entries: $entries`,
    instructionParams: {question, entries: entries || '(no entries found)'},
  })
}
