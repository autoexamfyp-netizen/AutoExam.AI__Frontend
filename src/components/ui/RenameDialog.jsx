import { useEffect, useRef, useState } from "react"
import { Loader2, Pencil, X } from "lucide-react"

/**
 * Reusable rename / edit-title dialog. Replaces ugly `window.prompt(...)` calls.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} [props.title]           Modal title  ("Rename material", etc.)
 * @param {string} [props.label]           Field label ("Material name", "Note title", ...)
 * @param {string} [props.placeholder]
 * @param {string} [props.initialValue]    Pre-filled value
 * @param {string} [props.confirmLabel]    Defaults to "Save"
 * @param {string} [props.cancelLabel]     Defaults to "Cancel"
 * @param {number} [props.maxLength]       Defaults to 120
 * @param {string} [props.helper]          Optional helper text under the input
 * @param {(value: string) => Promise<void> | void} props.onConfirm   Receives trimmed value
 * @param {() => void} props.onCancel
 */
export default function RenameDialog({
  open,
  title = "Rename",
  label = "Name",
  placeholder = "",
  initialValue = "",
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  maxLength = 120,
  helper,
  onConfirm,
  onCancel,
}) {
  const inputRef = useRef(null)
  const [value, setValue] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setValue(initialValue ?? "")
    setError("")
    setSubmitting(false)
    const t = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select?.()
    }, 60)
    return () => window.clearTimeout(t)
  }, [open, initialValue])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onCancel?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onCancel])

  if (!open) return null

  const trimmed = value.trim()
  const unchanged = trimmed.length > 0 && trimmed === (initialValue || "").trim()
  const canSave = trimmed.length > 0 && !unchanged && !submitting

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!trimmed) {
      setError("Name cannot be empty.")
      return
    }
    if (unchanged) {
      onCancel?.()
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await onConfirm?.(trimmed)
    } catch (err) {
      setError(err?.message || "Could not save.")
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto overscroll-contain sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !submitting && onCancel?.()}
        className="fixed inset-0 bg-[#0f1730]/40 backdrop-blur-[2px]"
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-dialog-title"
        className="relative z-10 w-full max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-2xl border border-[#e7eaf3] bg-white p-5 shadow-[0_-8px_40px_rgba(15,23,48,0.12)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-6 sm:shadow-[0_20px_60px_rgba(15,23,48,0.15)]"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f1efff] text-[#5f4ce6]">
            <Pencil className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="rename-dialog-title" className="text-lg font-semibold text-[#151d3a]">
              {title}
            </h2>
            {helper ? <p className="mt-1 text-xs text-[#7f88a6]">{helper}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => !submitting && onCancel?.()}
            className="rounded-lg p-2 text-[#596286] hover:bg-[#f6f7fc]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
          {label}
        </label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError("")
          }}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={submitting}
          className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/15 disabled:opacity-60"
          required
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-[11px] text-[#9aa3c2]">{value.length}/{maxLength}</span>
          {error ? (
            <span className="break-words text-[11px] font-medium text-red-600">{error}</span>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => !submitting && onCancel?.()}
            disabled={submitting}
            className="h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-4 text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff] disabled:opacity-60 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:opacity-60 sm:w-auto"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
