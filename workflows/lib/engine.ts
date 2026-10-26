import {createClient} from '@sanity/client'
import {
  createEngine,
  ENGINE_API_VERSION,
  WORKFLOW_INSTANCE_TYPE,
  type ParsedGdr,
} from '@sanity/workflow-engine'
import {effectHandlers} from '../effects/index.ts'
import {content, DATASET, PARTITION, PROJECT_ID, WORKFLOW_DATASET} from './env.ts'

const workflowClient = createClient({
  projectId: PROJECT_ID,
  dataset: WORKFLOW_DATASET,
  apiVersion: ENGINE_API_VERSION,
  token: process.env.SANITY_EDITOR_TOKEN,
  useCdn: false,
})

export const engine = createEngine({
  client: workflowClient,
  workflowResource: {type: 'dataset', id: `${PROJECT_ID}.${WORKFLOW_DATASET}`},
  partition: PARTITION,
  effects: {handlers: effectHandlers},
  resourceClients: (parsed: ParsedGdr) =>
    parsed.scheme === 'dataset' && parsed.dataset === DATASET ? content : undefined,
})

export type InstanceSummary = {
  _id: string
  definition: string
  stage: string
  pending: string[] | null
}

/** Every in-flight instance in the demo partition, oldest first. */
export async function activeInstances(): Promise<InstanceSummary[]> {
  return workflowClient.fetch<InstanceSummary[]>(
    `*[_type == $type && tag == $partition && !defined(completedAt) && !defined(abortedAt)] | order(_createdAt asc){
      _id, definition, "stage": currentStage, "pending": pendingEffects[].name
    }`,
    {type: WORKFLOW_INSTANCE_TYPE, partition: PARTITION},
  )
}

export {workflowClient}
