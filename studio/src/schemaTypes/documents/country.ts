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
  preview: {
    select: {
      title: 'title',
      locale0Title: 'locales.0.title',
      locale1Title: 'locales.1.title',
      locale2Title: 'locales.2.title',
      locale3Title: 'locales.3.title',
      locale4Title: 'locales.4.title',
      locale5Title: 'locales.5.title',
    },
    prepare(selection) {
      const { title } = selection
      const locales = [
        selection.locale0Title,
        selection.locale1Title,
        selection.locale2Title,
        selection.locale3Title,
        selection.locale4Title,
        selection.locale5Title,
      ].filter(Boolean)

      return {
        title,
        subtitle: `Languages: ${locales.join(' | ')}`,
      }
    },
  },
})
