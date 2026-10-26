import {Suspense} from 'react'
import Link from 'next/link'
import {draftMode} from 'next/headers'
import {PortableText} from '@portabletext/react'

import {settingsQuery} from '@/sanity/lib/queries'
import {getDynamicFetchOptions, sanityFetch, type DynamicFetchOptions} from '@/sanity/lib/live'
import {dataAttr} from '@/sanity/lib/utils'

const CHALLENGES = [
  {
    title: 'Launch products with confidence',
    body: 'We help brands with strong launches, from first stock to first delivery.',
    className: 'bg-paxon-navy text-white',
  },
  {
    title: 'Scale up without interruptions',
    body: 'Fulfillment that grows with your peaks, from Black Friday to the December rush.',
    className: 'bg-paxon-warm text-paxon-navy',
  },
  {
    title: 'Handle regulated products',
    body: 'Temperature-controlled storage and compliant handling for health and beauty.',
    className: 'bg-paxon-blue text-white',
  },
]

export default async function Page() {
  const {isEnabled: isDraftMode} = await draftMode()
  if (isDraftMode) {
    return (
      <Suspense>
        <DynamicPage />
      </Suspense>
    )
  }
  return <CachedPage perspective="published" stega={false} />
}

async function DynamicPage() {
  const {perspective, stega} = await getDynamicFetchOptions()
  return <CachedPage perspective={perspective} stega={stega} />
}

async function CachedPage({perspective, stega}: DynamicFetchOptions) {
  'use cache'
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
    perspective,
    stega,
  })

  return (
    <>
      <section className="relative overflow-hidden bg-paxon-navy">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,#0068ea_0%,transparent_55%),radial-gradient(circle_at_90%_90%,#05c_0%,transparent_45%)] opacity-80" />
        <div className="absolute inset-0 bg-[url(/images/tile-grid-white.png)] bg-size-[24px] opacity-10" />
        <div className="container relative py-20 lg:py-28">
          <div className="max-w-xl bg-paxon-blue p-8 text-white sm:p-12">
            <h1 className="text-4xl leading-tight text-white sm:text-5xl">
              When your business moves forward, your logistics should too
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-white/90 sm:text-base">
              Markets evolve. Customers expect more. Paxon offers logistics solutions for complex
              supply chains with valuable products, so you can optimise your logistics and
              distribution.
            </p>
            <Link href="/help" className="btn-paxon mt-8">
              Ask Paxon help <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-20">
        <h2 className="max-w-3xl text-3xl leading-tight sm:text-4xl">
          Built around real business challenges
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {CHALLENGES.map((card) => (
            <div
              key={card.title}
              className={`flex min-h-64 flex-col justify-between p-8 ${card.className}`}
            >
              <h3 className="text-2xl leading-snug text-inherit">{card.title}</h3>
              <p className="mt-6 text-sm opacity-80">{card.body}</p>
            </div>
          ))}
        </div>
        {settings?.description && (
          <div
            className="prose mt-16 max-w-3xl text-paxon-navy/80"
            data-sanity={dataAttr({
              id: settings._id,
              type: 'settings',
              path: 'description',
            }).toString()}
          >
            <PortableText value={settings.description} />
          </div>
        )}
      </section>
    </>
  )
}
