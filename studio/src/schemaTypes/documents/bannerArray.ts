import {defineArrayMember, defineField, defineType} from 'sanity'
import {InlineElementIcon} from '@sanity/icons'
import {localeFields} from '../shared/localeFields'

export const bannerArray = defineType({
  name: 'bannerArray',
  title: 'Banner Array',
  type: 'document',
  icon: InlineElementIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    ...localeFields,
    defineField({
      name: 'items',
      title: 'Banner Cards',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'bannerCard'}],
        }),
      ],
      validation: (Rule) => Rule.min(1).error('Add at least one banner card'),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      language: 'language',
    },
    prepare({title, language}) {
      return {
        title: title || 'Banner Array',
        subtitle: language || '',
      }
    },
  },
})
