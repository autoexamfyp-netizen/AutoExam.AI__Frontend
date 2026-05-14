import { useEffect, useMemo, useRef } from "react"
import { CheckCircle2, Eye, Loader2, Pencil, Save } from "lucide-react"

const STATUS_LABEL = {
  idle: { text: "Saved", icon: CheckCircle2, tone: "muted" },
  dirty: { text: "Unsaved changes", icon: Pencil, tone: "warn" },
  saving: { text: "Saving…", icon: Loader2, tone: "info" },
  saved: { text: "Saved ✓", icon: CheckCircle2, tone: "success" },
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

/**
 * Very small, dependency-free Markdown-ish renderer for the preview panel.
 * Supports: ATX headings (#, ##, ###), bullet lists (- / *), bold (**),
 * italic (*), inline code (`), and paragraphs. Anything else is text.
 *
 * @param {{ text: string }} props
 */
function MarkdownView({ text }) {
  const html = useMemo(() => renderMarkdown(text || ""), [text])
  if (!text?.trim()) {
    return (
      <p className="rounded-xl border border-dashed border-[#dbe0ee] bg-[#fafbff] px-4 py-8 text-center text-sm text-[#7f88a6]">
        Nothing to preview yet — paste content in the editor tab.
      </p>
    )
  }
  return (
    <article
      className="prose prose-sm max-w-none rounded-xl border border-[#e7eaf3] bg-white p-4 text-[#1a2341]"
      // sanitized output of trusted user content (own teacher content), see renderMarkdown
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
  const lines = src.replace(/\r\n/g, "\n").split("\n")
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
 * Title + large textarea for pasted study content (no PDF extraction).
 * Sticky toolbar with save status, Edit/Preview tabs.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {(v: string) => void} props.onTitleChange
 * @param {string} props.content
 * @param {(v: string) => void} props.onContentChange
 * @param {Array<{id: string, title: string}>} props.categories
 * @param {string|null} props.categoryId
 * @param {(id: string|null) => void} props.onCategoryChange
 * @param {() => void} props.onSave
 * @param {boolean} props.saving
 * @param {boolean} props.disabled
 * @param {boolean} [props.isNewDraft]
 * @param {"idle"|"dirty"|"saving"|"saved"|"error"} [props.saveStatus]
 * @param {"edit"|"preview"} [props.mode]
 * @param {(m: "edit"|"preview") => void} [props.onChangeMode]
 */
export default function TextEditor({
  title,
  onTitleChange,
  content,
  onContentChange,
  categories,
  categoryId,
  onCategoryChange,
  onSave,
  saving,
  disabled,
  isNewDraft = false,
  saveStatus = "idle",
  mode = "edit",
  onChangeMode,
}) {
  const taRef = useRef(null)
  const len = content?.length ?? 0
  const words = useMemo(() => (content?.trim() ? content.trim().split(/\s+/).length : 0), [content])

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
    () => title.trim().length > 0 && categoryId && content.trim().length > 0,
    [title, content, categoryId],
  )

  const missingMsg = useMemo(() => {
    const missing = []
    if (!title.trim()) missing.push("title")
    if (!categoryId) missing.push("category")
    if (!content.trim()) missing.push("content")
    return missing.length ? `Add a ${missing.join(", ")} to save.` : ""
  }, [title, categoryId, content])

  const handleSaveClick = () => {
    console.log("🖱️ Save button clicked", { canSave, missingMsg, hasOnSave: typeof onSave === "function" })
    onSave?.()
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-clip rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-t-2xl border-b border-[#eef1f7] bg-white/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-4 lg:px-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
          {isNewDraft ? "New draft" : "Editing"}
        </span>
        <StatusPill status={saving ? "saving" : saveStatus} />

        <div className="ml-auto inline-flex rounded-lg border border-[#e3e6ef] bg-white p-0.5">
          <button
            type="button"
            onClick={() => onChangeMode?.("edit")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              mode === "edit" ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#596286] hover:bg-[#fafbff]"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={() => onChangeMode?.("preview")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              mode === "preview" ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#596286] hover:bg-[#fafbff]"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        </div>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={saving || disabled}
          title={canSave ? "Save now" : missingMsg}
          aria-disabled={!canSave || saving || disabled}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 ${
            canSave ? "bg-[#151d3a] hover:bg-[#252f55]" : "bg-[#9aa3c2] hover:bg-[#8a93ad]"
          }`}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="min-w-0 max-w-full p-3 sm:p-5 lg:p-6">
        <div className="flex min-w-0 max-w-full flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end">
          <label className="block min-w-0 flex-1 scroll-mt-32 text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2] sm:text-xs">
            Content title
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Week 4 — Graph algorithms"
              disabled={disabled}
              className="mt-1 h-11 w-full min-w-0 max-w-full rounded-xl border border-[#e3e6ef] px-3 text-sm font-medium text-[#151d3a] outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/15 sm:text-[15px]"
            />
          </label>
          <label className="block min-w-0 max-w-full scroll-mt-32 text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2] sm:text-xs lg:w-56 xl:w-64">
            Category
            <select
              value={categoryId ?? ""}
              onChange={(e) => onCategoryChange(e.target.value || null)}
              disabled={disabled}
              className="mt-1 h-11 w-full min-w-0 max-w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/15"
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {mode === "edit" ? (
          <>
            <label className="mt-4 block scroll-mt-32 text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2] sm:text-xs">
              Paste your notes (Markdown-friendly plain text)
            </label>
            <textarea
              ref={taRef}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Paste lecture notes, chapter summaries, or study bullets here. Question generation uses this text only — PDFs uploaded elsewhere are not parsed."
              disabled={disabled}
              rows={14}
              className="mt-1 block w-full min-w-0 max-w-full scroll-mt-32 resize-y overflow-auto rounded-xl border border-[#e3e6ef] bg-[#fafbff] px-3 py-2.5 font-mono text-[13px] leading-relaxed text-[#1a2341] outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/15 sm:text-sm lg:text-[15px] lg:leading-7"
              style={{ minHeight: "220px", maxHeight: "min(70vh, 900px)" }}
            />
          </>
        ) : (
          <div className="mt-4 min-w-0 max-w-full">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2] sm:text-xs">Preview</span>
            <div className="mt-1 min-w-0 max-w-full overflow-auto">
              <MarkdownView text={content} />
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 text-xs text-[#7f88a6] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{len.toLocaleString()} characters</span>
            <span aria-hidden="true">·</span>
            <span>{words.toLocaleString()} words</span>
          </div>
          <span className="text-[#9aa3c2]">
            {isNewDraft
              ? "Draft will be saved when you click Save."
              : "Edits autosave a few seconds after you stop typing."}
          </span>
        </div>
      </div>
    </div>
  )
}
