import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import type { Applicant, Task } from "@/types/application";

type SelectedAction = {
  application: Applicant | Task | any;
  action: Task | any;
};

type Props = {
  showUploadModal: boolean | null | Task;
  selectedAction: SelectedAction | null;
  setShowUploadModal: (val: boolean | null | Task) => void;
  completeTaskWithResult: (action: Task, result: string, status?: string) => void;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export const UploadNdaModal: React.FC<Props> = ({
  showUploadModal,
  selectedAction,
  setShowUploadModal,
  completeTaskWithResult,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const companyName = useMemo(() => {
    return (
      selectedAction?.application?.company ||
      selectedAction?.application?.companyName ||
      "Unknown Company"
    );
  }, [selectedAction?.application]);

  const taskName = useMemo(() => {
    return selectedAction?.action?.name || selectedAction?.action?.taskName || "Upload NDA";
  }, [selectedAction?.action]);

  useEffect(() => {
    if (!showUploadModal) {
      setFile(null);
      setError("");
      setIsDragging(false);
    }
  }, [showUploadModal]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        setShowUploadModal(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [saving, setShowUploadModal]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (!saving && dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setShowUploadModal(null);
      }
    },
    [saving, setShowUploadModal]
  );

  const handleFileSelect = useCallback((selectedFile: File | null | undefined) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!file || !selectedAction?.action) {
      setError("Please attach an NDA document.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const filedata = await fileToBase64(file);
      const resultPayload = JSON.stringify({
        filename: file.name,
        filedata,
      });
      await completeTaskWithResult(selectedAction.action, resultPayload);
      setShowUploadModal(null);
    } catch (err) {
      console.error("Upload NDA failed:", err);
      setError("Failed to upload and submit the document. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [file, selectedAction, completeTaskWithResult, setShowUploadModal]);

  if (!showUploadModal || !selectedAction) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full animate-scaleIn"
      >
        <button
          onClick={() => setShowUploadModal(null)}
          disabled={saving}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={22} />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{taskName}</h3>
        <p className="text-sm text-gray-700 mb-4">
          Application: <span className="font-medium">{companyName}</span>
        </p>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
        />

        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileSelect(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          disabled={saving}
          className={`w-full border-2 border-dashed rounded-lg p-5 text-left transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
          } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {file ? file.name : "Drop NDA here or click to attach"}
              </p>
              <p className="text-xs text-gray-500">
                {file ? `${Math.ceil(file.size / 1024)} KB` : "Any document file"}
              </p>
            </div>
          </div>
        </button>

        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowUploadModal(null)}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !file}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {saving && (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {saving ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};
