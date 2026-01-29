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

      // ✅ THIS is the correct hook for TREE mode
      onEvent: (node, event) => {
        // debug — inspect what the editor sends
        console.log('jsoneditor onEvent:', { node, event })

        if (!node) return

        try {
          // Preferred: use node.getValue() (returns the full JSON subtree for that node)
          let selected: any = undefined
          if (typeof (node as any).getValue === 'function') {
            selected = (node as any).getValue()
          }

          // Fallback: if node.path exists, traverse the editor's root JSON to that path
          if (selected === undefined && (node as any).path && editorRef.current) {
            const root = editorRef.current.get()
            const path = (node as any).path as Array<string | number>
            selected = path.reduce(
              (acc: any, key) => (acc != null ? acc[key as any] : undefined),
              root
            )
          }

          // Last fallback: use node.value if it's an object/primitive
          if (selected === undefined && (node as any).value !== undefined) {
            selected = (node as any).value
          }

          // If nothing found, pass the raw node so the caller can inspect it
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
    <div className="flex flex-col h-full border rounded bg-white">
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 text-sm font-semibold">
          <span>{title}</span>
          {headerAction}
        </div>
      )}
      <div ref={ref} className="flex-1 overflow-auto" />
    </div>
  )
}
