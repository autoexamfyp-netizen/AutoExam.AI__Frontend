import Spinner from "./Spinner"

/**
 * Standard full-page loading shell (session checks, route gates, heavy async).
 */
export default function FullPageLoader({ title = "Loading", subtitle = "Please wait…", footer = null, className = "" }) {
  return (
    <main className={`grid min-h-screen place-items-center bg-[#f3f5fb] px-6 ${className}`}>
      <div className="flex min-h-[200px] w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-[#e3e6ef] bg-white px-8 py-10 text-center shadow-sm transition-opacity duration-200">
        <Spinner size="lg" label={title} />
        <h1 className="mt-6 text-xl font-semibold text-[#141a32]">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-[#6d7491]">{subtitle}</p> : null}
        {footer ? <div className="mt-4 w-full text-left">{footer}</div> : null}
      </div>
    </main>
  )
}
