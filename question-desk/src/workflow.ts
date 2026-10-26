import {useMemo} from 'react'
import {useClient} from '@sanity/sdk-react'
import {createEngine, ENGINE_API_VERSION, refDataset, type ParsedGdr} from '@sanity/workflow-engine'

export const PROJECT_ID = 'jitb27qd'
export const DATASET = 'production'
export const WORKFLOW_DATASET = 'workflows'
export const PARTITION = 'demo'
export const WORKFLOW_RESOURCE = {projectId: PROJECT_ID, dataset: WORKFLOW_DATASET}

/**
 * The workflow engine, acting as the signed-in user. Effects are not run here:
 * the drainer picks them up, so the app only fires actions and starts workflows.
 */
export function useEngine() {
  const workflowClient = useClient({apiVersion: ENGINE_API_VERSION, dataset: WORKFLOW_DATASET})
  const contentClient = useClient({apiVersion: '2025-09-25'})
  return useMemo(
    () =>
      createEngine({
        client: workflowClient,
        workflowResource: {type: 'dataset', id: `${PROJECT_ID}.${WORKFLOW_DATASET}`},
        partition: PARTITION,
        effects: {handlers: {}, missingHandler: 'skip'},
        resourceClients: (parsed: ParsedGdr) =>
          parsed.scheme === 'dataset' && parsed.dataset === DATASET ? contentClient : undefined,
      }),
    [workflowClient, contentClient],
  )
}

export type Engine = ReturnType<typeof useEngine>

/** A customer question "lands" and gets checked against the Knowledge Base. */
export async function checkQuestion(engine: Engine, questionId: string) {
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
  await engine.fireAction({instanceId: started.instance._id, activity: 'triage', action: 'check'})
}

export function approve(engine: Engine, instanceId: string) {
  return engine.fireAction({instanceId, activity: 'review', action: 'approve'})
}

export function sendBack(engine: Engine, instanceId: string, note: string) {
  return engine.fireAction({instanceId, activity: 'review', action: 'send-back', params: {note}})
}
