import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { fetchWithAuth } from "@/api"
import { useUser } from "@/context/UserContext"
import { X } from "lucide-react" // ✔ Better close icon
import { toast } from "sonner"

type Props = {
  mode: "create" | "delete"
  isOpen: boolean
  onClose: () => void
}

export default function DashboardAppDialog({ mode, isOpen, onClose }: Props) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { token, strategy } = useUser()
  const dialogRef = useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!value.trim()) throw new Error("Value is required")

      if (mode === "create") {
        return await fetchWithAuth({
          path: `/createApplication?ownsId=${value}`,
          strategy,
          token,
        })
      } else {
        return await fetchWithAuth({
          path: `/deleteApplication?applicationId=${value}`,
          strategy,
          token,
        })
      }
    },
    onError: (err: any) => {
      setError(err?.message || "Unknown error occurred")
    },
    onSuccess: () => {
      setError(null)
      setValue("")
      onClose()
      toast.success(`${mode === "create" ? "Created" : "Deleted"} successfully!`)
      //alert(`${mode === "create" ? "Created" : "Deleted"} successfully!`)
    },
  })

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) onClose()
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, mutation.isPending, onClose])

  // Close when clicking outside dialog
  const handleOverlayClick = (e: React.MouseEvent) => 
    !mutation.isPending &&
    dialogRef.current &&
    !dialogRef.current.contains(e.target as Node) &&
    onClose()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 
                 animate-fadeIn"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-xl 
                   animate-scaleIn"
        onMouseDown={(e) => e.stopPropagation()} // prevent bubbling
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={mutation.isPending}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 
                     disabled:opacity-40 transition"
          aria-label="Close dialog"
        >
          <X size={22} />
        </button>

        <h2 className="text-lg font-semibold mb-4">
          {mode === "create" ? "Create Dashboard App" : "Delete Dashboard App"}
        </h2>

        <label className="block text-left mb-2 font-medium">
          {mode === "create" ? "Owner ID" : "Application ID"}:
        </label>

        <input
          type="number"
          className="w-full border rounded px-3 py-2 mb-4"
          value={value}
          disabled={mutation.isPending}
          onChange={(e) => setValue(e.target.value)}
        />

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 
                       disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 
                       disabled:opacity-50 flex items-center gap-2"
          >
            {mutation.isPending && (
              <span className="h-4 w-4 border-2 border-white border-t-transparent 
                               rounded-full animate-spin"></span>
            )}

            {mutation.isPending
              ? mode === "create"
                ? "Creating..."
                : "Deleting..."
              : mode === "create"
              ? "Create"
              : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}