import { useEffect, useRef } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

/**
 * Accessible confirmation modal (no extra deps).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string|React.ReactNode} props.message
 * @param {string} [props.confirmLabel]
 * @param {string} [props.cancelLabel]
 * @param {boolean} [props.destructive]   When true, paints the confirm button red and shows a warning icon.
 * @param {boolean} [props.busy]          When true, disables both buttons and shows a spinner on confirm.
 * @param {() => void | Promise<void>} props.onConfirm
 * @param {() => void} props.onCancel
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => confirmRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  const confirmClass = destructive
    ? "h-11 w-full rounded-xl bg-[#c94a4a] px-4 text-sm font-semibold text-white transition hover:bg-[#b03d3d] disabled:opacity-60 sm:w-auto"
    : "h-11 w-full rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:opacity-60 sm:w-auto"

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto overscroll-contain sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 bg-[#0f1730]/40 backdrop-blur-[2px] transition-opacity"
        onClick={busy ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-10 w-full max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-2xl border border-[#e7eaf3] bg-white p-5 shadow-[0_-8px_40px_rgba(15,23,48,0.12)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-6 sm:shadow-[0_20px_60px_rgba(15,23,48,0.15)]"
      >
        <div className="flex items-start gap-3">
          {destructive ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fdecec] text-[#c94a4a]">
              <AlertTriangle className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-[#151d3a]">
              {title}
            </h2>
            <div className="mt-2 text-sm leading-relaxed text-[#5d6580]">
              {typeof message === "string" ? <p>{message}</p> : message}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-4 text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff] disabled:opacity-60 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center justify-center gap-2 ${confirmClass}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
