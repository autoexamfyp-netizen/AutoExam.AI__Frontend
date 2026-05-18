import { AlertCircle, CheckCircle2, FileText, Image as ImageIcon, Loader2, Video, X } from "lucide-react"
import { formatSize, getMaterialType } from "../../services/cloudinaryService"

const ICON = {
  pdf: FileText,
  image: ImageIcon,
  video: Video,
  other: FileText,
}

/**
 * Per-file upload status row.
 *
 * @param {object} props
 * @param {File} props.file
 * @param {"queued"|"uploading"|"saving"|"success"|"error"} props.status
 * @param {number} props.progress      0..100
 * @param {string} [props.error]
 * @param {() => void} [props.onCancel]
 * @param {() => void} [props.onRetry]
 * @param {() => void} [props.onDismiss]
 */
export default function UploadProgress({ file, status, progress, error, onCancel, onRetry, onDismiss }) {
  const type = getMaterialType(file.type, file.name)
  const Icon = ICON[type] ?? FileText

  const label =
    status === "queued"
      ? "Waiting"
      : status === "uploading"
        ? `Uploading ${progress}%`
        : status === "saving"
          ? "Saving metadata"
          : status === "success"
            ? "Upload Complete"
            : "Failed"

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-3 shadow-sm">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4f6fb] text-[#6562f1]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#151d3a]">{file.name}</p>
            <p className="text-xs text-[#7f88a6]">
              {formatSize(file.size)} · {type.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {status === "uploading" || status === "saving" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1efff] px-2 py-0.5 font-medium text-[#5f4ce6]">
                <Loader2 className="h-3 w-3 animate-spin" /> {label}
              </span>
            ) : null}
            {status === "success" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8fbf3] px-2 py-0.5 font-medium text-[#1f9d67]">
                <CheckCircle2 className="h-3 w-3" /> Upload Complete
              </span>
            ) : null}
            {status === "error" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecec] px-2 py-0.5 font-medium text-[#c94a4a]">
                <AlertCircle className="h-3 w-3" /> Failed
              </span>
            ) : null}
          </div>
        </div>

        {status === "uploading" || status === "saving" ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef1f7]">
            <div
              className="h-full rounded-full bg-[#6562f1] transition-[width] duration-150"
              style={{ width: `${status === "saving" ? 100 : progress}%` }}
            />
          </div>
        ) : null}

        {status === "error" && error ? (
          <p className="mt-2 text-xs text-[#c94a4a]">{error}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {status === "uploading" && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1 text-xs font-medium text-[#313a58] transition hover:bg-[#fafbff]"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          ) : null}
          {status === "error" && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-lg bg-[#6562f1] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#5a56e2]"
            >
              Retry
            </button>
          ) : null}
          {(status === "error" || status === "success") && onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1 text-xs font-medium text-[#596286] transition hover:bg-[#fafbff]"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
