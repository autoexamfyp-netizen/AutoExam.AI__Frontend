import { useState } from "react"
import { Copy, FileText, MoreVertical, Pencil, Plus, StickyNote, Trash2 } from "lucide-react"

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

function snippet(text, max = 140) {
  const t = (text || "").replace(/\s+/g, " ").trim()
  if (!t) return ""
  return t.length > max ? `${t.slice(0, max).trim()}…` : t
}

/**
 * Saved pasted-text entries — preview cards with row actions.
 *
 * @param {object} props
 * @param {boolean} props.loading
 * @param {object[]} props.items
 * @param {string|null} props.selectedId
 * @param {Map<string, number>} [props.questionCounts]
 * @param {(row: object) => void} props.onSelect
 * @param {() => void} props.onNew
 * @param {(row: object) => void} [props.onRename]
 * @param {(row: object) => void} [props.onDuplicate]
 * @param {(row: object) => void} [props.onDelete]
 */
export default function ContentList({
  loading,
  items,
  selectedId,
  questionCounts,
  onSelect,
  onNew,
  onRename,
  onDuplicate,
  onDelete,
}) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const closeMenu = () => setOpenMenuId(null)

  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-[#eef1f7] px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
          Saved notes {items?.length ? `· ${items.length}` : ""}
        </span>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-lg bg-[#6562f1] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#5a56e2]"
        >
          <Plus className="h-3.5 w-3.5" /> New content
        </button>
      </div>

      <div className="max-h-[min(520px,55vh)] flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-[#f1f3f8]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-3 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4f3ff] text-[#6562f1]">
              <StickyNote className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[#151d3a]">No content yet</p>
            <p className="mt-1 text-xs text-[#7f88a6]">
              Create a new note and paste your study text to start generating questions.
            </p>
            <button
              type="button"
              onClick={onNew}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#6562f1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5a56e2]"
            >
              <Plus className="h-3.5 w-3.5" /> Create new content
            </button>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {items.map((row) => {
              const isActive = selectedId === row.id
              const qCount = questionCounts?.get(row.id) ?? 0
              return (
                <li key={row.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onSelect(row)}
                    aria-current={isActive ? "true" : undefined}
                    className={`group flex w-full flex-col items-start gap-1.5 rounded-xl border px-3 py-2.5 text-left transition ${
                      isActive
                        ? "border-[#cfc8ff] bg-[#f4f3ff] shadow-[inset_0_0_0_1px_#cfc8ff]"
                        : "border-transparent hover:border-[#e7eaf3] hover:bg-[#fafbff]"
                    }`}
                  >
                    <div className="flex w-full items-start gap-2">
                      <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? "text-[#5f4ce6]" : "text-[#7d86a5]"}`} />
                      <span
                        className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                          isActive ? "text-[#5f4ce6]" : "text-[#151d3a]"
                        }`}
                        title={row.title}
                      >
                        {row.title || "Untitled"}
                      </span>
                      <span
                        type="button"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === row.id ? null : row.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === row.id ? null : row.id)
                          }
                        }}
                        className="-mr-1 rounded p-1 text-[#9aa3c2] opacity-0 transition group-hover:opacity-100 hover:bg-white aria-expanded:opacity-100"
                        aria-label="Note options"
                        aria-expanded={openMenuId === row.id}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    {row.content ? (
                      <p className="line-clamp-2 text-xs leading-snug text-[#7f88a6]">{snippet(row.content)}</p>
                    ) : (
                      <p className="text-xs italic text-[#9aa3c2]">Empty draft</p>
                    )}
                    <div className="flex w-full flex-wrap items-center gap-1.5 text-[11px] text-[#7f88a6]">
                      {row.category?.title ? (
                        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 font-semibold text-[#5f4ce6] ring-1 ring-[#e3deff]">
                          {row.category.title}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-[#f1f3f8] px-2 py-0.5 font-medium">Uncategorized</span>
                      )}
                      {qCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-[#eef1f7] px-2 py-0.5 font-semibold text-[#5d6580]">
                          {qCount} q
                        </span>
                      ) : null}
                      <span className="ml-auto">{relTime(row.updated_at)}</span>
                    </div>
                  </button>

                  {openMenuId === row.id ? (
                    <>
                      <button
                        type="button"
                        aria-label="Close menu"
                        onClick={closeMenu}
                        className="fixed inset-0 z-10 cursor-default"
                      />
                      <div
                        role="menu"
                        className="absolute right-2 top-9 z-20 w-40 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white py-1 text-sm shadow-[0_8px_30px_rgba(15,23,48,0.12)]"
                      >
                        {onRename ? (
                          <button
                            type="button"
                            onClick={() => {
                              closeMenu()
                              onRename(row)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#313a58] hover:bg-[#fafbff]"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Rename
                          </button>
                        ) : null}
                        {onDuplicate ? (
                          <button
                            type="button"
                            onClick={() => {
                              closeMenu()
                              onDuplicate(row)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#313a58] hover:bg-[#fafbff]"
                          >
                            <Copy className="h-3.5 w-3.5" /> Duplicate
                          </button>
                        ) : null}
                        {onDelete ? (
                          <button
                            type="button"
                            onClick={() => {
                              closeMenu()
                              onDelete(row)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#c94a4a] hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
