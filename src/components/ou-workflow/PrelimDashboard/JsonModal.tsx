// components/ou-workflow/PrelimDashboard/JsonModal.tsx
import { useEffect, useState } from 'react';
import { JsonEditorView } from './JsonEditorView';

type Props = {
  open: boolean;
  onClose: () => void;
  data: any;
};

export function JsonModal({ open, onClose, data }: Props) {
  const [mode, setMode] = useState<'view' | 'tree' | 'diff'>('view');
  const [edited, setEdited] = useState<any>(data);

  useEffect(() => {
    if (data) setEdited(data);
  }, [data]);

  if (!open || !data) return null;
  console.log('JsonModal data:', data);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-[85vw] max-h-[85vh] rounded-lg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-lg">Application JSON</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3 border-b pb-2">
          {['view', 'tree', 'diff'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m as any)}
              className={`px-3 py-1 rounded ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100'
              }`}
            >
              {m === 'tree' ? 'Edit' : m === 'diff' ? 'Compare' : 'View'}
            </button>
          ))}
        </div>

       {/* Viewer Grid */}
        <div className="grid grid-cols-3 gap-3 h-[65vh]">
        {/* Viewer 1 */}
        <div className="border rounded overflow-auto">
            <JsonEditorView
            mode={mode === 'tree' ? 'tree' : 'view'}
            value={data}
            title="Preliminary Data"
            />
        </div>

        {/* Viewer 2 */}
        <div className="border rounded overflow-auto">
            <JsonEditorView
            mode={mode === 'tree' ? 'tree' : 'view'}
            value={edited}
            onChange={mode === 'tree' ? setEdited : undefined}
            title="Vector Search Data"
            />
        </div>

        {/* Viewer 3 */}
        <div className="border rounded overflow-auto">
            {mode === 'diff' ? (
            <JsonEditorView
                mode="diff"
                value={edited}
                compareWith={data}
            />
            ) : (
            <JsonEditorView
                mode="view"
                value={edited}
                title="KASH DB Data"
            />
            )}
        </div>
        </div>


        {/* Footer */}
        {mode === 'tree' && (
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setEdited(data)}
              className="px-3 py-1 border rounded"
            >
              Reset
            </button>
            <button
              onClick={() => console.log('SAVE JSON', edited)}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
