import {useToast} from '@sanity/ui'
import {useEffect} from 'react'
import type {LayoutProps} from 'sanity'

interface ToastMessage {
  title: string
  description?: string
  status: 'warning' | 'error' | 'success' | 'info'
}

const pendingToasts: ToastMessage[] = []

export function queueToast(msg: ToastMessage) {
  pendingToasts.push(msg)
}

export function StudioLayout(props: LayoutProps) {
  const toast = useToast()

  useEffect(() => {
    const interval = setInterval(() => {
      while (pendingToasts.length > 0) {
        const msg = pendingToasts.shift()!
        toast.push({
          title: msg.title,
          description: msg.description,
          status: msg.status,
          closable: true,
        })
      }
    }, 500)
    return () => clearInterval(interval)
  }, [toast])

  return props.renderDefault(props)
}
