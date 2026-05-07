import { useEffect, useRef, useState } from "react"

/**
 * Fixed pixel height + measured width for Recharts. Avoids ResponsiveContainer
 * resize ↔ render loops that cause jittery chart sizing.
 *
 * @param {object} props
 * @param {number} props.heightPx — chart height in CSS pixels
 * @param {(width: number, height: number) => import('react').ReactNode} props.children
 */
export default function StableChartBox({ heightPx, className = "", children }) {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: heightPx })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let raf = 0
    const commit = () => {
      const rect = el.getBoundingClientRect()
      const w = Math.max(0, Math.floor(rect.width))
      const h = heightPx
      setSize((prev) => {
        if (prev.height !== h) return { width: w, height: h }
        if (Math.abs(prev.width - w) <= 1) return prev
        return { width: w, height: h }
      })
    }

    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(commit)
    }

    const ro = new ResizeObserver(onResize)
    ro.observe(el)
    commit()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [heightPx])

  return (
    <div
      ref={ref}
      className={`w-full min-w-0 max-w-full overflow-hidden ${className}`}
      style={{ height: heightPx, minHeight: heightPx }}
    >
      {size.width > 0 ? children(size.width, size.height) : null}
    </div>
  )
}
