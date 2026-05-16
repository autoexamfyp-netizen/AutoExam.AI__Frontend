import { useState } from "react"
import {
  ExternalLink,
  FileText,
  FolderInput,
  MoreVertical,
  Pencil,
  Presentation,
  Trash2,
} from "lucide-react"
import { formatSize, materialViewUrl } from "../../services/cloudinaryService"

const ICON = {
  pdf: FileText,
  ppt: Presentation,
  other: FileText,
}

function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

/**
 * Material library card — Preview + overflow menu (Open, Rename, Move, Delete).
 */
export default function MaterialCard({ material, onPreview, onRename, onMove, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const Icon = ICON[material.material_type] ?? FileText
  const openUrl = materialViewUrl(material)

  const closeMenu = () => setMenuOpen(false)

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white shadow-sm transition hover:shadow-md">
      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-[#f4f6fb] text-[#6562f1]">
        <Icon className="h-10 w-10" />
        <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5f4ce6] shadow-sm">
          {material.material_type === "ppt" ? "Slides" : material.material_type}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 pr-8">
          <p className="truncate text-sm font-semibold text-[#151d3a]" title={material.title}>
            {material.title}
          </p>
          <p className="mt-0.5 text-xs text-[#7f88a6]">
            {formatSize(material.size_bytes ?? 0)} · {formatDate(material.created_at)}
          </p>
          {material.category?.title ? (
            <span className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-[#f1efff] px-2 py-0.5 text-[11px] font-semibold text-[#5f4ce6]">
              {material.category.title}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onPreview?.(material)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1.5 text-xs font-medium text-[#313a58] transition hover:bg-[#fafbff]"
          >
            Preview
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e6ef] bg-white text-[#596286] transition hover:bg-[#fafbff]"
              aria-label="More actions"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={closeMenu}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div
                  role="menu"
                  className="absolute bottom-full right-0 z-20 mb-1 w-44 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white py-1 text-sm shadow-[0_8px_30px_rgba(15,23,48,0.12)]"
                >
                  <a
                    href={openUrl}
                    target="_blank"
                    rel="noreferrer"
                    role="menuitem"
                    onClick={closeMenu}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#313a58] hover:bg-[#fafbff]"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    Open
                  </a>
                  {onRename ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeMenu()
                        onRename(material)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#313a58] hover:bg-[#fafbff]"
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                      Rename
                    </button>
                  ) : null}
                  {onMove ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeMenu()
                        onMove(material)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#313a58] hover:bg-[#fafbff]"
                    >
                      <FolderInput className="h-3.5 w-3.5 shrink-0" />
                      Move to subject
                    </button>
                  ) : null}
                  {onDelete ? (
                    <>
                      <div className="mx-2 border-t border-[#eef1f7]" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          closeMenu()
                          onDelete(material)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#c94a4a] hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
