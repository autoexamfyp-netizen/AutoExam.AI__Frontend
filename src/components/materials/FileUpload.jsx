import { useCallback, useId, useMemo, useRef, useState } from "react"
import { FolderPlus, UploadCloud } from "lucide-react"
import {
  ACCEPT_ATTR,
  getMaterialType,
  uploadToCloudinary,
  validateFile,
} from "../../services/cloudinaryService"
import { saveMaterial } from "../../services/materialService"
import UploadProgress from "./UploadProgress"

/**
 * Drag/drop + click upload for PDF / image / video.
 * Uploads files directly to Cloudinary, then saves metadata in Supabase
 * linked to the chosen category.
 *
 * @param {object} props
 * @param {(material: object) => void} [props.onUploaded]
 * @param {string} [props.folder]
 * @param {Array<{id: string, title: string}>} [props.categories]
 * @param {string|null} [props.selectedCategoryId]
 * @param {(id: string) => void} [props.onChangeCategory]
 * @param {() => void} [props.onCreateCategory]
 */
export default function FileUpload({
  onUploaded,
  folder = "autoexam/materials",
  categories = [],
  selectedCategoryId = null,
  onChangeCategory,
  onCreateCategory,
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

  const updateItem = useCallback((id, patch) => {
    setItems((curr) => curr.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  const startUpload = useCallback(
    async (item, categoryId, categoryName) => {
      const controller = new AbortController()
      updateItem(item.id, { status: "uploading", progress: 0, error: undefined, controller })

      try {
        console.log("📁 File Selected:", item.file)
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
          materialType: getMaterialType(item.file.type),
          mimeType: item.file.type,
          sizeBytes: result.bytes ?? item.file.size,
          originalFilename: result.original_filename,
          categoryId,
          categoryName,
        })

        updateItem(item.id, {
          status: "success",
          progress: 100,
          controller: null,
          categoryId,
          categoryName,
        })
        if (typeof onUploaded === "function") onUploaded(saved)
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

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#e7eaf3] bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor={selectId}
              className="block text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]"
            >
              Upload to category
            </label>
            <select
              id={selectId}
              value={selectedCategoryId ?? ""}
              onChange={(e) => {
                setShowCategoryError(false)
                onChangeCategory?.(e.target.value || null)
              }}
              className={`mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition focus:border-[#6562f1] ${
                showCategoryError && categoryRequiredMissing
                  ? "border-red-300"
                  : "border-[#e3e6ef]"
              }`}
            >
              <option value="" disabled>
                {categories.length ? "Choose a category…" : "No categories yet — create one"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          {onCreateCategory ? (
            <button
              type="button"
              onClick={onCreateCategory}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#5f4ce6] transition hover:bg-[#f6f7fc]"
            >
              <FolderPlus className="h-4 w-4" /> New category
            </button>
          ) : null}
        </div>
        {showCategoryError && categoryRequiredMissing ? (
          <p className="mt-2 text-xs text-red-600">Pick a category before uploading.</p>
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
        className={`flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
          categoryRequiredMissing
            ? "cursor-not-allowed border-[#dbe0ee] bg-[#fafbff] opacity-80"
            : isDragging
              ? "cursor-pointer border-[#6562f1] bg-[#f4f3ff]"
              : "cursor-pointer border-[#d8ddf0] bg-white hover:border-[#6562f1]/50 hover:bg-[#fafbff]"
        }`}
      >
        <UploadCloud className="h-10 w-10 text-[#6562f1]" />
        <p className="mt-3 text-sm font-semibold text-[#151d3a]">
          {categoryRequiredMissing
            ? "Pick a category to start uploading"
            : isDragging
              ? `Drop files into "${selectedCategory?.title}"`
              : `Drag & drop files into "${selectedCategory?.title}"`}
        </p>
        <p className="mt-1 text-xs text-[#7f88a6]">
          or <span className="font-medium text-[#6562f1]">click to browse</span> · PDF, JPG, PNG, MP4
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

      {items.length ? (
        <div className="space-y-2">
          {items.map((it) => (
            <UploadProgress
              key={it.id}
              file={it.file}
              status={it.status}
              progress={it.progress}
              error={it.error}
              onCancel={it.status === "uploading" ? () => onCancel(it) : undefined}
              onRetry={it.status === "error" ? () => onRetry(it) : undefined}
              onDismiss={it.status === "error" || it.status === "success" ? () => onDismiss(it) : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
