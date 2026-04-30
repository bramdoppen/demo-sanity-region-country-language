import {useCallback, useEffect, useRef, useState} from 'react'
import {set, unset, useClient, useFormValue, type StringInputProps} from 'sanity'
import {Badge, Box, Card, Flex, Text} from '@sanity/ui'

const API_VERSION = '2024-01-01'

export function ComputedLanguageInput(props: StringInputProps) {
  const {onChange, value} = props

  const countryRef = useFormValue(['country', '_ref']) as string | undefined
  const localeRef = useFormValue(['locale', '_ref']) as string | undefined

  const client = useClient({apiVersion: API_VERSION})
  const [computed, setComputed] = useState<string | null>(null)
  const prevRefs = useRef({countryRef: '', localeRef: ''})

  const computeLanguage = useCallback(async () => {
    if (!countryRef || !localeRef) {
      setComputed(null)
      return
    }

    if (
      prevRefs.current.countryRef === countryRef &&
      prevRefs.current.localeRef === localeRef
    ) {
      return
    }
    prevRefs.current = {countryRef, localeRef}

    const result = await client.fetch<{countrySlug: string; localeId: string} | null>(
      `{
        "countrySlug": *[_type == "country" && _id == $countryRef][0].slug.current,
        "localeId": *[_type == "locale" && _id == $localeRef][0].localeId
      }`,
      {countryRef, localeRef},
    )

    if (result?.countrySlug && result?.localeId) {
      const lang = `${result.localeId}-${result.countrySlug}`
      setComputed(lang)
      if (lang !== value) {
        onChange(set(lang))
      }
    }
  }, [countryRef, localeRef, client, onChange, value])

  useEffect(() => {
    computeLanguage()
  }, [computeLanguage])

  if (!countryRef && !localeRef && value) {
    return (
      <Card padding={3} radius={2} tone="primary">
        <Flex align="center" gap={3}>
          <Text size={1} muted>
            Language
          </Text>
          <Badge tone="primary" fontSize={1}>
            {value}
          </Badge>
        </Flex>
      </Card>
    )
  }

  if (!countryRef || !localeRef) {
    return (
      <Card padding={3} radius={2} tone="caution">
        <Text size={1} muted>
          Select country and locale above to compute language.
        </Text>
      </Card>
    )
  }

  return (
    <Card padding={3} radius={2} tone="positive">
      <Flex align="center" gap={3}>
        <Text size={1} muted>
          Language
        </Text>
        <Badge tone="positive" fontSize={1}>
          {computed || value || 'Computing…'}
        </Badge>
      </Flex>
    </Card>
  )
}
