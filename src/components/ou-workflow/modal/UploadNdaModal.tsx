import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { uploadApplicationFile } from "@/api";
import { useUser } from "@/context/UserContext";
import { useApplicationDetail } from "@/components/ou-workflow/hooks/useApplicationDetail";
import type { Applicant, Task } from "@/types/application";

type SelectedAction = {
  application: Applicant | Task | any;
  action: Task | any;
};

type Props = {
  showUploadModal: boolean | null | Task;
  selectedAction: SelectedAction | null;
  taskInstanceId?: string | number | null;
  setShowUploadModal: (val: boolean | null | Task) => void;
  completeTaskWithResult: (
    action: Task,
    result: string,
    status?: string,
    completionNotes?: string
  ) => void;
};

export const UploadNdaModal: React.FC<Props> = ({
  showUploadModal,
  selectedAction,
  taskInstanceId,
  setShowUploadModal,
  completeTaskWithResult,
}) => {
  const { token } = useUser();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingAction, setProcessingAction] = useState<"complete" | "negotiate" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [selectedContactEmail, setSelectedContactEmail] = useState("");

  const formatContactLabel = useCallback((contact: any) => {
    const contactName = String(contact?.name ?? "").trim();
    const contactType = String(contact?.type ?? "").trim();

    return contactType ? `${contactName} (${contactType})` : contactName;
  }, []);

  const companyName = useMemo(() => {
    return (
      selectedAction?.application?.company ||
      selectedAction?.application?.companyName ||
      "Unknown Company"
    );
  }, [selectedAction?.application]);

  const taskName = useMemo(() => {
    const clickedTask = typeof showUploadModal === "object" ? showUploadModal : null;
    return (
      clickedTask?.name ||
      selectedAction?.action?.name ||
      selectedAction?.action?.taskName ||
      "Upload NDA"
    );
  }, [showUploadModal, selectedAction?.action]);

  const isReviewUploadTask = useMemo(() => {
    const clickedTask = typeof showUploadModal === "object" ? showUploadModal : null;
    const taskType =
      clickedTask?.taskType?.toLowerCase() ||
      selectedAction?.action?.taskType?.toLowerCase() ||
      "";
    const taskCategory =
      clickedTask?.taskCategory?.toLowerCase() ||
      selectedAction?.action?.taskCategory?.toLowerCase() ||
      "";

    return taskType === "action" && taskCategory === "upload";
  }, [showUploadModal, selectedAction?.action]);

  const applicationId = useMemo(() => {
    return (
      selectedAction?.application?.applicationId ??
      selectedAction?.action?.applicationId ??
      null
    );
  }, [selectedAction]);

  const { data: applicationDetail, isLoading: isApplicationDetailLoading } = useApplicationDetail(
    showUploadModal && isReviewUploadTask && applicationId != null ? String(applicationId) : undefined
  );

  const companyContacts = useMemo(() => {
    const contacts = applicationDetail?.companyContacts ?? [];
    return contacts.filter(
      (contact: any) => Boolean(contact?.email) && Boolean(contact?.name)
    );
  }, [applicationDetail?.companyContacts]);

  useEffect(() => {
    if (!showUploadModal) {
      setFile(null);
      setUploaded(false);
      setError("");
      setIsDragging(false);
      setSelectedContactEmail("");
    }
  }, [showUploadModal]);

  useEffect(() => {
    if (!showUploadModal || !isReviewUploadTask || !uploaded) {
      return;
    }

    if (companyContacts.length === 0) {
      setSelectedContactEmail("");
      return;
    }

    if (selectedContactEmail && companyContacts.some((c: any) => c.email === selectedContactEmail)) {
      return;
    }

    const primaryContact = companyContacts.find(
      (contact: any) => String(contact.type).toLowerCase() === "primary contact"
    );
    setSelectedContactEmail(primaryContact?.email ?? companyContacts[0]?.email ?? "");
  }, [
    showUploadModal,
    isReviewUploadTask,
    uploaded,
    companyContacts,
    selectedContactEmail,
  ]);

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
    setUploaded(false);
    setError("");
  }, []);

  const uploadSelectedFile = useCallback(async (): Promise<boolean> => {
    if (!file || !selectedAction?.action) {
      setError("Please attach an NDA document.");
      return false;
    }

    setSaving(true);
    setError("");
    try {
      await uploadApplicationFile({
        file,
        applicationId:
          selectedAction?.application?.applicationId ??
          selectedAction?.action?.applicationId,
        taskInstanceID:
          taskInstanceId ??
          selectedAction?.action?.TaskInstanceId ??
          selectedAction?.action?.taskId,
        description: taskName,
        token: token ?? undefined,
      });
      if (isReviewUploadTask) {
        setUploaded(true);
      } else {
        completeTaskWithResult(
          selectedAction.action,
          "yes",
          undefined,
          "NDA uploaded successfully"
        );
        setShowUploadModal(null);
      }
      return true;
    } catch (err: any) {
      console.error("Upload NDA failed:", err);
      setError(
        err?.message ||
          err?.error ||
          "Failed to upload and submit the document. Please try again."
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    file,
    selectedAction,
    taskInstanceId,
    taskName,
    token,
    isReviewUploadTask,
    completeTaskWithResult,
    setShowUploadModal,
  ]);

  const openMailSenderWithAttachment = useCallback(async () => {
    if (!file) {
      setError("Please attach an NDA document.");
      return;
    }

    const subject = `NDA Review - ${companyName}`;
    let body = `Please review the attached NDA: ${file.name}`;
    let fileDownloadUrl = `${window.location.origin}/api/applications/${selectedAction?.application?.applicationId}/files/${file.name}`;
    body = `${body}\n\nDownload: ${fileDownloadUrl}`;

    /*
    const safeFileName = file.name?.trim() || "NDA.pdf";
    try {
      // Rebuild file payload so desktop share targets (like Outlook) receive a named, non-empty file object.
      const shareBlob = await file.arrayBuffer();
      const shareFile = new File([shareBlob], safeFileName, {
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified || Date.now(),
      });

      const maybeNavigator = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (
        maybeNavigator.share &&
        maybeNavigator.canShare &&
        maybeNavigator.canShare({ files: [shareFile] as any })
      ) {
        await maybeNavigator.share({
          title: subject,
          text: body,
          files: [shareFile] as any,
        });
        return;
      }
    } catch (err) {
      console.warn("Native share failed, falling back to mailto:", err);
    }
    */
    const mailTo = selectedContactEmail?.trim() ?? "";
    window.location.href = `mailto:${encodeURIComponent(
      mailTo
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `${body}\n\nAttachment filename: ${file.name}`
    )}`;
  }, [file, companyName, selectedContactEmail]);

  const handleComplete = useCallback(async () => {
    if (!selectedAction?.action) {
      setError("Task context is missing.");
      return;
    }

    if (isReviewUploadTask) {
      if (companyContacts.length === 0) {
        setError("No company contacts found for this application.");
        return;
      }
      if (!selectedContactEmail) {
        setError("Please select a contact before completing.");
        return;
      }
    }

    setProcessingAction("complete");
    try {
      const ok = uploaded ? true : await uploadSelectedFile();
      if (!ok) return;
      completeTaskWithResult(
        selectedAction.action,
        "yes",
        undefined,
        "NDA uploaded and marked complete"
      );
      await openMailSenderWithAttachment();
      setShowUploadModal(null);
    } finally {
      setProcessingAction(null);
    }
  }, [
    selectedAction,
    isReviewUploadTask,
    companyContacts.length,
    selectedContactEmail,
    uploaded,
    uploadSelectedFile,
    completeTaskWithResult,
    openMailSenderWithAttachment,
    setShowUploadModal,
  ]);

  const handleNegotiate = useCallback(async () => {
    if (!selectedAction?.action) {
      setError("Task context is missing.");
      return;
    }

    setProcessingAction("negotiate");
    setSaving(true);
    setError("");
    try {
      completeTaskWithResult(
        selectedAction.action,
        "",
        "IN_PROGRESS",
        "NDA review marked as negotiate"
      );
      setShowUploadModal(null);
    } catch (err: any) {
      console.error("Negotiate action failed:", err);
      setError(err?.message || "Failed to set task as negotiate.");
    } finally {
      setSaving(false);
      setProcessingAction(null);
    }
  }, [selectedAction, completeTaskWithResult, setShowUploadModal]);

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
            onClick={uploadSelectedFile}
            disabled={saving || !file}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {saving && (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {!saving && <Upload className="h-4 w-4" />}
            {saving ? "Uploading..." : "Upload"}
          </button>
        </div>

        {uploaded && isReviewUploadTask && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Contact
              </label>
              <select
                value={selectedContactEmail}
                onChange={(e) => {
                  setSelectedContactEmail(e.target.value);
                  setError("");
                }}
                disabled={saving || isApplicationDetailLoading || companyContacts.length === 0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Select contact</option>
                {companyContacts.map((contact: any) => (
                  <option
                    key={`${contact.email}-${contact.name}`}
                    value={contact.email}
                  >
                    {formatContactLabel(contact)}
                  </option>
                ))}
              </select>
              {isApplicationDetailLoading && (
                <p className="mt-1 text-xs text-gray-500">Loading contacts...</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleNegotiate}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {processingAction === "negotiate" && saving && (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                Negotiate
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {processingAction === "complete" && (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                Complete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
