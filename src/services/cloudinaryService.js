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
}

const FLAT_ALLOWED = [...ALLOWED_MIME.pdf, ...ALLOWED_MIME.ppt]

export const ACCEPT_ATTR =
  ".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"

/**
 * Returns a normalized "material_type" for a given file mime type.
 * @param {string} mime
 * @returns {"pdf"|"ppt"|"other"}
 */
export function getMaterialType(mime) {
  if (ALLOWED_MIME.pdf.includes(mime)) return "pdf"
  if (ALLOWED_MIME.ppt.includes(mime)) return "ppt"
  return "other"
}

/**
 * Validate a File against allowed types and max size.
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateFile(file) {
  if (!file) return { ok: false, error: "No file selected" }

  if (!FLAT_ALLOWED.includes(file.type)) {
    console.error("❌ Invalid File Type:", file.type, file.name)
    return { ok: false, error: "Unsupported file type. Allowed: PDF and PowerPoint (PPT/PPTX)." }
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
    /\.(pdf|pptx?)(\?|#|$)/i.test(url)

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

/** Office Online embed for PowerPoint files (public Cloudinary URL required). */
export function pptEmbedUrl(viewUrl) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewUrl)}`
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
