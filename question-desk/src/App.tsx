import {SanityApp, type SanityConfig} from '@sanity/sdk-react'
import {Desk} from './Desk.tsx'
import './desk.css'

const config: SanityConfig[] = [{projectId: 'jitb27qd', dataset: 'production'}]

export default function App() {
  return (
    <SanityApp config={config} fallback={<div className="loading">Loading Question Desk…</div>}>
      <Desk />
    </SanityApp>
  )
}
