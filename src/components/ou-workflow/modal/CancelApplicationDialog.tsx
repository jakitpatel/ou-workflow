import React from 'react';

type CancelApplicationDialogProps = {
  companyName: string;
  reason: string;
  saving: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function CancelApplicationDialog({
  companyName,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
}: CancelApplicationDialogProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Application</h3>
        <p className="text-sm text-gray-700 mb-4">
          Are you sure you want to cancel <span className="font-semibold">{companyName}</span>?
        </p>

        <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-2">
          Reason
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          disabled={saving}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
          placeholder="Enter cancellation reason"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40 transition-colors"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || !reason.trim()}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
