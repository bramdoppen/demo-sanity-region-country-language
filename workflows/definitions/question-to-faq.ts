import {defineField, defineStage, defineWorkflow} from '@sanity/workflow-engine/define'

const automatic = (stage: string, title: string, effect: string, outputs: {type: 'string'; name: string}[] = []) =>
  defineStage({
    name: stage,
    title,
    activities: [
      {
        name: stage,
        title,
        actions: [
          {
            name: 'run',
            when: 'true',
            effects: [{name: effect, bindings: {questionId: '$fields.subject._id'}, outputs}],
          },
          {name: 'done', when: `$effectStatus['${effect}'] == 'done'`, status: 'done'},
          {name: 'failed', when: `$effectStatus['${effect}'] == 'failed'`, status: 'failed'},
        ],
      },
    ],
  })

const signal = automatic('signal', 'Extract signals', 'extract-signals')
const check = automatic('check', 'Check the Knowledge Base', 'kb-check', [{type: 'string', name: 'verdict'}])
const findings = automatic('findings', 'Draft the FAQ change', 'draft-faq', [{type: 'string', name: 'faqId'}])

/** Workflow 2: a customer question becomes a better FAQ. */
export const questionToFaq = defineWorkflow({
  name: 'question-to-faq',
  title: 'Question to FAQ',
  initialStage: 'landed',
  fields: [
    defineField({
      type: 'subject',
      name: 'subject',
      title: 'Customer question',
      types: ['customerQuestion'],
      initialValue: {type: 'input'},
      required: true,
    }),
  ],
  stages: [
    defineStage({
      name: 'landed',
      title: 'Question landed',
      activities: [
        {
          name: 'triage',
          title: 'Check this question',
          actions: [{name: 'check', title: 'Check against the Knowledge Base', status: 'done'}],
        },
      ],
      transitions: [{name: 'to-signal', to: 'signal', when: '$allActivitiesDone'}],
    }),
    {...signal, transitions: [{name: 'to-check', to: 'check', when: '$allActivitiesDone'}]},
    {
      ...check,
      transitions: [
        {
          name: 'already-answered',
          title: 'Already answered',
          to: 'answered',
          when: "$allActivitiesDone && $effects['kb-check'].verdict == 'answered'",
        },
        {name: 'gap-found', title: 'Outdated or missing', to: 'findings', when: '$allActivitiesDone'},
      ],
    },
    {...findings, transitions: [{name: 'to-review', to: 'in-review', when: '$allActivitiesDone'}]},
    defineStage({
      name: 'in-review',
      title: 'In review',
      activities: [
        {
          name: 'localize',
          title: 'Hand off to Translate and review',
          actions: [
            {
              name: 'run',
              when: 'true',
              effects: [
                {
                  name: 'start-localization',
                  bindings: {faqId: "$effects['draft-faq'].faqId"},
                },
              ],
            },
            {name: 'started', when: "$effectStatus['start-localization'] == 'done'", status: 'done'},
            {name: 'failed', when: "$effectStatus['start-localization'] == 'failed'", status: 'failed'},
          ],
        },
        {
          name: 'await-publish',
          title: 'Wait until every language is published',
          actions: [{name: 'published', title: 'Published', status: 'done'}],
        },
      ],
      transitions: [{name: 'to-published', to: 'published', when: '$allActivitiesDone'}],
    }),
    defineStage({name: 'answered', title: 'Already answered'}),
    defineStage({name: 'published', title: 'Published'}),
  ],
})
