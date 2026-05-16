import { useEffect, useMemo, useRef } from "react"
import { CheckCircle2, FolderOpen, Loader2, Pencil } from "lucide-react"
import { noteWordCount, sanitizeNoteContent } from "./noteUtils"

const STATUS_LABEL = {
  idle: { text: "Saved", icon: CheckCircle2, tone: "muted" },
  dirty: { text: "Unsaved changes", icon: Pencil, tone: "warn" },
  saving: { text: "Saving…", icon: Loader2, tone: "info" },
  saved: { text: "Saved", icon: CheckCircle2, tone: "success" },
  error: { text: "Save failed", icon: CheckCircle2, tone: "error" },
}

function StatusPill({ status }) {
  const cfg = STATUS_LABEL[status] || STATUS_LABEL.idle
  const Icon = cfg.icon
  const cls =
    cfg.tone === "warn"
      ? "border-[#f3d28a] bg-[#fff7e8] text-[#bc8a30]"
      : cfg.tone === "info"
        ? "border-[#cfd9ff] bg-[#edf3ff] text-[#3f67c8]"
        : cfg.tone === "success"
          ? "border-[#cdebd9] bg-[#e8fbf3] text-[#1f9d67]"
          : cfg.tone === "error"
            ? "border-[#fbd8d8] bg-[#fdecec] text-[#c94a4a]"
            : "border-[#e3e6ef] bg-white text-[#7f88a6]"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Icon className={`h-3 w-3 ${status === "saving" ? "animate-spin" : ""}`} />
      {cfg.text}
    </span>
  )
}

function MarkdownView({ text }) {
  const html = useMemo(() => renderMarkdown(text || ""), [text])
  const clean = sanitizeNoteContent(text)
  if (!clean?.trim()) {
    return (
      <p className="rounded-xl border border-dashed border-[#dbe0ee] bg-[#fafbff] px-4 py-10 text-center text-sm text-[#7f88a6]">
        No course text yet. Click Edit to paste your lecture notes or study material.
      </p>
    )
  }
  return (
    <article
      className="prose prose-sm max-w-none rounded-xl border border-[#e7eaf3] bg-white p-4 text-[#1a2341]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function inline(s) {
  let out = escapeHtml(s)
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-[#f4f6fb] px-1 py-0.5 font-mono text-xs">$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?=$|[^*])/g, "$1<em>$2</em>")
  return out
}

function renderMarkdown(src) {
  const lines = sanitizeNoteContent(src).replace(/\r\n/g, "\n").split("\n")
  const blocks = []
  let buffer = []
  let inList = false

  const flushParagraph = () => {
    if (buffer.length) {
      blocks.push(`<p class="mt-2 leading-relaxed">${inline(buffer.join(" "))}</p>`)
      buffer = []
    }
  }
  const closeList = () => {
    if (inList) {
      blocks.push("</ul>")
      inList = false
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushParagraph()
      closeList()
      continue
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      flushParagraph()
      closeList()
      const level = h[1].length
      const cls =
        level === 1
          ? "mt-4 text-lg font-bold"
          : level === 2
            ? "mt-3 text-base font-semibold"
            : "mt-2 text-sm font-semibold"
      blocks.push(`<h${level} class="${cls}">${inline(h[2])}</h${level}>`)
      continue
    }
    const li = /^[-*]\s+(.*)$/.exec(line)
    if (li) {
      flushParagraph()
      if (!inList) {
        blocks.push('<ul class="ml-5 list-disc space-y-1 text-sm">')
        inList = true
      }
      blocks.push(`<li>${inline(li[1])}</li>`)
      continue
    }
    buffer.push(line)
  }
  flushParagraph()
  closeList()
  return blocks.join("\n")
}

/**
 * Course note editor — preview (read-only) or edit mode. No mixed mode toggles.
 */
export default function TextEditor({
  title,
  onTitleChange,
  content,
  onContentChange,
  categories = [],
  categoryId,
  onCategoryChange,
  categoryTitle,
  onSave,
  onCancel,
  onEdit,
  saving,
  disabled,
  isNewDraft = false,
  saveStatus = "idle",
  mode = "preview",
  displayTitle,
}) {
  const taRef = useRef(null)
  const cleanContent = sanitizeNoteContent(content)
  const len = cleanContent.length
  const words = noteWordCount(content)

  useEffect(() => {
    if (mode !== "edit") return
    const el = taRef.current
    if (!el) return
    const vh = typeof window !== "undefined" ? window.innerHeight : 800
    const maxH = Math.max(360, Math.min(900, Math.round(vh * 0.7)))
    const minH = window.innerWidth < 640 ? 220 : 280
    el.style.height = "auto"
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minH), maxH)}px`
  }, [content, mode])

  const canSave = useMemo(
    () => title.trim().length > 0 && categoryId && sanitizeNoteContent(content).length > 0,
    [title, content, categoryId],
  )

  const heading = displayTitle || title.trim() || "Untitled note"
  const status = saving ? "saving" : saveStatus

  return (
    <div className="min-w-0 max-w-full overflow-x-clip rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      {mode === "preview" ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef1f7] px-4 py-4 sm:px-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-[#151d3a] sm:text-xl">{heading}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#7f88a6]">
                <span className="inline-flex items-center gap-1">
                  <FolderOpen className="h-3.5 w-3.5 text-[#5f4ce6]" />
                  {categoryTitle || "No subject"}
                </span>
                <span aria-hidden>·</span>
                <span>{words.toLocaleString()} words</span>
                <span aria-hidden>·</span>
                <StatusPill status={status} />
              </p>
            </div>
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                disabled={disabled}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff] disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            ) : null}
          </div>
          <div className="p-4 sm:p-5">
            <MarkdownView text={content} />
          </div>
        </>
      ) : (
        <>
          <div className="border-b border-[#eef1f7] px-4 py-3 sm:px-5">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2]">
              Content title
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Enter a title for this note…"
                disabled={disabled}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm font-medium text-[#151d3a] outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/15 sm:text-[15px]"
              />
            </label>
            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2]">
              Subject
              <select
                value={categoryId ?? ""}
                onChange={(e) => onCategoryChange(e.target.value || null)}
                disabled={disabled}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/15"
              >
                <option value="" disabled>
                  Choose a subject…
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#7f88a6]">
              <StatusPill status={status} />
              {!isNewDraft && status !== "saving" ? (
                <span>Changes save automatically after you stop typing.</span>
              ) : null}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2]">
              Course notes
              <textarea
                ref={taRef}
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Paste lecture notes, chapter summaries, or study bullets here."
                disabled={disabled}
                rows={14}
                className="mt-1 block w-full min-w-0 resize-y overflow-auto rounded-xl border border-[#e3e6ef] bg-[#fafbff] px-3 py-2.5 font-mono text-[13px] leading-relaxed text-[#1a2341] outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/15 sm:text-sm"
                style={{ minHeight: "220px", maxHeight: "min(70vh, 900px)" }}
              />
            </label>
            <p className="mt-2 text-xs text-[#7f88a6]">
              {len.toLocaleString()} characters · {words.toLocaleString()} words
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef1f7] px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving || disabled}
              className="rounded-xl border border-[#e3e6ef] bg-white px-4 py-2 text-sm font-semibold text-[#313a58] hover:bg-[#fafbff] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || disabled || !canSave}
              className="rounded-xl bg-[#6562f1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a56e2] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
