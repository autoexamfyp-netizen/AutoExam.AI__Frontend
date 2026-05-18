import { apiGet } from "./apiClient"

/**
 * Cloudinary upload service (browser, unsigned).
 *
 * Files are sent directly from the browser to Cloudinary using an unsigned upload preset.
 * No credentials/api secret are exposed — the API secret must live only on the backend.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const MAX_MB = Number(import.meta.env.VITE_CLOUDINARY_MAX_MB ?? 50)

export const ALLOWED_MIME = {
  pdf: ["application/pdf"],
  ppt: [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  doc: [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
}

const EXT_TO_MIME = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

const FLAT_ALLOWED = [...ALLOWED_MIME.pdf, ...ALLOWED_MIME.ppt, ...ALLOWED_MIME.doc]

export const ACCEPT_ATTR =
  ".pdf,.ppt,.pptx,.doc,.docx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

/**
 * Infer MIME from extension when the browser leaves file.type empty (common for .docx).
 * @param {string} filename
 */
export function mimeFromFilename(filename) {
  const ext = String(filename || "")
    .split(".")
    .pop()
    ?.toLowerCase()
  return ext && EXT_TO_MIME[ext] ? EXT_TO_MIME[ext] : ""
}

/**
 * Returns a normalized "material_type" for a given file mime type.
 * @param {string} mime
 * @param {string} [filename]
 * @returns {"pdf"|"ppt"|"doc"|"other"}
 */
export function getMaterialType(mime, filename) {
  const resolved = mime || mimeFromFilename(filename)
  if (ALLOWED_MIME.pdf.includes(resolved)) return "pdf"
  if (ALLOWED_MIME.ppt.includes(resolved)) return "ppt"
  if (ALLOWED_MIME.doc.includes(resolved)) return "doc"
  return "other"
}

/**
 * Resolve type from DB row or filename/URL (older rows may lack material_type).
 * @param {{ material_type?: string, original_filename?: string, title?: string, file_url?: string, public_id?: string }} material
 * @returns {"pdf"|"ppt"|"doc"|"other"}
 */
export function inferMaterialType(material) {
  const stored = material?.material_type
  if (stored === "pdf" || stored === "ppt" || stored === "doc") return stored
  const hint = [
    material?.original_filename,
    material?.title,
    material?.public_id,
    material?.file_url,
  ]
    .filter(Boolean)
    .join(" ")
  if (/\.pdf(\?|#|$)/i.test(hint)) return "pdf"
  if (/\.pptx?(\?|#|$)/i.test(hint)) return "ppt"
  if (/\.docx?(\?|#|$)/i.test(hint)) return "doc"
  return "other"
}

/**
 * Validate a File against allowed types and max size.
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateFile(file) {
  if (!file) return { ok: false, error: "No file selected" }

  const mime = file.type || mimeFromFilename(file.name)
  if (!FLAT_ALLOWED.includes(mime)) {
    console.error("❌ Invalid File Type:", file.type, file.name)
    return {
      ok: false,
      error: "Unsupported file type. Allowed: PDF, Word (DOC/DOCX), and PowerPoint (PPT/PPTX).",
    }
  }

  const maxBytes = MAX_MB * 1024 * 1024
  if (file.size > maxBytes) {
    console.error("❌ File too large:", file.name, file.size)
    return { ok: false, error: `File exceeds ${MAX_MB} MB limit.` }
  }

  console.log("✅ File Validation Passed:", { name: file.name, type: file.type, sizeKB: Math.round(file.size / 1024) })
  return { ok: true }
}

/**
 * Format bytes for UI.
 * @param {number} bytes
 */
export function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Upload a single file to Cloudinary with progress reporting.
 *
 * @param {File} file
 * @param {object} [opts]
 * @param {(percent: number) => void} [opts.onProgress] 0..100
 * @param {string} [opts.folder]               Optional Cloudinary folder
 * @param {AbortSignal} [opts.signal]          Optional abort signal
 * @returns {Promise<{
 *   secure_url: string,
 *   public_id: string,
 *   resource_type: string,
 *   format: string,
 *   bytes: number,
 *   original_filename: string,
 *   width?: number,
 *   height?: number,
 *   duration?: number,
 *   raw: object,
 * }>}
 */
export function uploadToCloudinary(file, opts = {}) {
  const { onProgress, folder, signal } = opts

  if (!CLOUD_NAME) {
    return Promise.reject(new Error("Cloudinary cloud name is not configured (VITE_CLOUDINARY_CLOUD_NAME)."))
  }
  if (!UPLOAD_PRESET || UPLOAD_PRESET === "Add Upload Preset") {
    return Promise.reject(
      new Error("Cloudinary upload preset is not configured. Set VITE_CLOUDINARY_UPLOAD_PRESET in Frontend/.env."),
    )
  }

  // PDF/PPT must use raw delivery — auto/upload stores PDFs as "image" and breaks preview.
  const resourceType = "raw"
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`
  const form = new FormData()
  form.append("file", file)
  form.append("upload_preset", UPLOAD_PRESET)
  // access_mode must be set on the upload preset in Cloudinary (unsigned uploads cannot pass it).
  if (folder) form.append("folder", folder)

  console.log("☁️ Uploading to Cloudinary (raw)...", { name: file.name, type: file.type, bytes: file.size })

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", endpoint)

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable || typeof onProgress !== "function") return
      const pct = Math.round((evt.loaded / evt.total) * 100)
      onProgress(pct)
    }

    xhr.onerror = () => {
      console.error("❌ Upload Failed: network error")
      reject(new Error("Network error while uploading to Cloudinary."))
    }

    xhr.onabort = () => {
      console.warn("[warning] Upload aborted")
      reject(new DOMException("Upload aborted", "AbortError"))
    }

    xhr.onload = () => {
      let data
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        console.error("❌ Upload Failed: invalid JSON response")
        reject(new Error("Cloudinary returned an invalid response."))
        return
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const message = data?.error?.message || `Upload failed with status ${xhr.status}`
        console.error("❌ Upload Failed:", message)
        reject(new Error(message))
        return
      }

      console.log("✅ Cloudinary Upload Success:", { public_id: data.public_id, resource_type: data.resource_type })
      console.log("🔗 Secure URL:", data.secure_url)
      console.log("🆔 Public ID:", data.public_id)

      resolve({
        secure_url: data.secure_url,
        public_id: data.public_id,
        resource_type: data.resource_type,
        format: data.format,
        bytes: data.bytes,
        original_filename: data.original_filename || file.name,
        width: data.width,
        height: data.height,
        duration: data.duration,
        raw: data,
      })
    }

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true })
    }

    xhr.send(form)
  })
}

/**
 * Direct delivery URL for a stored material (no fl_inline — that causes HTTP 400 on PDFs).
 *
 * @param {string} secureUrl
 * @param {{ resourceType?: string, materialType?: string }} [opts]
 */
export function deliveryUrl(secureUrl, opts = {}) {
  if (!secureUrl) return secureUrl

  const { resourceType, materialType } = opts
  let url = secureUrl.replace("/upload/fl_inline/", "/upload/")

  if (resourceType === "raw" || url.includes("/raw/upload/")) {
    return url
  }

  const isDocument =
    materialType === "pdf" ||
    materialType === "ppt" ||
    materialType === "doc" ||
    /\.(pdf|pptx?|docx?)(\?|#|$)/i.test(url)

  if (isDocument) {
    if (url.includes("/image/upload/")) url = url.replace("/image/upload/", "/raw/upload/")
    if (url.includes("/video/upload/")) url = url.replace("/video/upload/", "/raw/upload/")
  }

  return url
}

/**
 * View/open URL for a material row from Supabase.
 * @param {{ file_url: string, resource_type?: string, material_type?: string }} material
 */
export function materialViewUrl(material) {
  if (!material?.file_url) return material?.file_url ?? ""
  return deliveryUrl(material.file_url, {
    resourceType: material.resource_type,
    materialType: material.material_type,
  })
}

/**
 * Resolve a preview-safe URL (signed via backend when configured).
 * @param {{ id?: string, file_url?: string, resource_type?: string, material_type?: string }} material
 */
export async function resolveMaterialViewUrl(material) {
  if (!material) return ""
  const direct = materialViewUrl(material)
  if (!material.id || !direct) return direct

  try {
    const out = await apiGet(`/api/materials/${material.id}/view-url`)
    const fromApi = out?.url
    // Only replace the direct URL when the API returns a versioned Cloudinary path.
    if (fromApi && /\/upload\/v\d+\//.test(fromApi)) return fromApi
  } catch (e) {
    console.warn("[warning] View URL API failed, using stored file_url:", e?.message)
  }
  return direct
}

/** Office Online embed for PowerPoint / Word (URL must be reachable by Microsoft). */
export function officeEmbedUrl(viewUrl) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewUrl)}`
}

/** @deprecated Use officeEmbedUrl */
export function pptEmbedUrl(viewUrl) {
  return officeEmbedUrl(viewUrl)
}

/**
 * PDF preview src — use the delivery URL directly in an iframe/object (browser native PDF viewer).
 * @param {string} viewUrl
 */
export function pdfPreviewSrc(viewUrl) {
  return viewUrl
}

/** @deprecated Use pdfPreviewSrc — Google gview often cannot fetch Cloudinary URLs. */
export function pdfEmbedUrl(viewUrl) {
  return pdfPreviewSrc(viewUrl)
}

/** @deprecated Use materialViewUrl — fl_inline breaks PDF preview on Cloudinary. */
export function inlineUrl(secureUrl, opts) {
  if (secureUrl && typeof secureUrl === "object" && secureUrl.file_url) {
    return materialViewUrl(secureUrl)
  }
  return deliveryUrl(secureUrl, opts)
}

/**
 * TODO: Cloudinary asset deletion requires the API secret and must be performed
 * server-side (e.g., in Backend) using the Admin API or a signed `destroy` call.
 *
 * Until that endpoint exists, calling this will only remove the metadata row
 * via materialService.deleteMaterial — the file remains on Cloudinary.
 */
export async function deleteFromCloudinary(/* publicId, resourceType */) {
  console.warn("ℹ️ Cloudinary delete not implemented client-side (requires server-signed call). TODO: backend endpoint.")
  return { ok: false, skipped: true }
}
