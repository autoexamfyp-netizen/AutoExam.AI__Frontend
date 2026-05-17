import { formatSourceSizeLabel } from "../../../utils/postGenMultiSource"

function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}
export default function PostGenSourcePanel({ summary, isMultiSource, multiSource, marksStatus, onChangeContent }) {
  if (isMultiSource && multiSource) {
    return (
      <aside className="flex h-[640px] flex-col rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
        <div className="min-w-0 flex-1 space-y-3 overflow-y-auto">
          <p className="text-sm font-semibold text-[#151d3a]">
            {multiSource.sources.length} sources used
          </p>
          <div className="space-y-3 border-t border-[#eef1f7] pt-3">
            {multiSource.sources.map((src) => {
              const sizeLabel = formatSourceSizeLabel(src.chars)
              return (
                <div key={src.key}>
                  <p className="break-words text-sm font-medium text-[#313a58]">{src.title}</p>
                  <p className="mt-0.5 text-xs text-[#7f88a6]">
                    {sizeLabel ? `${sizeLabel} - ` : ""}
                    {src.pct}%
                  </p>
                </div>
              )
            })}
          </div>
          {marksStatus ? (
            <div className="border-t border-[#eef1f7] pt-3 text-xs">
              <p className="text-[#7f88a6]">Target: {marksStatus.target} marks</p>
              <p className="mt-1 text-[#7f88a6]">Current: {marksStatus.current} marks</p>
              <p
                className={classNames(
                  "mt-1.5 font-medium",
                  marksStatus.tone === "balanced" ? "text-emerald-600" : "text-amber-600",
                )}
              >
                {marksStatus.message}
              </p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onChangeContent}
          className="mt-auto shrink-0 pt-3 text-left text-xs font-semibold text-[#5f4ce6] hover:text-[#4a46d4] hover:underline"
        >
          {"<- Change content"}
        </button>
      </aside>
    )
  }

  return (
    <aside className="flex h-[640px] flex-col rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-[#151d3a]">{summary.title}</p>
        {summary.chars != null ? (
          <p className="mt-2 text-xs text-[#7f88a6]">{summary.chars.toLocaleString()} chars used</p>
        ) : summary.subtitle ? (
          <p className="mt-2 text-xs text-[#7f88a6]">{summary.subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onChangeContent}
        className="mt-auto text-left text-xs font-semibold text-[#5f4ce6] hover:text-[#4a46d4] hover:underline"
      >
        {"<- Change content"}
      </button>
    </aside>
  )
}
