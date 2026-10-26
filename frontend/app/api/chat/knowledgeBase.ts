import 'server-only'

import {createMCPClient} from '@ai-sdk/mcp'
import type {SanityClient} from '@sanity/client'

type Tool = {name: string; inputSchema?: {properties?: Record<string, unknown>}}

export type ToolStep = {toolName: string; call: string; result: string; error?: string}

const ALIASES: Record<string, string[]> = {
  query: ['query', 'q', 'keywords', 'search', 'text'],
  knowledgeBase: ['knowledgebaseid', 'knowledge_base_id', 'kbid', 'kb', 'knowledgebase', 'id'],
  paths: ['paths', 'entrypaths', 'entry_paths', 'entries'],
}

/** Map logical arguments onto whatever names the served tool declares. */
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

/**
 * Searches the Paxon help Knowledge Base and reads the most relevant entries.
 * Returns the entry text plus each tool step, so the conversation can be recorded for Insights.
 */
export async function lookUp(
  question: string,
  {mcpUrl, token, agent}: {mcpUrl: string; token: string; agent: SanityClient},
): Promise<{entries: string; steps: ToolStep[]}> {
  const mcp = await createMCPClient({
    transport: {type: 'http', url: mcpUrl, headers: {Authorization: `Bearer ${token}`}},
  })
  const steps: ToolStep[] = []
  try {
    const {tools} = await mcp.listTools()
    const tool = (name: string) => tools.find((t) => t.name === name) as Tool | undefined

    const outline = text(await mcp.callTool({name: 'initial_context', arguments: {}}))
    const kbId = outline.match(/\bkb[A-Za-z0-9]+\b/)?.[0]
    if (!kbId) throw new Error('The MCP endpoint has no Knowledge Base attached.')

    const searchArgs = argsFor(tool('knowledge_base_search'), {
      query: question,
      knowledgeBase: kbId,
    })
    const search = text(await mcp.callTool({name: 'knowledge_base_search', arguments: searchArgs}))
    steps.push({
      toolName: 'knowledge_base_search',
      call: JSON.stringify(searchArgs),
      result: search,
    })

    const {paths = []} = (await agent.agent.action.prompt({
      instruction: `Pick up to 5 Knowledge Base entry paths that are most likely to answer the customer question.
Copy paths verbatim from the outline or the search results. Return JSON {"paths": string[]}.
Question: $question
Outline: $outline
Search results: $search`,
      instructionParams: {question, outline, search},
      format: 'json',
    })) as {paths?: string[]}
    if (paths.length === 0) return {entries: '', steps}

    const readArgs = argsFor(tool('knowledge_base_read'), {
      knowledgeBase: kbId,
      paths: paths.slice(0, 5),
    })
    const entries = text(await mcp.callTool({name: 'knowledge_base_read', arguments: readArgs}))
    steps.push({toolName: 'knowledge_base_read', call: JSON.stringify(readArgs), result: entries})
    return {entries, steps}
  } finally {
    await mcp.close()
  }
}
