import {useState} from 'react'
import {useClient, type DocumentActionComponent} from 'sanity'
import {Box, Button, Checkbox, Flex, Stack, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {TranslateIcon} from '@sanity/icons/Translate'
import {TARGET_LANGUAGES} from './languages'
import {translateFaq} from './translateFaq'

export const TranslateFaqAction: DocumentActionComponent = (props) => {
  const client = useClient({apiVersion: '2025-09-25'})
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string[]>(TARGET_LANGUAGES.map((l) => l.id))

  const doc = (props.draft ?? props.published) as {language?: string} | null
  if (props.type !== 'faq' || doc?.language !== 'en') return null

  const run = async () => {
    setBusy(true)
    try {
      for (const language of selected) {
        await translateFaq(client, {sourceId: props.id, language})
        toast.push({status: 'success', title: `Translated to ${language.toUpperCase()}`})
      }
      setOpen(false)
    } catch (error) {
      toast.push({status: 'error', title: 'Translation failed', description: String(error)})
    } finally {
      setBusy(false)
    }
  }

  return {
    label: busy ? 'Translating…' : 'Translate with Paxon guidelines',
    icon: TranslateIcon,
    disabled: busy || !props.published,
    title: props.published ? undefined : 'Publish the English source first',
    onHandle: () => setOpen(true),
    dialog: open && {
      type: 'dialog',
      header: 'Translate with Paxon guidelines',
      onClose: () => !busy && setOpen(false),
      content: (
        <Stack gap={4}>
          <Text size={1} muted>
            Uses the brand guideline and glossary for each language. Each translation is saved as a
            draft for review.
          </Text>
          <Stack gap={3}>
            {TARGET_LANGUAGES.map((language) => (
              <Flex key={language.id} align="center" gap={3}>
                <Checkbox
                  id={`lang-${language.id}`}
                  checked={selected.includes(language.id)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(language.id)
                        ? current.filter((id) => id !== language.id)
                        : [...current, language.id],
                    )
                  }
                />
                <Box as="label" htmlFor={`lang-${language.id}`}>
                  <Text>{language.title}</Text>
                </Box>
              </Flex>
            ))}
          </Stack>
          <Button
            tone="primary"
            icon={TranslateIcon}
            text={busy ? 'Translating…' : `Translate ${selected.length} language(s)`}
            disabled={busy || selected.length === 0}
            loading={busy}
            onClick={run}
          />
        </Stack>
      ),
    },
  }
}
