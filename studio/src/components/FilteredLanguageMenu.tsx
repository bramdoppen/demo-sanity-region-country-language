import {useCallback, useEffect, useRef, useState} from 'react'
import {type ObjectSchemaType, useClient, useEditState} from 'sanity'
import {useRouter} from 'sanity/router'
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Popover,
  Spinner,
  Stack,
  Text,
  TextInput,
  Tooltip,
  useClickOutsideEvent,
} from '@sanity/ui'
import {AddIcon, CheckmarkIcon, SplitVerticalIcon, TranslateIcon} from '@sanity/icons'
import {
  useDocumentInternationalizationContext,
  type Language,
} from '@sanity/document-internationalization'
import {LANGUAGE_FIELD_NAME} from 'sanity-plugin-internationalized-array'
import {uuid} from '@sanity/uuid'

const METADATA_TYPE = 'translation.metadata'
const TRANSLATIONS_ARRAY = 'translations'

interface TranslationRef {
  value?: {_ref?: string}
  [key: string]: unknown
}

interface MetadataDoc {
  _id: string
  _createdAt?: string
  translations: TranslationRef[]
}

function createReference(
  language: string,
  ref: string,
  typeName: string,
  strengthenOnPublish: boolean,
) {
  return {
    [LANGUAGE_FIELD_NAME]: language,
    _type: 'internationalizedArrayReferenceValue',
    value: {
      _type: 'reference',
      _ref: ref,
      ...(strengthenOnPublish
        ? {
            _weak: true,
            _strengthenOnPublish: {
              type: typeName,
              template: {id: typeName},
            },
          }
        : {}),
    },
  }
}

function removeExcludedFields(
  doc: Record<string, unknown>,
  schemaType: ObjectSchemaType,
): Record<string, unknown> {
  const result = {...doc}
  for (const field of schemaType.fields) {
    const opts = (field.type as {options?: {documentInternationalization?: {exclude?: boolean}}})
      ?.options?.documentInternationalization
    if (opts?.exclude) {
      delete result[field.name]
    }
  }
  return result
}

interface FilteredLanguageMenuProps {
  schemaType: ObjectSchemaType
  documentId: string
}

export function FilteredLanguageMenu({documentId, schemaType}: FilteredLanguageMenuProps) {
  const {supportedLanguages, languageField, weakReferences, callback, apiVersion} =
    useDocumentInternationalizationContext()

  const client = useClient({apiVersion: apiVersion || '2024-01-01'})
  const {draft, published} = useEditState(documentId, schemaType.name)
  const source = draft || published
  const router = useRouter()

  const sourceLocale =
    typeof source?.[languageField] === 'string' ? (source[languageField] as string) : undefined

  const countryPrefix = sourceLocale ? sourceLocale.split('_')[0] : undefined

  const filteredLanguages = countryPrefix
    ? supportedLanguages.filter((lang) => lang.id.startsWith(`${countryPrefix}_`))
    : supportedLanguages

  const [metadata, setMetadata] = useState<MetadataDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const stableMetadataId = useRef(uuid())
  const metadataId = metadata?._id || stableMetadataId.current

  useEffect(() => {
    const docId = documentId.replace(/^drafts\./, '')
    const query = `*[_type == "translation.metadata" && references($docId)][0]{
      _id, _createdAt,
      translations[]{ language, value { _ref, _weak } }
    }`
    const params = {docId}

    let cancelled = false

    client
      .fetch<MetadataDoc | null>(query, params)
      .then((result) => {
        if (!cancelled) {
          setMetadata(result)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setFetchError(true)
        }
      })

    const sub = client
      .listen(query, params, {visibility: 'query'})
      .subscribe({
        next: () => {
          client.fetch<MetadataDoc | null>(query, params).then((result) => {
            if (!cancelled) setMetadata(result)
          })
        },
      })

    return () => {
      cancelled = true
      sub.unsubscribe()
    }
  }, [client, documentId])

  const [searchQuery, setSearchQuery] = useState('')
  const [creating, setCreating] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useClickOutsideEvent(
    () => setOpen(false),
    () => [buttonRef.current, popoverRef.current],
  )

  const navigateToDocument = useCallback(
    (id: string) => {
      const r = router as unknown as Record<string, unknown>
      if (typeof r.navigateIntent === 'function') {
        r.navigateIntent('edit', {id, type: schemaType.name})
      } else if (typeof r.resolveIntentLink === 'function') {
        const url = (
          r.resolveIntentLink as (
            intent: string,
            params: Record<string, string>,
          ) => string
        )('edit', {id, type: schemaType.name})
        if (typeof r.navigateUrl === 'function') {
          ;(r.navigateUrl as (url: string) => void)(url)
        }
      }
    },
    [router, schemaType.name],
  )

  const handleCreate = useCallback(
    async (language: Language) => {
      if (!source || !sourceLocale) return
      setCreating(language.id)
      try {
        const tx = client.transaction()
        const newDocId = uuid()

        let newDoc: Record<string, unknown> = {
          ...source,
          _id: `drafts.${newDocId}`,
          _type: schemaType.name,
          [languageField]: language.id,
        }
        delete newDoc._rev
        delete newDoc._updatedAt
        delete newDoc._createdAt
        newDoc = removeExcludedFields(newDoc, schemaType)
        tx.create(newDoc as Parameters<typeof tx.create>[0])

        const sourceRef = createReference(
          sourceLocale,
          documentId,
          schemaType.name,
          !weakReferences,
        )
        const newRef = createReference(language.id, newDocId, schemaType.name, !weakReferences)

        tx.createIfNotExists({
          _id: metadataId,
          _type: METADATA_TYPE,
          schemaTypes: [schemaType.name],
          [TRANSLATIONS_ARRAY]: [sourceRef],
        })

        tx.patch(metadataId, (patch) =>
          patch
            .setIfMissing({[TRANSLATIONS_ARRAY]: [sourceRef]})
            .insert('after', `${TRANSLATIONS_ARRAY}[-1]`, [newRef]),
        )

        await tx.commit()

        if (callback) {
          await callback({
            client,
            sourceLanguageId: sourceLocale,
            sourceDocument: source as Parameters<typeof callback>[0]['sourceDocument'],
            newDocument: newDoc as Parameters<typeof callback>[0]['newDocument'],
            destinationLanguageId: language.id,
            metaDocumentId: metadataId,
          })
        }

        navigateToDocument(newDocId)
      } catch (err) {
        console.error('Error creating translation:', err)
      } finally {
        setCreating(null)
      }
    },
    [
      source,
      sourceLocale,
      client,
      languageField,
      weakReferences,
      schemaType,
      documentId,
      metadataId,
      callback,
      navigateToDocument,
    ],
  )

  const displayLanguages = filteredLanguages.filter((lang) =>
    searchQuery ? lang.title.toLowerCase().includes(searchQuery.toLowerCase()) : true,
  )

  const popoverContent = (
    <Box padding={1}>
      {fetchError ? (
        <Card tone="critical" padding={3}>
          <Text size={1}>Error loading translation metadata.</Text>
        </Card>
      ) : !sourceLocale ? (
        <Box padding={3}>
          <Text muted size={1}>
            Save this document first to enable translations.
          </Text>
        </Box>
      ) : (
        <Stack space={1}>
          {displayLanguages.length > 4 && (
            <TextInput
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.currentTarget.value)
              }
              value={searchQuery}
              placeholder="Filter languages"
            />
          )}
          {loading ? (
            <Flex padding={3} justify="center">
              <Spinner />
            </Flex>
          ) : (
            <>
              {displayLanguages.map((language) => {
                const isCurrent = language.id === sourceLocale
                const translation = metadata?.translations?.find(
                  (t) => t[LANGUAGE_FIELD_NAME] === language.id,
                )
                const existingRef = translation?.value?._ref
                const isCreating = creating === language.id

                const message = isCurrent
                  ? 'Current document'
                  : existingRef
                    ? `Open ${language.title}`
                    : `Create new ${language.title} translation`

                return (
                  <Tooltip
                    key={language.id}
                    animate
                    content={
                      <Box padding={2}>
                        <Text muted size={1}>
                          {message}
                        </Text>
                      </Box>
                    }
                    placement="top"
                    portal
                  >
                    <Button
                      onClick={() => {
                        if (isCurrent) return
                        if (existingRef) navigateToDocument(existingRef)
                        else handleCreate(language)
                      }}
                      mode={isCurrent ? 'default' : 'bleed'}
                      disabled={isCurrent || isCreating || loading}
                    >
                      <Flex gap={3} align="center">
                        {isCreating ? (
                          <Spinner />
                        ) : (
                          <Text size={2}>
                            {isCurrent ? (
                              <CheckmarkIcon />
                            ) : existingRef ? (
                              <SplitVerticalIcon />
                            ) : (
                              <AddIcon />
                            )}
                          </Text>
                        )}
                        <Box flex={1}>
                          <Text>{language.title}</Text>
                        </Box>
                        <Badge tone={isCurrent ? 'default' : 'primary'}>{language.id}</Badge>
                      </Flex>
                    </Button>
                  </Tooltip>
                )
              })}
              {displayLanguages.length === 0 && (
                <Card padding={3}>
                  <Text muted size={1}>
                    No languages available for this country.
                  </Text>
                </Card>
              )}
            </>
          )}
        </Stack>
      )}
    </Box>
  )

  return (
    <Popover
      animate
      constrainSize
      content={popoverContent}
      open={open}
      portal
      ref={popoverRef}
      overflow="auto"
      tone="default"
    >
      <Button
        text="Translations"
        mode="bleed"
        disabled={!source}
        icon={TranslateIcon}
        onClick={() => setOpen((o) => !o)}
        ref={buttonRef}
        selected={open}
      />
    </Popover>
  )
}
