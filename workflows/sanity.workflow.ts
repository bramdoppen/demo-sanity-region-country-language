import type {WorkflowDeploymentInput} from '@sanity/workflow-engine'
import {defineWorkflowConfig} from '@sanity/workflow-engine/define'
import {faqLanguage} from './definitions/faq-language.ts'
import {faqLocalization} from './definitions/faq-localization.ts'
import {questionToFaq} from './definitions/question-to-faq.ts'

export const demo = {
  name: 'demo',
  partition: 'demo',
  expectedMinReaderModel: 10,
  workflowResource: {type: 'dataset', id: 'jitb27qd.workflows'},
  resourceAliases: [{name: 'content', resource: {type: 'dataset', id: 'jitb27qd.production'}}],
  definitions: [faqLanguage, faqLocalization, questionToFaq],
} satisfies WorkflowDeploymentInput

export default defineWorkflowConfig({deployments: [demo]})
