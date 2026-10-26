import {defineField, defineType} from 'sanity'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {languageOptions, languageTitle} from '../../translation/languages'

export const FAQ_TOPICS = [
  {value: 'fulfillment', title: 'Logistics & Fulfillment'},
  {value: 'returns', title: 'Returns'},
  {value: 'transportation', title: 'Transportation'},
  {value: 'regulated', title: 'Specialized & Regulated Logistics'},
  {value: 'commerce', title: 'Commerce Solutions'},
  {value: 'onboarding', title: 'Onboarding'},
  {value: 'api', title: 'API access'},
]

export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      description: 'The customer question, phrased the way a customer would ask it.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'text',
      rows: 6,
      description:
        'A short, factual answer. Keep numbers, time windows and links exactly as they are when translating.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'string',
      options: {list: FAQ_TOPICS},
    }),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      options: {list: languageOptions, layout: 'radio', direction: 'horizontal'},
      initialValue: 'en',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sourceFaq',
      title: 'Source FAQ (English)',
      type: 'reference',
      to: [{type: 'faq'}],
      weak: true,
      description: 'The English source this translation was made from.',
      options: {filter: 'language == "en"'},
      hidden: ({document}) => document?.language === 'en',
    }),
    defineField({
      name: 'relatedQuestion',
      title: 'Triggered by customer question',
      type: 'reference',
      to: [{type: 'customerQuestion'}],
      weak: true,
      readOnly: true,
    }),
    defineField({
      name: 'demoRun',
      title: 'Created during a demo run',
      type: 'boolean',
      hidden: true,
    }),
  ],
  orderings: [
    {name: 'language', title: 'Language', by: [{field: 'language', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'question', language: 'language', topic: 'topic'},
    prepare({title, language, topic}) {
      return {
        title: title || 'Untitled FAQ',
        subtitle: [languageTitle(language), FAQ_TOPICS.find((t) => t.value === topic)?.title]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
