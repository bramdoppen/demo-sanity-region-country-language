import {person} from './documents/person'
import {page} from './documents/page'
import {post} from './documents/post'
import {region} from './documents/region'
import {country} from './documents/country'
import {locale} from './documents/locale'
import {category} from './documents/category'
import {bannerCard} from './documents/bannerCard'
import {promotionsPage} from './documents/promotionsPage'
import {callToAction} from './objects/callToAction'
import {infoSection} from './objects/infoSection'
import {bannerArray} from './documents/bannerArray'
import {settings} from './singletons/settings'
import {link} from './objects/link'
import {blockContent} from './objects/blockContent'
import button from './objects/button'
import {blockContentTextOnly} from './objects/blockContentTextOnly'

export const schemaTypes = [
  settings,
  page,
  post,
  person,
  region,
  country,
  locale,
  category,
  bannerCard,
  promotionsPage,
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  bannerArray,
  link,
]
