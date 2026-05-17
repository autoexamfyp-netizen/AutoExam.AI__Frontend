import { useMemo, useState } from "react"
import { FileText, FolderOpen, Search } from "lucide-react"

const ALL_ID = "__all__"

function relative(when) {
  if (!when) return ""
  const d = new Date(when)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.round(diff / 60)}m`
  if (diff < 86400) return `${Math.round(diff / 3600)}h`
  if (diff < 604800) return `${Math.round(diff / 86400)}d`
  return d.toLocaleDateString()
}

/**
 * LEFT-rail content selector for the Generate Exam page.
 *
 * @param {object} props
 * @param {Array<{id:string,title:string,material_count?:number}>} props.categories
 * @param {Array<{id:string,title:string,content:string,category_id?:string|null,
 *                category?:{id:string,title:string},updated_at?:string}>} props.materials
 * @param {string|null} props.activeCategoryId   Category filter ('__all__'|<uuid>)
 * @param {(id: string) => void} props.onChangeCategory
 * @param {string|null} props.activeMaterialId
 * @param {(material: object) => void} props.onSelectMaterial
 * @param {Map<string, number>} [props.questionCounts]   text_material_id → question count
 * @param {string} [props.prefillFromTitle]  Banner when opened via ?noteId=
 */
export default function ContentPicker({
  categories,
  materials,
  activeCategoryId,
  onChangeCategory,
  activeMaterialId,
  onSelectMaterial,
  questionCounts,
  loading,
  prefillFromTitle,
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return materials
    return materials.filter(
      (m) =>
        (m.title || "").toLowerCase().includes(q) ||
        (m.content || "").toLowerCase().includes(q),
    )
  }, [materials, query])

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <header className="border-b border-[#eef1f7] p-3">
        <div className="flex items-center gap-2 px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
          <FolderOpen className="h-3.5 w-3.5" /> Subjects
        </div>
        <select
          value={activeCategoryId ?? ALL_ID}
          onChange={(e) => onChangeCategory(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-2 text-sm focus:border-[#6562f1] focus:outline-none"
        >
          <option value={ALL_ID}>All subjects</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa3c2]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search content…"
            className="w-full rounded-lg border border-[#e3e6ef] bg-white py-2 pl-8 pr-2 text-sm focus:border-[#6562f1] focus:outline-none"
          />
        </div>
      </header>

      {prefillFromTitle ? (
        <div className="mx-3 mt-2 rounded-lg border border-[#e3deff] bg-[#f4f3ff] px-3 py-2 text-xs font-medium text-[#5f4ce6]">
          Pre-filled from: {prefillFromTitle}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[#f1f3f8]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#dbe0ee] px-4 py-8 text-center">
            <p className="text-sm font-medium text-[#151d3a]">No course content saved yet</p>
            <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-[#7d86a5]">
              Head over to Materials → Course Notes to add your lecture text, then come back here to generate an
              exam from it.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((m) => {
              const active = m.id === activeMaterialId
              const count = questionCounts?.get(m.id) || 0
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMaterial(m)}
                    className={`group flex w-full flex-col rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-[#6562f1] bg-[#f1efff]"
                        : "border-transparent bg-white hover:border-[#e7eaf3] hover:bg-[#fafbff]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <FileText
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          active ? "text-[#5f4ce6]" : "text-[#7d86a5]"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-semibold ${
                            active ? "text-[#5f4ce6]" : "text-[#1a2341]"
                          }`}
                        >
                          {m.title || "Untitled"}
                        </p>
                        <p className="line-clamp-2 text-xs text-[#7f88a6]">
                          {(m.content || "").slice(0, 120)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-6 text-[11px] text-[#8a93ad]">
                      {m.category?.title ? (
                        <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 font-medium text-[#5d6580]">
                          {m.category.title}
                        </span>
                      ) : null}
                      {count > 0 ? (
                        <span className="rounded-full bg-[#e9f8f0] px-2 py-0.5 font-medium text-[#1f9d67]">
                          {count} q
                        </span>
                      ) : null}
                      <span className="ml-auto">{relative(m.updated_at)}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}

ContentPicker.ALL_ID = ALL_ID
