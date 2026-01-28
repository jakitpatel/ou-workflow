// components/JsonViewer.tsx
import { useEffect, useRef } from 'react';
import JSONEditor from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';

export function JsonViewer({ data }: { data: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<JSONEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    editorRef.current = new JSONEditor(containerRef.current, {
      mode: 'view',           // read-only
      search: true,
      navigationBar: true,
      statusBar: false,
    });

    editorRef.current.set(data);

    return () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [data]);

  return <div ref={containerRef} className="h-[65vh]" />;
}
