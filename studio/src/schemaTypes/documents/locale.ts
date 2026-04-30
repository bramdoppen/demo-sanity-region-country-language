import {defineField, defineType} from 'sanity'
import {TranslateIcon} from '@sanity/icons'

export const locale = defineType({
  name: 'locale',
  title: 'Locale',
  type: 'document',
  icon: TranslateIcon,
  fields: [
    defineField({
      name: 'emoji',
      title: 'Icon',
      type: 'string',
      description: 'Emoji icon for this locale, e.g. 🇳🇱 🇫🇷 🇬🇧',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'localeId',
      title: 'ID',
      type: 'string',
      description: 'Locale identifier, e.g. nl, fr, en',
      validation: (Rule) => Rule.required(),
    }),
    
  ],
  preview: {
    select: {title: 'title', subtitle: 'localeId', emoji: 'emoji'},
    prepare({title, subtitle, emoji}) {
      return {
        title: emoji ? `${emoji} ${title}` : title,
        subtitle,
      }
    },
  },
})
