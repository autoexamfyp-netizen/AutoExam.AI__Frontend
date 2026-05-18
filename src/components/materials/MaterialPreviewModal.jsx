import { useEffect, useMemo, useState } from "react"
import { ExternalLink, X } from "lucide-react"
import {
  inferMaterialType,
  materialViewUrl,
  officeEmbedUrl,
  resolveMaterialViewUrl,
} from "../../services/cloudinaryService"

export default function MaterialPreviewModal({ material, onClose }) {
  const [viewUrl, setViewUrl] = useState("")
  const [urlError, setUrlError] = useState("")
  const [urlLoading, setUrlLoading] = useState(false)

  useEffect(() => {
    if (!material) return
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [material, onClose])

  useEffect(() => {
    if (!material) {
      setViewUrl("")
      setUrlError("")
      return
    }
    let cancelled = false
    setUrlLoading(true)
    setUrlError("")
    resolveMaterialViewUrl(material)
      .then((url) => {
        if (!cancelled && url) setViewUrl(url)
      })
      .catch((e) => {
        if (!cancelled) setUrlError(e?.message || "Could not load preview URL")
      })
      .finally(() => {
        if (!cancelled) setUrlLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [material])

  const resolvedType = inferMaterialType(material)
  const isPdf = resolvedType === "pdf"
  const isPpt = resolvedType === "ppt"
  const isDoc = resolvedType === "doc"
  const usesOfficeEmbed = isPpt || isDoc
  const canEmbed = isPdf || usesOfficeEmbed

  const embedSrc = useMemo(() => {
    if (!viewUrl) return ""
    if (usesOfficeEmbed) return officeEmbedUrl(viewUrl)
    return viewUrl
  }, [viewUrl, usesOfficeEmbed])

  const typeLabel = useMemo(() => {
    if (!material) return ""
    if (isPpt) return "SLIDES"
    if (isDoc) return "DOCUMENT"
    return (material.material_type || "file").toUpperCase()
  }, [material, isPpt, isDoc])

  if (!material) return null

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
            <p className="text-xs text-[#7f88a6]">{typeLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={viewUrl}
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

        <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden bg-[#f4f6fb] p-3">
          {urlError ? (
            <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {urlError}. Try{" "}
              <a href={viewUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                Open original
              </a>
              .
            </p>
          ) : null}
          {urlLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[#7f88a6]">Loading preview…</div>
          ) : canEmbed && embedSrc ? (
            <>
              {isPdf ? (
                <object
                  data={embedSrc}
                  type="application/pdf"
                  className="min-h-[min(75vh,720px)] w-full flex-1 rounded-xl border border-[#e7eaf3] bg-white"
                >
                  <iframe
                    src={embedSrc}
                    title={material.title}
                    className="min-h-[min(75vh,720px)] h-full w-full rounded-xl bg-white"
                  />
                </object>
              ) : (
                <iframe
                  src={embedSrc}
                  title={material.title}
                  className="min-h-[min(75vh,720px)] w-full flex-1 rounded-xl border border-[#e7eaf3] bg-white"
                />
              )}
              {usesOfficeEmbed || isPdf ? (
                <p className="mt-2 text-center text-xs text-[#7f88a6]">
                  If preview is blank, use{" "}
                  <a href={viewUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#6562f1] underline">
                    Open original
                  </a>
                  .
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[#5d6580]">
              Preview not available.
              <br />
              <a href={viewUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#6562f1] underline">
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
