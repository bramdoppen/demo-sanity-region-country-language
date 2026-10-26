import {defineField, defineType} from 'sanity'
import {TranslateIcon} from '@sanity/icons/Translate'
import {UserSelectInput} from '../../components/UserSelectInput'

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
    defineField({
      name: 'reviewers',
      title: 'Reviewers',
      description: 'People who review translations into this language in the Question Desk.',
      type: 'array',
      of: [{type: 'string', components: {input: UserSelectInput}}],
      validation: (Rule) => Rule.unique(),
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
