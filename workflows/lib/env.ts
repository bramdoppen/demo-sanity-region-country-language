import {createClient} from '@sanity/client'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} in workflows/.env (see .env.example)`)
  return value
}

export const PROJECT_ID = process.env.SANITY_PROJECT_ID ?? 'jitb27qd'
export const DATASET = process.env.SANITY_DATASET ?? 'production'
export const WORKFLOW_DATASET = process.env.SANITY_WORKFLOW_DATASET ?? 'workflows'
export const ORGANIZATION_ID = process.env.SANITY_ORGANIZATION_ID ?? 'objVdfY4N'
export const PARTITION = 'demo'
export const SCHEMA_ID = '_.schemas.default'

export const REVIEWERS: Record<string, string> = {
  nl: process.env.REVIEWER_NL ?? '',
  fr: process.env.REVIEWER_FR ?? '',
  de: process.env.REVIEWER_DE ?? '',
}

/** Editor client for the content dataset (Agent Actions, seeding, publishing). */
export const content = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2025-09-25',
  token: required('SANITY_EDITOR_TOKEN'),
  useCdn: false,
  perspective: 'raw',
})

export const agent = content.withConfig({apiVersion: 'vX'})

/** Agent Actions prompt with a JSON response. */
export async function promptJson<T = Record<string, unknown>>(request: {
  instruction: string
  instructionParams?: Record<string, string>
}): Promise<T> {
  return (await agent.agent.action.prompt({...request, format: 'json'})) as T
}

export function contextConfig() {
  return {
    token: required('SANITY_CONTEXT_TOKEN'),
    url: required('SANITY_CONTEXT_MCP_URL'),
  }
}
