import { useEffect } from "react"
import { ExternalLink, X } from "lucide-react"
import { inlineUrl } from "../../services/cloudinaryService"

/**
 * Lightweight preview modal. Shows images inline and PDFs in an iframe;
 * always exposes an "Open original" link for new-tab fallback.
 *
 * @param {object} props
 * @param {object|null} props.material
 * @param {() => void} props.onClose
 */
export default function MaterialPreviewModal({ material, onClose }) {
  useEffect(() => {
    if (!material) return
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [material, onClose])

  if (!material) return null

  const url = inlineUrl(material.file_url)
  const isImage = material.material_type === "image"
  const isPdf = material.material_type === "pdf"
  const isVideo = material.material_type === "video"

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute inset-0 bg-[#0f1730]/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${material.title}`}
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white shadow-[0_30px_80px_rgba(15,23,48,0.25)]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[#eef1f7] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#151d3a]">{material.title}</p>
            <p className="text-xs text-[#7f88a6]">{material.material_type.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1.5 text-xs font-medium text-[#313a58] transition hover:bg-[#fafbff]"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open original
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[#596286] hover:bg-[#f6f7fc]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-[320px] flex-1 items-center justify-center overflow-auto bg-[#f4f6fb] p-3">
          {isImage ? (
            <img src={material.file_url} alt={material.title} className="max-h-[75vh] w-auto rounded-xl" />
          ) : isPdf ? (
            <iframe
              src={url}
              title={material.title}
              className="h-[75vh] w-full rounded-xl border border-[#e7eaf3] bg-white"
            />
          ) : isVideo ? (
            <video src={material.file_url} controls className="max-h-[75vh] w-full rounded-xl bg-black" />
          ) : (
            <div className="text-center text-sm text-[#5d6580]">
              Preview not available.
              <br />
              <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-[#6562f1] underline">
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
