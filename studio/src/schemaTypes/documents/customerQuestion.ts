import {defineArrayMember, defineField, defineType} from 'sanity'
import {CommentIcon} from '@sanity/icons/Comment'
import {languageOptions, languageTitle} from '../../translation/languages'

export const QUESTION_STATUSES = [
  {value: 'new', title: 'New'},
  {value: 'checking', title: 'Checking'},
  {value: 'answered', title: 'Already answered'},
  {value: 'findings', title: 'Findings'},
  {value: 'in-review', title: 'In review'},
  {value: 'published', title: 'Published'},
]

export const customerQuestion = defineType({
  name: 'customerQuestion',
  title: 'Customer question',
  type: 'document',
  icon: CommentIcon,
  groups: [
    {name: 'question', title: 'Question', default: true},
    {name: 'findings', title: 'Findings'},
  ],
  fields: [
    defineField({
      name: 'questionText',
      title: 'Question',
      type: 'text',
      rows: 3,
      group: 'question',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'channel',
      title: 'Channel',
      type: 'string',
      group: 'question',
      options: {
        list: [
          {value: 'chatbot', title: 'Chatbot'},
          {value: 'contactCentre', title: 'Contact centre'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({name: 'market', title: 'Market', type: 'string', group: 'question'}),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      group: 'question',
      options: {list: languageOptions},
    }),
    defineField({name: 'receivedAt', title: 'Received at', type: 'datetime', group: 'question'}),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'question',
      readOnly: true,
      initialValue: 'new',
      options: {list: QUESTION_STATUSES},
      description: 'Kept in step with the "Question to FAQ" workflow.',
    }),
    defineField({
      name: 'insights',
      title: 'From Insights',
      type: 'object',
      group: 'question',
      readOnly: true,
      description:
        'Set when the question came from a chat conversation that Insights flagged as a content gap.',
      hidden: ({value}) => !value,
      fields: [
        defineField({name: 'contentGap', title: 'Content gap', type: 'string'}),
        defineField({name: 'successScore', title: 'Success score (1–10)', type: 'number'}),
        defineField({name: 'sentiment', type: 'string'}),
        defineField({name: 'threadId', title: 'Conversation', type: 'string'}),
      ],
    }),
    defineField({
      name: 'signals',
      title: 'Signals',
      type: 'object',
      group: 'findings',
      readOnly: true,
      fields: [
        defineField({name: 'intent', title: 'What was asked', type: 'string'}),
        defineField({name: 'topic', type: 'string'}),
        defineField({name: 'brand', type: 'string'}),
        defineField({name: 'market', type: 'string'}),
        defineField({name: 'language', type: 'string'}),
      ],
    }),
    defineField({
      name: 'kbVerdict',
      title: 'Knowledge Base verdict',
      type: 'string',
      group: 'findings',
      readOnly: true,
      options: {list: ['answered', 'outdated', 'missing']},
    }),
    defineField({
      name: 'kbReason',
      title: 'Verdict reason',
      type: 'text',
      rows: 2,
      group: 'findings',
      readOnly: true,
    }),
    defineField({
      name: 'kbAnswer',
      title: 'Answer from the Knowledge Base',
      type: 'text',
      rows: 3,
      group: 'findings',
      readOnly: true,
    }),
    defineField({
      name: 'citations',
      title: 'Citations',
      type: 'array',
      group: 'findings',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'citation',
          fields: [
            defineField({name: 'path', title: 'Entry', type: 'string'}),
            defineField({name: 'excerpt', type: 'text', rows: 2}),
          ],
          preview: {select: {title: 'path', subtitle: 'excerpt'}},
        }),
      ],
    }),
    defineField({
      name: 'draftFaq',
      title: 'Drafted FAQ change',
      type: 'reference',
      to: [{type: 'faq'}],
      group: 'findings',
      readOnly: true,
      weak: true,
    }),
    defineField({
      name: 'faqBefore',
      title: 'FAQ answer before',
      type: 'text',
      rows: 3,
      group: 'findings',
      readOnly: true,
    }),
    defineField({
      name: 'faqAfter',
      title: 'FAQ answer after',
      type: 'text',
      rows: 3,
      group: 'findings',
      readOnly: true,
    }),
    defineField({name: 'demoRun', type: 'boolean', hidden: true}),
  ],
  preview: {
    select: {title: 'questionText', channel: 'channel', language: 'language', verdict: 'kbVerdict'},
    prepare: ({title, channel, language, verdict}) => ({
      title,
      subtitle: [
        channel === 'contactCentre' ? 'Contact centre' : 'Chatbot',
        languageTitle(language),
        verdict,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
