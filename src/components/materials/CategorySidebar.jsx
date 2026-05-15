import { Folder, FolderPlus, Inbox, Layers, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"

const ALL_ID = "__all__"
const UNCAT_ID = "__uncategorized__"

/**
 * Category navigation rail.
 *
 * @param {object} props
 * @param {Array<{id: string, title: string, material_count?: number}>} props.categories
 * @param {string} props.activeId                         ALL_ID | UNCAT_ID | category.id
 * @param {(id: string) => void} props.onSelect
 * @param {() => void} props.onCreate
 * @param {(c: object) => void} [props.onEdit]
 * @param {(c: object) => void} [props.onDelete]
 * @param {boolean} [props.loading]
 * @param {number} [props.totalCount]
 * @param {number} [props.uncategorizedCount]
 */
export default function CategorySidebar({
  categories,
  activeId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  loading = false,
  totalCount = 0,
  uncategorizedCount = 0,
}) {
  const [openMenuId, setOpenMenuId] = useState(null)

  const closeMenu = () => setOpenMenuId(null)

  return (
    <aside className="flex h-[min(72vh,680px)] max-h-[min(72vh,680px)] flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white p-3 shadow-sm lg:h-[calc(90vh-12rem)] lg:max-h-[calc(90vh-12rem)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#eef1f7] px-2 pb-3 pt-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">Subjects</h2>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1 rounded-lg bg-[#6562f1] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#5a56e2]"
        >
          <FolderPlus className="h-3.5 w-3.5" /> New subject
        </button>
      </div>

      <nav className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]">
        <SidebarItem
          icon={Layers}
          label="All materials"
          count={totalCount}
          active={activeId === ALL_ID}
          onClick={() => onSelect(ALL_ID)}
        />
        <SidebarItem
          icon={Inbox}
          label="Uncategorized"
          count={uncategorizedCount}
          active={activeId === UNCAT_ID}
          onClick={() => onSelect(UNCAT_ID)}
        />

        <div className="my-2 border-t border-[#eef1f7]" />

        {loading ? (
          <div className="space-y-1.5 px-2 py-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-[#f1f3f8]" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-lg bg-[#fafbff] px-3 py-6 text-center">
            <p className="text-xs font-medium text-[#7f88a6]">No subjects yet</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#9aa3c2]">
              Use &ldquo;New subject&rdquo; above to create your first folder.
            </p>
          </div>
        ) : (
          categories.map((c) => (
            <div key={c.id} className="group relative">
              <SidebarItem
                icon={Folder}
                label={c.title}
                count={c.material_count ?? 0}
                active={activeId === c.id}
                onClick={() => onSelect(c.id)}
                trailing={
                  onEdit || onDelete ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === c.id ? null : c.id)
                      }}
                      className="ml-1 rounded p-1 text-[#9aa3c2] opacity-0 transition group-hover:opacity-100 hover:bg-[#f6f7fc] aria-expanded:opacity-100"
                      aria-label="Category options"
                      aria-expanded={openMenuId === c.id}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  ) : null
                }
              />
              {openMenuId === c.id ? (
                <>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={closeMenu}
                    className="fixed inset-0 z-10"
                  />
                  <div
                    role="menu"
                    className="absolute right-2 top-9 z-20 w-40 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white py-1 text-sm shadow-[0_8px_30px_rgba(15,23,48,0.12)]"
                  >
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => {
                          closeMenu()
                          onEdit(c)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#313a58] hover:bg-[#fafbff]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Rename
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={() => {
                          closeMenu()
                          onDelete(c)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#c94a4a] hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ))
        )}
      </nav>
    </aside>
  )
}

function SidebarItem({ icon: Icon, label, count, active, onClick, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
        active ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#313a58] hover:bg-[#f6f7fc]"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#5f4ce6]" : "text-[#7d86a5]"}`} />
      <span className="flex-1 truncate font-medium">{label}</span>
      <span
        className={`shrink-0 rounded-full px-2 text-[11px] font-semibold ${
          active ? "bg-white/70 text-[#5f4ce6]" : "bg-[#f1f3f8] text-[#5d6580]"
        }`}
      >
        {count}
      </span>
      {trailing}
    </button>
  )
}

CategorySidebar.ALL_ID = ALL_ID
CategorySidebar.UNCAT_ID = UNCAT_ID
