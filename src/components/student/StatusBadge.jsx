const STYLES = {
  available: "bg-[#e8fbf3] text-[#1f9d67]",
  upcoming: "bg-[#fff7e8] text-[#bc8a30]",
  completed: "bg-[#edf3ff] text-[#3f67c8]",
  expired: "bg-[#f3f4f8] text-[#8a93ad]",
}

/**
 * @param {object} props
 * @param {'available'|'upcoming'|'completed'|'expired'|string} props.status
 * @param {string} [props.label] — override display text
 */
export default function StatusBadge({ status, label }) {
  const cls = STYLES[status] ?? "bg-[#f1f3f8] text-[#5a6178]"
  const text =
    label ??
    (status === "available"
      ? "Available"
      : status === "upcoming"
        ? "Upcoming"
        : status === "completed"
          ? "Completed"
          : status === "expired"
            ? "Expired"
            : status)

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>{text}</span>
  )
}
