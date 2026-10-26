import {defineArrayMember, defineField, defineType} from 'sanity'
import {TextIcon} from '@sanity/icons/Text'
import {languageOptions} from '../../translation/languages'

export const glossaryEntry = defineType({
  name: 'glossaryEntry',
  title: 'Glossary entry',
  type: 'document',
  icon: TextIcon,
  fields: [
    defineField({
      name: 'term',
      title: 'Term (English)',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {value: 'approved', title: 'Approved'},
          {value: 'forbidden', title: 'Forbidden'},
          {value: 'provisional', title: 'Provisional'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'approved',
    }),
    defineField({
      name: 'doNotTranslate',
      title: 'Do not translate',
      description: 'Keep this term in English in every language (brand and product names).',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'definition',
      title: 'Definition',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'translations',
      title: 'Approved translations',
      type: 'array',
      hidden: ({document}) => Boolean(document?.doNotTranslate),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'glossaryTranslation',
          fields: [
            defineField({
              name: 'language',
              type: 'string',
              options: {list: languageOptions.filter((l) => l.value !== 'en')},
            }),
            defineField({name: 'translation', type: 'string'}),
          ],
          preview: {select: {title: 'translation', subtitle: 'language'}},
        }),
      ],
    }),
  ],
  preview: {
    select: {term: 'term', status: 'status', dnt: 'doNotTranslate'},
    prepare: ({term, status, dnt}) => ({
      title: term,
      subtitle: [status, dnt ? 'do not translate' : null].filter(Boolean).join(' · '),
    }),
  },
})
