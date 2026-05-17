function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

export default function ModeTab({ children, active, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
        active
          ? "border-[#6562f1] bg-[#f1efff] text-[#5f4ce6]"
          : "border-[#e3e6ef] bg-white text-[#5d6580] hover:bg-[#fafbff]",
      )}
    >
      {icon}
      {children}
    </button>
  )
}
