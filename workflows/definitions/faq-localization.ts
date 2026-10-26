import {defineField, defineStage, defineWorkflow} from '@sanity/workflow-engine/define'

export const LANGUAGE_ROWS = '[{"_key": "nl"}, {"_key": "fr"}, {"_key": "de"}]'

const inCohort = "$subworkflows[activity == 'translate' && current]"

/** Workflow 1: an English FAQ change, translated and reviewed per language, then published. */
export const faqLocalization = defineWorkflow({
  name: 'faq-localization',
  title: 'Translate and review FAQ',
  initialStage: 'create',
  fields: [
    defineField({
      type: 'subject',
      name: 'subject',
      title: 'FAQ',
      types: ['faq'],
      initialValue: {type: 'input'},
      required: true,
    }),
    defineField({type: 'string', name: 'origin', title: 'Started from', initialValue: {type: 'input'}}),
    defineField({type: 'string', name: 'questionInstanceId', title: 'Question workflow', initialValue: {type: 'input'}}),
  ],
  stages: [
    defineStage({
      name: 'create',
      title: 'Create',
      activities: [
        {
          name: 'source-ready',
          title: 'Write the English FAQ',
          actions: [
            {
              name: 'from-question',
              title: 'Drafted from a customer question',
              when: "$fields.origin == 'question'",
              status: 'done',
            },
            {name: 'ready', title: 'Ready to translate', status: 'done'},
          ],
        },
      ],
      transitions: [{name: 'to-translate', to: 'translate', when: '$allActivitiesDone'}],
    }),
    defineStage({
      name: 'translate',
      title: 'Translate',
      activities: [
        {
          name: 'translate',
          title: 'Translate NL, FR and DE',
          actions: [
            {
              name: 'fan-out',
              when: 'true',
              spawn: {
                forEach: LANGUAGE_ROWS,
                definition: {name: 'faq-language'},
                with: {sourceId: '$fields.subject._id', language: '$row._key'},
              },
            },
            {
              name: 'all-approved',
              title: 'Every language approved',
              when: `count(${inCohort}) > 0 && count(${inCohort}[status != 'done']) == 0`,
              status: 'done',
            },
          ],
        },
      ],
      transitions: [{name: 'to-publish', to: 'publish', when: '$allActivitiesDone'}],
    }),
    defineStage({
      name: 'publish',
      title: 'Publish',
      activities: [
        {
          name: 'publish',
          title: 'Publish English and all translations',
          actions: [
            {
              name: 'run',
              when: 'true',
              effects: [
                {
                  name: 'publish-all',
                  bindings: {sourceId: '$fields.subject._id', questionInstanceId: '$fields.questionInstanceId'},
                },
              ],
            },
            {name: 'published', when: "$effectStatus['publish-all'] == 'done'", status: 'done'},
            {name: 'publish-failed', when: "$effectStatus['publish-all'] == 'failed'", status: 'failed'},
          ],
        },
      ],
      transitions: [{name: 'to-published', to: 'published', when: '$allActivitiesDone'}],
    }),
    defineStage({name: 'published', title: 'Published'}),
  ],
})
