import { useState } from "react"
import { Download, ExternalLink, FileText, Folder, Image as ImageIcon, Pencil, Trash2, Video } from "lucide-react"
import { formatSize, inlineUrl } from "../../services/cloudinaryService"

const ICON = {
  pdf: FileText,
  image: ImageIcon,
  video: Video,
  other: FileText,
}

function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

/**
 * Material library card.
 *
 * @param {object} props
 * @param {object} props.material           Row from `materials` table
 * @param {(m: object) => void} [props.onPreview]
 * @param {(m: object) => void} [props.onRename]
 * @param {(m: object) => void} [props.onDelete]
 */
export default function MaterialCard({ material, onPreview, onRename, onDelete }) {
  const [imgError, setImgError] = useState(false)
  const Icon = ICON[material.material_type] ?? FileText
  const isImage = material.material_type === "image"
  const previewUrl = inlineUrl(material.file_url)

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f4f6fb]">
        {isImage && !imgError ? (
          <img
            src={material.file_url}
            alt={material.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-[#6562f1]">
            <Icon className="h-10 w-10" />
            <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#9aa3c2]">
              {material.material_type}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#151d3a]" title={material.title}>
            {material.title}
          </p>
          <p className="mt-0.5 text-xs text-[#7f88a6]">
            {formatSize(material.size_bytes ?? 0)} · {formatDate(material.created_at)}
          </p>
          {material.category?.title ? (
            <span className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-[#f1efff] px-2 py-0.5 text-[11px] font-semibold text-[#5f4ce6]">
              <Folder className="h-3 w-3 shrink-0" />
              <span className="truncate">{material.category.title}</span>
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPreview?.(material)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1.5 text-xs font-medium text-[#313a58] transition hover:bg-[#fafbff]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Preview
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1.5 text-xs font-medium text-[#313a58] transition hover:bg-[#fafbff]"
          >
            <Download className="h-3.5 w-3.5" /> Open
          </a>
          {onRename ? (
            <button
              type="button"
              onClick={() => onRename(material)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1.5 text-xs font-medium text-[#596286] transition hover:bg-[#fafbff]"
              aria-label="Rename"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(material)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[#fbd8d8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#c94a4a] transition hover:bg-red-50"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
