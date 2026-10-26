import {defineArrayMember, defineField, defineType} from 'sanity'
import {BookIcon} from '@sanity/icons/Book'
import {languageOptions, languageTitle} from '../../translation/languages'

export const brandGuideline = defineType({
  name: 'brandGuideline',
  title: 'Brand guideline',
  type: 'document',
  icon: BookIcon,
  description: 'Tone of voice and terminology per language. Used by every AI translation and check.',
  fields: [
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      options: {list: languageOptions, layout: 'radio', direction: 'horizontal'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formality',
      title: 'Formality',
      type: 'string',
      options: {
        list: [
          {value: 'formal', title: 'Formal'},
          {value: 'neutral', title: 'Neutral'},
          {value: 'informal', title: 'Informal'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'neutral',
    }),
    defineField({
      name: 'tone',
      title: 'Tone of voice',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
    }),
    defineField({
      name: 'instructions',
      title: 'Additional instructions',
      type: 'text',
      rows: 4,
      description: 'Plain-language rules, e.g. "Address the customer as vous".',
    }),
    defineField({
      name: 'useTerms',
      title: 'Terms to use',
      description: 'Preferred wording. The AI uses the right-hand term and flags the left-hand one.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'termPair',
          fields: [
            defineField({name: 'avoid', title: 'Avoid', type: 'string'}),
            defineField({name: 'use', title: 'Use instead', type: 'string'}),
          ],
          preview: {
            select: {avoid: 'avoid', use: 'use'},
            prepare: ({avoid, use}) => ({title: `${use ?? ''}`, subtitle: `not "${avoid ?? ''}"`}),
          },
        }),
      ],
    }),
    defineField({
      name: 'requireHumanReview',
      title: 'Always needs a human reviewer',
      description:
        'When on, translations into this language always go to the named reviewer, even when the automatic checks pass.',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {language: 'language', formality: 'formality'},
    prepare: ({language, formality}) => ({
      title: `Brand guideline – ${languageTitle(language)}`,
      subtitle: formality,
    }),
  },
})
