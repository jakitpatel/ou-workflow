import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  createSubmissionApplication,
  deleteSubmissionApplication,
  fetchWithAuth,
} from "@/api"
import { useUser } from "@/context/UserContext"
import { X, AlertCircle } from "lucide-react"
import { toast } from "sonner"

type Props = {
  mode: "create" | "delete" | "create-intake" | "delete-intake"
  isOpen: boolean
  onClose: () => void
}

export default function DashboardAppDialog({ mode, isOpen, onClose }: Props) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const { token } = useUser()
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedValue = value.trim()

      if (!trimmedValue) {
        throw new Error(`${mode === "create" ? "Owner ID" : "Application ID"} is required`)
      }

      if (!/^\d+$/.test(trimmedValue)) {
        throw new Error("Please enter a valid numeric ID")
      }

      if (mode === "create-intake") {
        return await createSubmissionApplication({
          applicationId: Number(trimmedValue),
          token,
        })
      }
      if (mode === "delete-intake") {
        return await deleteSubmissionApplication({
          applicationId: Number(trimmedValue),
          applicationType: 2,
          token,
        })
      }

      return await fetchWithAuth({
        path:
          mode === "create"
            ? `/createApplication?ownsId=${trimmedValue}`
            : `/deleteApplication?applicationID=${trimmedValue}`,
        token,
      })
    },

    onError: (err: any) => {
      const backendMessage =
        err?.details?.status ||
        err?.details?.message ||
        err?.message ||
        "An unexpected error occurred"

      setError(backendMessage)
      toast.error(backendMessage)
    },

    onSuccess: (res) => {
      toast.success((res as { status: string }).status)
      setError(null)
      setValue("")
      setTouched(false)
      onClose()
    },
  })

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) {
        onClose()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, mutation.isPending, onClose])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setValue("")
      setError(null)
      setTouched(false)
    }
  }, [isOpen])

  // Close when clicking outside dialog
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (
      !mutation.isPending &&
      dialogRef.current &&
      !dialogRef.current.contains(e.target as Node)
    ) {
      onClose()
    }
  }

  // Handle Enter key submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !mutation.isPending && value.trim()) {
      mutation.mutate()
    }
  }

  // Validate on blur
  const handleBlur = () => {
    setTouched(true)
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      setError(`${mode === "create" ? "Owner ID" : "Application ID"} is required`)
    } else if (!/^\d+$/.test(trimmedValue)) {
      setError("Please enter a valid numeric ID")
    } else {
      setError(null)
    }
  }

  // Clear error on input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    if (touched && error) {
      setError(null)
    }
  }

  if (!isOpen) return null

  const isDeleteMode = mode === "delete" || mode === "delete-intake"
  const fieldLabel = mode === "create" ? "Owner ID" : "Application ID"

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        ref={dialogRef}
        className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={mutation.isPending}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                     rounded-full p-1 hover:bg-gray-100"
          aria-label="Close dialog"
          type="button"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h2 id="dialog-title" className="text-xl font-semibold mb-6 pr-8">
          {mode === "create"
            ? "Create Dashboard App"
            : mode === "create-intake"
            ? "Create Intake Application"
            : mode === "delete-intake"
            ? "Delete Intake Application"
            : "Delete Dashboard App"}
        </h2>

        {/* Input Section */}
        <div className="mb-5">
          <label
            htmlFor="id-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {fieldLabel}
          </label>

          <input
            ref={inputRef}
            id="id-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={`w-full border rounded-lg px-4 py-2.5 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-gray-50 disabled:cursor-not-allowed
                       ${error ? "border-red-300 focus:ring-red-500" : "border-gray-300"}`}
            value={value}
            disabled={mutation.isPending}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${fieldLabel.toLowerCase()}`}
            aria-invalid={!!error}
            aria-describedby={error ? "input-error" : undefined}
            autoComplete="off"
          />

          {/* Error Message */}
          {error && (
            <div
              id="input-error"
              className="flex items-center gap-2 mt-2 text-sm text-red-600"
              role="alert"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Delete Warning */}
        {isDeleteMode && value.trim() && !error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. The
              application will be permanently deleted.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-5 py-2.5 rounded-lg font-medium text-gray-700
                       bg-gray-100 hover:bg-gray-200 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !value.trim()}
            className={`px-5 py-2.5 rounded-lg font-medium text-white
                       flex items-center gap-2 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       ${
                         isDeleteMode
                           ? "bg-red-600 hover:bg-red-700"
                           : "bg-blue-600 hover:bg-blue-700"
                       }`}
          >
            {mutation.isPending && (
              <span
                className="h-4 w-4 border-2 border-white border-t-transparent 
                           rounded-full animate-spin"
                aria-hidden="true"
              />
            )}

            {mutation.isPending
              ? mode === "create"
                ? "Creating..."
                : mode === "create-intake"
                ? "Creating..."
                : "Deleting..."
              : mode === "create"
              ? "Create App"
              : mode === "create-intake"
              ? "Create Intake"
              : mode === "delete-intake"
              ? "Delete Intake"
              : "Delete App"}
          </button>
        </div>
      </div>
    </div>
  )
}
