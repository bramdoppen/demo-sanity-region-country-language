import type {Metadata} from 'next'
import Head from 'next/head'
import {draftMode} from 'next/headers'
import {Suspense} from 'react'

import PageBuilderPage from '@/app/components/PageBuilder'
import {
  getDynamicFetchOptions,
  sanityFetch,
  sanityFetchMetadata,
  sanityFetchStaticParams,
  type DynamicFetchOptions,
} from '@/sanity/lib/live'
import {getPageQuery, pagesSlugs} from '@/sanity/lib/queries'
import {GetPageQueryResult} from '@/sanity.types'
import {PageOnboarding} from '@/app/components/Onboarding'

type Props = {
  params: Promise<{slug: string}>
}

/**
 * Generate the static params for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
 */
export async function generateStaticParams() {
  const {data} = await sanityFetchStaticParams({query: pagesSlugs})
  // Cache Components requires at least one param, the placeholder renders the onboarding
  return data.length > 0 ? data : [{slug: '__placeholder__'}]
}

/**
 * Generate metadata for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const [params, {perspective}] = await Promise.all([props.params, getDynamicFetchOptions()])
  const {data: page} = await sanityFetchMetadata({query: getPageQuery, params, perspective})

  return {
    title: page?.name,
    description: page?.heading,
  } satisfies Metadata
}

export default async function Page(props: Props) {
  const {isEnabled: isDraftMode} = await draftMode()
  if (isDraftMode) {
    return (
      <Suspense>
        <DynamicPage params={props.params} />
      </Suspense>
    )
  }
  const {slug} = await props.params
  return <CachedPage slug={slug} perspective="published" stega={false} />
}

async function DynamicPage({params}: Props) {
  const [{slug}, {perspective, stega}] = await Promise.all([params, getDynamicFetchOptions()])
  return <CachedPage slug={slug} perspective={perspective} stega={stega} />
}

async function CachedPage({slug, perspective, stega}: {slug: string} & DynamicFetchOptions) {
  'use cache'
  const {data: page} = await sanityFetch({query: getPageQuery, params: {slug}, perspective, stega})

  if (!page?._id) {
    return (
      <div className="py-40">
        <PageOnboarding />
      </div>
    )
  }

  return (
    <div className="my-12 lg:my-24">
      <Head>
        <title>{page.heading}</title>
      </Head>
      <div className="">
        <div className="container">
          <div className="pb-6 border-b border-gray-100">
            <div className="max-w-3xl">
              <h1 className="text-4xl text-gray-900 sm:text-5xl lg:text-7xl">{page.heading}</h1>
              <p className="mt-4 text-base lg:text-lg leading-relaxed text-gray-600 uppercase font-light">
                {page.subheading}
              </p>
            </div>
          </div>
        </div>
      </div>
      <PageBuilderPage page={page as GetPageQueryResult} />
    </div>
  )
}
