import { useEffect, useId, useState } from "react"
import { X } from "lucide-react"

/**
 * Pick a subject folder to move a file material into.
 */
export default function MoveMaterialDialog({
  open,
  material,
  categories = [],
  busy = false,
  onConfirm,
  onCancel,
}) {
  const selectId = useId()
  const [categoryId, setCategoryId] = useState("")

  useEffect(() => {
    if (!open || !material) return
    setCategoryId(material.category_id ?? categories[0]?.id ?? "")
  }, [open, material, categories])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, busy, onCancel])

  if (!open || !material) return null

  const unchanged = categoryId === (material.category_id ?? "")

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close"
        onClick={() => !busy && onCancel?.()}
        className="absolute inset-0 bg-[#0f1730]/45 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-material-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,48,0.18)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="move-material-title" className="text-lg font-semibold text-[#151d3a]">
              Move to subject
            </h2>
            <p className="mt-0.5 text-sm text-[#7f88a6]">
              Move <span className="font-medium text-[#313a58]">{material.title}</span> to another folder.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onCancel?.()}
            disabled={busy}
            className="rounded-lg p-2 text-[#596286] hover:bg-[#f6f7fc] disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
          Subject
        </label>
        <select
          id={selectId}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={busy || !categories.length}
          className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
        >
          {!categories.length ? (
            <option value="">Create a subject first</option>
          ) : (
            categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))
          )}
        </select>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => !busy && onCancel?.()}
            disabled={busy}
            className="rounded-xl border border-[#e3e6ef] bg-white px-4 py-2 text-sm font-semibold text-[#313a58] hover:bg-[#fafbff] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !categoryId || unchanged}
            onClick={() => onConfirm?.(categoryId)}
            className="rounded-xl bg-[#6562f1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a56e2] disabled:opacity-50"
          >
            {busy ? "Moving…" : "Move"}
          </button>
        </div>
      </div>
    </div>
  )
}
