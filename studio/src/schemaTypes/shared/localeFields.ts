import {defineField} from 'sanity'
import {ComputedLanguageInput} from '../../components/ComputedLanguageInput'

export const localeFields = [
  defineField({
    name: 'country',
    title: 'Country',
    type: 'reference',
    to: [{type: 'country'}],
  }),
  defineField({
    name: 'locale',
    title: 'Locale',
    type: 'reference',
    to: [{type: 'locale'}],
    options: {
      filter: ({document}) => {
        const countryRef = (document as {country?: {_ref?: string}})?.country?._ref
        if (!countryRef) {
          return {filter: 'false'}
        }
        return {
          filter: '_id in *[_type == "country" && _id == $countryRef][0].locales[]._ref',
          params: {countryRef},
        }
      },
    },
  }),
  defineField({
    name: 'language',
    title: 'Language',
    type: 'string',
    readOnly: true,
    components: {
      input: ComputedLanguageInput,
    },
  }),
]
