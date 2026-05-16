import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Eye,
  FileText,
  Pencil,
  Plus,
  Sparkles,
  StickyNote,
} from "lucide-react"
import NoteRowMenu from "./NoteRowMenu"
import { displayNoteTitle, noteWordCount } from "./noteUtils"

export { displayNoteTitle } from "./noteUtils"

function relTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diffMs = Date.now() - d.getTime()
  const sec = Math.round(diffMs / 1000)
  if (sec < 45) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const ACTION_BTN =
  "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#596286] transition hover:bg-white hover:text-[#151d3a]"

/**
 * Saved course notes — row actions: Preview, Edit, overflow (move / duplicate / export / delete).
 */
export default function ContentList({
  loading,
  items,
  selectedId,
  questionCounts,
  onPreview,
  onEdit,
  onNew,
  onMove,
  onDuplicate,
  onExport,
  onDelete,
  fillHeight = false,
  showHeader = true,
  emptyHint,
}) {
  const [openMenuId, setOpenMenuId] = useState(null)

  return (
    <div
      className={`flex min-h-0 flex-col rounded-2xl border border-[#e7eaf3] bg-white shadow-sm ${
        fillHeight ? "min-h-[min(56vh,640px)]" : ""
      }`}
    >
      {showHeader ? (
        <div className="flex items-center justify-between gap-2 border-b border-[#eef1f7] px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
            Saved notes {items?.length ? `· ${items.length}` : ""}
          </span>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-1 rounded-lg bg-[#6562f1] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#5a56e2]"
          >
            <Plus className="h-3.5 w-3.5" /> Add Notes
          </button>
        </div>
      ) : null}

      <div
        className={`flex-1 overflow-y-auto p-3 ${
          fillHeight ? "min-h-[min(48vh,560px)]" : "max-h-[min(520px,55vh)]"
        }`}
      >
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-[#f1f3f8]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-3 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4f3ff] text-[#6562f1]">
              <StickyNote className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[#151d3a]">No notes yet</p>
            <p className="mt-1 text-xs text-[#7f88a6]">
              {emptyHint || 'Click "+ Add Notes" to paste your first set of course notes.'}
            </p>
            <button
              type="button"
              onClick={onNew}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#6562f1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5a56e2]"
            >
              <Plus className="h-3.5 w-3.5" /> Add Notes
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((row) => {
              const isActive = selectedId === row.id
              const qCount = questionCounts?.get(row.id) ?? 0
              const noteTitle = displayNoteTitle(row)
              const words = noteWordCount(row.content)
              return (
                <li
                  key={row.id}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative flex items-stretch gap-4 rounded-2xl border px-4 py-3 transition ${
                    openMenuId === row.id ? "z-20" : ""
                  } ${
                    isActive
                      ? "border-[#cfc8ff] bg-[#f4f3ff] shadow-[0_2px_12px_rgba(95,76,230,0.08)]"
                      : "border-[#e7eaf3] bg-white hover:border-[#d8ddf0] hover:shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onPreview?.(row)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        isActive ? "bg-white text-[#5f4ce6]" : "bg-[#f6f7fc] text-[#7d86a5]"
                      }`}
                    >
                      <FileText className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span
                        className={`block truncate text-sm font-semibold leading-snug ${
                          isActive ? "text-[#5f4ce6]" : "text-[#151d3a]"
                        }`}
                        title={noteTitle || "Untitled note"}
                      >
                        {noteTitle || "Untitled note"}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        {row.category?.title ? (
                          <span className="inline-flex max-w-[10rem] truncate rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#5f4ce6] ring-1 ring-[#e3deff]">
                            {row.category.title}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-[#f1f3f8] px-2.5 py-0.5 text-[11px] font-medium text-[#7f88a6]">
                            Uncategorized
                          </span>
                        )}
                        <span className="inline-flex rounded-full bg-[#eef1f7] px-2.5 py-0.5 text-[11px] font-medium text-[#5d6580]">
                          {words.toLocaleString()} words
                        </span>
                        {qCount > 0 ? (
                          <span className="inline-flex rounded-full bg-[#eef1f7] px-2.5 py-0.5 text-[11px] font-semibold text-[#5d6580]">
                            {qCount} questions
                          </span>
                        ) : null}
                        <span className="text-[11px] text-[#9aa3c2]">{relTime(row.updated_at)}</span>
                      </span>
                    </span>
                  </button>

                  <div
                    className={`flex shrink-0 flex-wrap items-center justify-end gap-1 self-center rounded-xl p-1.5 sm:flex-nowrap ${
                      isActive ? "bg-white/80" : "bg-[#f6f7fc]"
                    }`}
                  >
                    <Link
                      to={`/teacher-dashboard/generate-exam?noteId=${row.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#6562f1] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#5a56e2]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate exam
                    </Link>
                    <button
                      type="button"
                      onClick={() => onPreview?.(row)}
                      className={`${ACTION_BTN} ${isActive ? "text-[#5f4ce6]" : ""}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit?.(row)}
                      className={ACTION_BTN}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <NoteRowMenu
                      row={row}
                      open={openMenuId === row.id}
                      onToggle={() => setOpenMenuId((id) => (id === row.id ? null : row.id))}
                      onClose={() => setOpenMenuId(null)}
                      onMove={onMove}
                      onDuplicate={onDuplicate}
                      onExport={onExport}
                      onDelete={onDelete}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
