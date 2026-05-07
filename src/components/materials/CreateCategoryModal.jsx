import { useEffect, useRef, useState } from "react"
import { Loader2, X } from "lucide-react"

/**
 * Create / edit a subject category.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} [props.initial]   When provided, switches to "Edit" mode.
 * @param {(values: { title: string, description?: string }) => Promise<any>} props.onSubmit
 * @param {() => void} props.onClose
 */
export default function CreateCategoryModal({ open, initial, onSubmit, onClose }) {
  if (!open) return null
  return (
    <CategoryForm
      key={initial?.id ?? "new"}
      initial={initial}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  )
}

function CategoryForm({ initial, onSubmit, onClose }) {
  const titleRef = useRef(null)
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const isEdit = Boolean(initial?.id)

  useEffect(() => {
    const t = window.setTimeout(() => titleRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, submitting])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError("Title is required.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await onSubmit({ title: trimmed, description: description.trim() })
    } catch (err) {
      setError(err?.message || "Could not save category.")
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-[#0f1730]/40 backdrop-blur-[2px]"
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-[#e7eaf3] bg-white p-6 shadow-[0_-8px_40px_rgba(15,23,48,0.12)] sm:rounded-2xl sm:shadow-[0_20px_60px_rgba(15,23,48,0.15)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="category-modal-title" className="text-lg font-semibold text-[#151d3a]">
              {isEdit ? "Edit category" : "New category"}
            </h2>
            <p className="mt-1 text-xs text-[#7f88a6]">
              Group your materials by subject (e.g. Web Development, AI, Database Systems).
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="rounded-lg p-2 text-[#596286] hover:bg-[#f6f7fc]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
          Title
        </label>
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="e.g. Web Development"
          className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
          disabled={submitting}
          required
        />

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
          Description <span className="text-[#9aa3c2]">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={240}
          rows={3}
          placeholder="Short note about what belongs in this folder."
          className="mt-1 w-full resize-none rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
          disabled={submitting}
        />

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="h-11 rounded-xl border border-[#e3e6ef] bg-white px-4 text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Create category"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
