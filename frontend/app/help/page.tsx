import type {Metadata} from 'next'

import HelpChat from './HelpChat'

export const metadata: Metadata = {title: 'Help'}

export default function HelpPage() {
  return <HelpChat />
}
