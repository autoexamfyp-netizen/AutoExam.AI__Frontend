import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { FolderOpen, UploadCloud, X } from "lucide-react"
import {
  ACCEPT_ATTR,
  getMaterialType,
  uploadToCloudinary,
  validateFile,
} from "../../services/cloudinaryService"
import { saveMaterial } from "../../services/materialService"
import UploadProgress from "./UploadProgress"

/**
 * Modal upload flow for PDF, Word (DOC/DOCX), and PowerPoint.
 * Controlled via `open` / `onClose` from the materials page.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(material: object) => void} [props.onUploaded]
 * @param {string} [props.folder]
 * @param {Array<{id: string, title: string}>} [props.categories]
 * @param {string|null} [props.selectedCategoryId]
 * @param {(id: string) => void} [props.onChangeCategory]
 */
export default function FileUpload({
  open,
  onClose,
  onUploaded,
  folder = "autoexam/materials",
  categories = [],
  selectedCategoryId = null,
  onChangeCategory,
}) {
  const inputId = useId()
  const selectId = useId()
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [items, setItems] = useState([])
  const [showCategoryError, setShowCategoryError] = useState(false)

  const isBusy = useMemo(
    () => items.some((it) => it.status === "uploading" || it.status === "saving"),
    [items],
  )

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  )

  const categoryRequiredMissing = !selectedCategoryId

  const resetAndClose = useCallback(() => {
    setItems([])
    setIsDragging(false)
    setShowCategoryError(false)
    onClose?.()
  }, [onClose])

  const tryClose = useCallback(() => {
    if (isBusy) return
    resetAndClose()
  }, [isBusy, resetAndClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === "Escape") tryClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, tryClose])

  useEffect(() => {
    if (!open) {
      setItems([])
      setIsDragging(false)
      setShowCategoryError(false)
    }
  }, [open])

  /** Close modal when every file succeeded; keep open only if something failed. */
  useEffect(() => {
    if (!open || items.length === 0) return
    const pending = items.some(
      (it) => it.status === "queued" || it.status === "uploading" || it.status === "saving",
    )
    if (pending) return

    const errors = items.filter((it) => it.status === "error")
    if (errors.length === 0) {
      resetAndClose()
      return
    }
    if (items.some((it) => it.status === "success")) {
      setItems(errors)
    }
  }, [open, items, resetAndClose])

  const updateItem = useCallback((id, patch) => {
    setItems((curr) => curr.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  const startUpload = useCallback(
    async (item, categoryId, categoryName) => {
      const controller = new AbortController()
      updateItem(item.id, { status: "uploading", progress: 0, error: undefined, controller })

      try {
        const result = await uploadToCloudinary(item.file, {
          folder,
          signal: controller.signal,
          onProgress: (pct) => updateItem(item.id, { progress: pct }),
        })

        updateItem(item.id, { status: "saving", progress: 100 })

        const saved = await saveMaterial({
          title: item.file.name,
          fileUrl: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          materialType: getMaterialType(item.file.type, item.file.name),
          mimeType: item.file.type,
          sizeBytes: result.bytes ?? item.file.size,
          originalFilename: result.original_filename,
          categoryId,
          categoryName,
        })

        if (typeof onUploaded === "function") onUploaded(saved)
        updateItem(item.id, {
          status: "success",
          progress: 100,
          controller: null,
          categoryId,
          categoryName,
        })
      } catch (err) {
        if (err?.name === "AbortError") {
          updateItem(item.id, { status: "error", error: "Upload cancelled.", controller: null })
        } else {
          updateItem(item.id, {
            status: "error",
            error: err?.message || "Upload failed.",
            controller: null,
          })
        }
      }
    },
    [folder, onUploaded, updateItem],
  )

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList ?? [])
      if (!files.length) return

      if (!selectedCategoryId) {
        setShowCategoryError(true)
        return
      }

      const next = []
      for (const file of files) {
        const v = validateFile(file)
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        if (!v.ok) {
          next.push({ id, file, status: "error", progress: 0, error: v.error })
          continue
        }
        next.push({
          id,
          file,
          status: "queued",
          progress: 0,
          categoryId: selectedCategoryId,
          categoryName: selectedCategory?.title,
        })
      }

      setItems((curr) => [...next, ...curr])

      for (const it of next) {
        if (it.status === "queued") startUpload(it, it.categoryId, it.categoryName)
      }
    },
    [selectedCategoryId, selectedCategory, startUpload],
  )

  const onInputChange = (e) => {
    handleFiles(e.target.files)
    e.target.value = ""
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (!selectedCategoryId) {
      setShowCategoryError(true)
      return
    }
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files)
  }

  const onCancel = (item) => {
    item.controller?.abort()
  }

  const onRetry = (item) => {
    startUpload(item, item.categoryId ?? selectedCategoryId, item.categoryName ?? selectedCategory?.title)
  }

  const onDismiss = (item) => {
    setItems((curr) => curr.filter((it) => it.id !== item.id))
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto overscroll-contain p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close upload dialog"
        onClick={tryClose}
        className="fixed inset-0 bg-[#0f1730]/45 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-materials-title"
        className="relative z-10 flex w-full max-w-lg max-h-[min(90dvh,720px)] flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white shadow-[0_24px_80px_rgba(15,23,48,0.18)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#eef1f7] px-5 py-4">
          <div>
            <h2 id="upload-materials-title" className="text-lg font-semibold text-[#151d3a]">
              Add materials
            </h2>
            <p className="mt-0.5 text-xs text-[#7f88a6]">Upload files to a subject folder</p>
          </div>
          <button
            type="button"
            onClick={tryClose}
            disabled={isBusy}
            className="rounded-lg p-2 text-[#596286] transition hover:bg-[#f6f7fc] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          {categoryRequiredMissing ? (
            <div
              role="status"
              className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3"
            >
              <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
              <p className="text-sm leading-snug text-amber-950">
                Select a subject folder from the sidebar before uploading materials.
              </p>
            </div>
          ) : null}

          <div>
            <label
              htmlFor={selectId}
              className="block text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]"
            >
              Upload to subject
            </label>
            <select
              id={selectId}
              value={selectedCategoryId ?? ""}
              onChange={(e) => {
                setShowCategoryError(false)
                onChangeCategory?.(e.target.value || null)
              }}
              className={`mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition focus:border-[#6562f1] ${
                showCategoryError && categoryRequiredMissing ? "border-red-300" : "border-[#e3e6ef]"
              }`}
            >
              <option value="" disabled>
                {categories.length ? "Choose a subject…" : "Create a subject in the sidebar first"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            {showCategoryError && categoryRequiredMissing ? (
              <p className="mt-1.5 text-xs text-red-600">Pick a subject before uploading.</p>
            ) : null}
          </div>

          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault()
              if (!selectedCategoryId) return
              setIsDragging(true)
            }}
            onDragEnter={() => selectedCategoryId && setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            aria-disabled={categoryRequiredMissing}
            className={`flex min-h-[160px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
              categoryRequiredMissing
                ? "cursor-not-allowed border-[#dbe0ee] bg-[#fafbff] opacity-80"
                : isDragging
                  ? "cursor-pointer border-[#6562f1] bg-[#f4f3ff]"
                  : "cursor-pointer border-[#d8ddf0] bg-white hover:border-[#6562f1]/50 hover:bg-[#fafbff]"
            }`}
          >
            <UploadCloud className="h-9 w-9 text-[#6562f1]" />
            <p className="mt-2 text-sm font-semibold text-[#151d3a]">
              {categoryRequiredMissing
                ? "Select a subject to start uploading"
                : isDragging
                  ? `Drop files into "${selectedCategory?.title}"`
                  : `Drag & drop files into "${selectedCategory?.title}"`}
            </p>
            <p className="mt-1 text-xs text-[#7f88a6]">
              or <span className="font-medium text-[#6562f1]">click to browse</span> · PDF, Word (DOC/DOCX), or PowerPoint
            </p>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              className="sr-only"
              onChange={onInputChange}
              disabled={categoryRequiredMissing || isBusy}
            />
          </label>

          {items.some((it) => it.status !== "success") ? (
            <div className="space-y-2">
              {items
                .filter((it) => it.status !== "success")
                .map((it) => (
                  <UploadProgress
                    key={it.id}
                    file={it.file}
                    status={it.status}
                    progress={it.progress}
                    error={it.error}
                    onCancel={it.status === "uploading" ? () => onCancel(it) : undefined}
                    onRetry={it.status === "error" ? () => onRetry(it) : undefined}
                    onDismiss={it.status === "error" ? () => onDismiss(it) : undefined}
                  />
                ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
