import {defineField, defineStage, defineWorkflow} from '@sanity/workflow-engine/define'

const checksDone = "$effectStatus['brand-check'] == 'done' && $effectStatus['consistency-check'] == 'done'"
const anyFlag = "($effects['brand-check'].flagged == true || $effects['consistency-check'].flagged == true)"
const MAX_FIXES = 2

/** One language of an FAQ: translate → automatic checks → fix (when flagged) → review. */
export const faqLanguage = defineWorkflow({
  name: 'faq-language',
  title: 'Translate one language',
  lifecycle: 'child',
  initialStage: 'translate',
  fields: [
    defineField({type: 'string', name: 'sourceId', title: 'English FAQ', initialValue: {type: 'input'}, required: true}),
    defineField({type: 'string', name: 'language', title: 'Language', initialValue: {type: 'input'}, required: true}),
    defineField({type: 'string', name: 'translationId', title: 'Translation'}),
    defineField({type: 'boolean', name: 'needsReview', title: 'Needs a human reviewer'}),
    defineField({type: 'assignee', name: 'reviewer', title: 'Reviewer'}),
    defineField({type: 'text', name: 'reviewNote', title: 'Reviewer note'}),
    defineField({type: 'number', name: 'fixCount', title: 'Fix rounds', initialValue: {type: 'literal', value: 0}}),
    defineField({type: 'string', name: 'decision', title: 'Decision'}),
    defineField({type: 'actor', name: 'approvedBy', title: 'Approved by'}),
  ],
  stages: [
    defineStage({
      name: 'translate',
      title: 'Translate',
      activities: [
        {
          name: 'translate',
          title: 'Translate with the brand guideline',
          actions: [
            {
              name: 'run',
              title: 'Translate',
              when: 'true',
              effects: [
                {
                  name: 'translate-faq',
                  bindings: {sourceId: '$fields.sourceId', language: '$fields.language'},
                  outputs: [{type: 'string', name: 'translationId'}],
                },
              ],
            },
            {name: 'translated', when: "$effectStatus['translate-faq'] == 'done'", status: 'done'},
            {name: 'translate-failed', when: "$effectStatus['translate-faq'] == 'failed'", status: 'failed'},
          ],
        },
      ],
      transitions: [{name: 'to-check', to: 'check', when: '$allActivitiesDone'}],
    }),
    defineStage({
      name: 'check',
      title: 'Automatic check',
      activities: [
        {
          name: 'check',
          title: 'Brand and consistency check',
          actions: [
            {
              name: 'run',
              title: 'Run the checks',
              when: 'true',
              effects: [
                {
                  name: 'brand-check',
                  bindings: {translationId: '$fields.translationId', language: '$fields.language'},
                  outputs: [
                    {type: 'boolean', name: 'flagged'},
                    {type: 'string', name: 'reason'},
                  ],
                },
                {
                  name: 'consistency-check',
                  bindings: {
                    sourceId: '$fields.sourceId',
                    translationId: '$fields.translationId',
                    language: '$fields.language',
                  },
                  outputs: [
                    {type: 'boolean', name: 'flagged'},
                    {type: 'string', name: 'reason'},
                  ],
                },
              ],
            },
            {name: 'checked', when: checksDone, status: 'done'},
            {
              name: 'check-failed',
              when: "$effectStatus['brand-check'] == 'failed' || $effectStatus['consistency-check'] == 'failed'",
              status: 'failed',
            },
          ],
        },
      ],
      transitions: [
        {
          name: 'flagged',
          title: 'Flagged: fix it',
          to: 'fix',
          when: `$allActivitiesDone && ${anyFlag} && coalesce($fields.fixCount, 0) < ${MAX_FIXES}`,
        },
        {name: 'passed', title: 'Passed', to: 'review', when: '$allActivitiesDone'},
      ],
    }),
    defineStage({
      name: 'fix',
      title: 'Fix',
      activities: [
        {
          name: 'fix',
          title: 'Fix with AI using the check results',
          actions: [
            {
              name: 'run',
              when: 'true',
              effects: [
                {
                  name: 'ai-fix',
                  bindings: {
                    sourceId: '$fields.sourceId',
                    language: '$fields.language',
                    fixCount: 'coalesce($fields.fixCount, 0)',
                    reviewNote: '$fields.reviewNote',
                    brandFlagged: "$effects['brand-check'].flagged",
                    brandReason: "$effects['brand-check'].reason",
                    consistencyFlagged: "$effects['consistency-check'].flagged",
                    consistencyReason: "$effects['consistency-check'].reason",
                  },
                },
              ],
            },
            {name: 'fixed', when: "$effectStatus['ai-fix'] == 'done'", status: 'done'},
            {name: 'fix-failed', when: "$effectStatus['ai-fix'] == 'failed'", status: 'failed'},
          ],
        },
      ],
      transitions: [{name: 'recheck', title: 'Check again', to: 'check', when: '$allActivitiesDone'}],
    }),
    defineStage({
      name: 'review',
      title: 'Review',
      fields: [],
      activities: [
        {
          name: 'auto-approve',
          title: 'Auto-approve',
          filter: '$fields.needsReview != true',
          actions: [
            {
              name: 'approve',
              when: 'true',
              status: 'done',
              ops: [{type: 'field.set', target: {field: 'decision'}, value: {type: 'literal', value: 'approve'}}],
            },
          ],
        },
        {
          name: 'review',
          title: 'Review the translation',
          filter: '$fields.needsReview == true',
          actions: [
            {
              name: 'approve',
              title: 'Approve',
              status: 'done',
              ops: [
                {type: 'field.set', target: {field: 'decision'}, value: {type: 'literal', value: 'approve'}},
                {type: 'field.set', target: {field: 'approvedBy'}, value: {type: 'actor'}},
              ],
            },
            {
              name: 'send-back',
              title: 'Send back',
              status: 'done',
              params: [{type: 'string', name: 'note', title: 'What should change?', required: true}],
              ops: [
                {type: 'field.set', target: {field: 'decision'}, value: {type: 'literal', value: 'send-back'}},
                {type: 'field.set', target: {field: 'reviewNote'}, value: {type: 'param', param: 'note'}},
              ],
            },
          ],
        },
      ],
      transitions: [
        {name: 'approved', to: 'approved', when: "$allActivitiesDone && $fields.decision == 'approve'"},
        {name: 'sent-back', title: 'Sent back', to: 'fix', when: "$allActivitiesDone && $fields.decision == 'send-back'"},
      ],
    }),
    defineStage({name: 'approved', title: 'Approved'}),
  ],
})
