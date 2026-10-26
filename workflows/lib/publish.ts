import type {SanityClient} from '@sanity/client'

/** Publish a draft if one exists. Safe to call repeatedly. */
export async function publishDocument(client: SanityClient, id: string): Promise<void> {
  const publishedId = id.replace(/^drafts\./, '')
  const draftId = `drafts.${publishedId}`
  const state = await client.fetch<{draft?: {_rev: string}; published?: {_id: string}}>(
    `{"draft": *[_id == $draftId][0]{_rev}, "published": *[_id == $publishedId][0]{_id}}`,
    {draftId, publishedId},
  )
  if (!state.draft) {
    if (state.published) return
    throw new Error(`No draft or published document for ${publishedId}`)
  }
  try {
    await client.action({
      actionType: 'sanity.action.document.publish',
      draftId,
      publishedId,
      ifDraftRevisionId: state.draft._rev,
    })
  } catch (error) {
    const after = await client.fetch(`*[_id == $draftId][0]._id`, {draftId})
    if (after) throw error
  }
}
