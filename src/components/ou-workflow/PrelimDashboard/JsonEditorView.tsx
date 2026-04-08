import { useEffect, useRef } from 'react'
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'

type Props = {
  value: any
  title?: string
  onSelect?: (nodeValue: any) => void
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
      onEvent: (node: any, event: any) => {
        void event
        if (!node) return

        try {
          let selected: any = undefined
          if (typeof (node as any).getValue === 'function') {
            selected = (node as any).getValue()
          }

          if (selected === undefined && (node as any).path && editorRef.current) {
            const root = editorRef.current.get()
            const path = (node as any).path as Array<string | number>
            selected = path.reduce(
              (acc: any, key) => (acc != null ? acc[key as any] : undefined),
              root,
            )
          }

          if (selected === undefined && (node as any).value !== undefined) {
            selected = (node as any).value
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
    <div className="flex flex-col h-full border rounded bg-white min-h-0">
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 text-sm font-semibold">
          <span>{title}</span>
          {headerAction}
        </div>
      )}
      <div ref={ref} className="flex-1 overflow-auto min-h-0" />
    </div>
  )
}
