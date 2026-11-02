import { asRecord } from '@/shared/api/record'
import { useEffect, useRef } from 'react'
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'

type Props = {
  value: unknown
  title?: string
  onSelect?: (nodeValue: unknown) => void
  headerAction?: React.ReactNode
}

export function JsonEditorView({
  value,
  title,
  onSelect,
  headerAction,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const editorRef = useRef<JSONEditor | null>(null)

  useEffect(() => {
    if (!ref.current) return
    

    editorRef.current = new JSONEditor(ref.current, {
      mode: 'tree',
      modes: ['tree', 'view'],
      search: true,
      navigationBar: true,
      statusBar: false,
      onEvent: (node) => {
        if (!node) return

        try {
          let selected: unknown = undefined
          if (typeof asRecord(node).getValue === 'function') {
            const getValue = asRecord(node).getValue as () => unknown
            selected = getValue.call(node)
          }

          if (selected === undefined && node.path && editorRef.current) {
            const root = editorRef.current.get()
            const path = node.path as Array<string | number>
            selected = path.reduce(
              (acc: unknown, key) => Array.isArray(acc) && typeof key === 'number' ? acc[key] : asRecord(acc)[key],
              root,
            )
          }

          if (selected === undefined && node.value !== undefined) {
            selected = node.value
          }

          if (selected === undefined) selected = node

          onSelect?.(selected)
        } catch {
          /* ignore */
        }
      },
    })

    if (value !== undefined && value !== null) {
      editorRef.current.set(value)
    }

    return () => {
      editorRef.current?.destroy()
      editorRef.current = null
    }
  }, [value, onSelect])

  return (
    <div className="flex h-full min-h-0 flex-col rounded border bg-white">
      {title && (
        <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2 text-sm font-semibold">
          <span>{title}</span>
          {headerAction}
        </div>
      )}
      <div ref={ref} className="min-h-0 flex-1 overflow-auto" />
    </div>
  )
}
