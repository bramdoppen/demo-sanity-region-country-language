import {defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons'

export const country = defineType({
  name: 'country',
  title: 'Country',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      validation: (Rule) => Rule.required(),
      options: {source: 'title', maxLength: 96},
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'reference',
      to: [{type: 'region'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'locales',
      title: 'Locales',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'locale'}]}],
      validation: (Rule) => Rule.required(),
    }),
  ],
})
