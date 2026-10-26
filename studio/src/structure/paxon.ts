import type {StructureBuilder} from 'sanity/structure'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {BookIcon} from '@sanity/icons/Book'
import {TextIcon} from '@sanity/icons/Text'
import {CommentIcon} from '@sanity/icons/Comment'
import {WarningOutlineIcon} from '@sanity/icons/WarningOutline'
import {TranslateIcon} from '@sanity/icons/Translate'
import {ALL_LANGUAGES, TARGET_LANGUAGES} from '../translation/languages'

export function paxonItems(S: StructureBuilder) {
  const faqsByLanguage = S.listItem()
    .id('paxon-faqs')
    .title('FAQs')
    .icon(HelpCircleIcon)
    .child(
      S.list()
        .title('FAQs')
        .items([
          S.listItem()
            .id('paxon-faqs-all')
            .title('All FAQs')
            .child(S.documentTypeList('faq').title('All FAQs')),
          S.divider().title('By language'),
          ...ALL_LANGUAGES.map((language) =>
            S.listItem()
              .id(`paxon-faqs-${language.id}`)
              .title(language.title)
              .icon(TranslateIcon)
              .child(
                S.documentTypeList('faq')
                  .title(`FAQs – ${language.title}`)
                  .filter('_type == "faq" && language == $language')
                  .params({language: language.id})
                  .initialValueTemplates([]),
              ),
          ),
          S.divider().title('Needs attention'),
          ...TARGET_LANGUAGES.map((language) =>
            S.listItem()
              .id(`paxon-faqs-missing-${language.id}`)
              .title(`Missing ${language.title}`)
              .icon(WarningOutlineIcon)
              .child(
                S.documentTypeList('faq')
                  .title(`English FAQs without a ${language.title} translation`)
                  .filter(
                    '_type == "faq" && language == "en" && !(_id in *[_type == "faq" && language == $language].sourceFaq._ref)',
                  )
                  .params({language: language.id})
                  .initialValueTemplates([]),
              ),
          ),
          S.listItem()
            .id('paxon-faqs-stale')
            .title('Stale translations')
            .icon(WarningOutlineIcon)
            .child(
              S.documentTypeList('faq')
                .title('Translations older than their English source')
                .filter(
                  '_type == "faq" && language != "en" && _updatedAt < *[_type == "faq" && _id == ^.sourceFaq._ref][0]._updatedAt',
                )
                .initialValueTemplates([]),
            ),
        ]),
    )

  return [
    S.divider().title('Paxon (demo)'),
    S.listItem()
      .id('paxon-questions')
      .title('Customer questions')
      .icon(CommentIcon)
      .child(S.documentTypeList('customerQuestion').title('Customer questions')),
    faqsByLanguage,
    S.listItem()
      .id('paxon-guidelines')
      .title('Brand guidelines')
      .icon(BookIcon)
      .child(S.documentTypeList('brandGuideline').title('Brand guidelines')),
    S.listItem()
      .id('paxon-glossary')
      .title('Glossary')
      .icon(TextIcon)
      .child(S.documentTypeList('glossaryEntry').title('Glossary')),
  ]
}
