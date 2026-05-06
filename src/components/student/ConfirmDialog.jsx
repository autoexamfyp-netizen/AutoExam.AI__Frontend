/**
 * Accessible confirmation modal (no extra deps).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} [props.confirmLabel]
 * @param {string} [props.cancelLabel]
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#0f1730]/40 backdrop-blur-[2px] transition-opacity"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-[#e7eaf3] bg-white p-6 shadow-[0_-8px_40px_rgba(15,23,48,0.12)] sm:rounded-2xl sm:shadow-[0_20px_60px_rgba(15,23,48,0.15)]"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-[#151d3a]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5d6580]">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-[#e3e6ef] bg-white px-4 text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white transition hover:bg-[#5a56e2]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
