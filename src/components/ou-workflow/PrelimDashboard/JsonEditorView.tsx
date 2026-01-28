// components/ou-workflow/PrelimDashboard/JsonEditorView.tsx
import { useEffect, useRef } from 'react';
import JSONEditor from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';

type Props = {
  value: any;
  mode: 'view' | 'tree' | 'diff';
  compareWith?: any;
  onChange?: (val: any) => void;
  title?: string;
};

export function JsonEditorView({
  value,
  mode,
  compareWith,
  onChange,
  title,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const editorRef = useRef<JSONEditor | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    editorRef.current = new JSONEditor(ref.current, {
      mode: mode === 'tree' ? 'tree' : mode,
      modes: ['view', 'tree', 'code'],
      search: true,
      navigationBar: true,
      statusBar: false,

      onChange: () => {
        try {
          const json = editorRef.current?.get();
          if (json !== undefined) {
            onChange?.(json);
          }
        } catch {
          // Ignore invalid JSON while typing
        }
      },
    });

    if (mode === 'diff' && compareWith) {
      editorRef.current.set({ json: compareWith }, { json: value });
    } else if (value !== null && value !== undefined) {
      editorRef.current.set(value);
    }

    return () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [mode]);

  return (
    <div className="flex flex-col h-full border rounded bg-white">
      {/* ✅ Header */}
      {title && (
        <div className="px-3 py-2 border-b bg-gray-50 text-sm font-semibold text-gray-700">
          {title}
        </div>
      )}

      {/* ✅ Editor */}
      <div ref={ref} className="flex-1 overflow-auto" />
    </div>
  );
}
