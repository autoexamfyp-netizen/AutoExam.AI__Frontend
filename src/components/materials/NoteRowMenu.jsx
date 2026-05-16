import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Copy, Download, FolderInput, MoreVertical, Trash2 } from "lucide-react"

const ACTION_BTN =
  "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#596286] transition hover:bg-white hover:text-[#151d3a]"

const MENU_WIDTH = 192
const MENU_EST_HEIGHT = 220

/**
 * Overflow menu for a note row — rendered in a portal so it is not clipped by scroll areas.
 */
export default function NoteRowMenu({
  row,
  open,
  onToggle,
  onClose,
  onMove,
  onDuplicate,
  onExport,
  onDelete,
}) {
  const anchorRef = useRef(null)
  const [coords, setCoords] = useState(null)

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }

    const placeMenu = () => {
      const el = anchorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const gap = 6
      let top = rect.bottom + gap
      let left = rect.right - MENU_WIDTH

      if (left < 8) left = 8
      if (left + MENU_WIDTH > window.innerWidth - 8) {
        left = window.innerWidth - MENU_WIDTH - 8
      }
      if (top + MENU_EST_HEIGHT > window.innerHeight - 8) {
        top = Math.max(8, rect.top - MENU_EST_HEIGHT - gap)
      }

      setCoords({ top, left })
    }

    placeMenu()
    window.addEventListener("resize", placeMenu)
    window.addEventListener("scroll", placeMenu, true)
    return () => {
      window.removeEventListener("resize", placeMenu)
      window.removeEventListener("scroll", placeMenu, true)
    }
  }, [open])

  const menuBody = (
    <>
      {onMove ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            onMove(row)
          }}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[#313a58] hover:bg-[#fafbff]"
        >
          <FolderInput className="h-3.5 w-3.5 shrink-0" />
          Move to subject
        </button>
      ) : null}
      {onDuplicate ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            onDuplicate(row)
          }}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[#313a58] hover:bg-[#fafbff]"
        >
          <Copy className="h-3.5 w-3.5 shrink-0" />
          Duplicate
        </button>
      ) : null}
      {onExport ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            onExport(row)
          }}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[#313a58] hover:bg-[#fafbff]"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          Export as Text
        </button>
      ) : null}
      {onDelete ? (
        <>
          <div className="mx-2 border-t border-[#eef1f7]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose()
              onDelete(row)
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[#c94a4a] hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            Delete
          </button>
        </>
      ) : null}
    </>
  )

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        className={`${ACTION_BTN} px-2 ${open ? "bg-white text-[#151d3a] ring-1 ring-[#d8ddf0]" : ""}`}
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && coords
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close menu"
                onClick={onClose}
                className="fixed inset-0 z-[190] cursor-default bg-transparent"
              />
              <div
                role="menu"
                className="fixed z-[200] w-48 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white py-1 text-sm shadow-[0_12px_40px_rgba(15,23,48,0.16)]"
                style={{ top: coords.top, left: coords.left }}
              >
                {menuBody}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
