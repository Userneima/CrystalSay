interface ProgressBarProps {
  step: number
  total: number
  labels: string[]
}

export default function ProgressBar({ step, total, labels }: ProgressBarProps) {
  return (
    <div className="w-full mx-auto">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={`w-full h-1 rounded-full transition-colors ${
                i < step ? 'bg-white/40' : i === step ? 'bg-white/20' : 'bg-white/[0.06]'
              }`}
            />
            <span
              className={`text-[11px] sm:text-[10px] tracking-wider transition-colors ${
                i <= step ? 'text-white/50' : 'text-white/15'
              }`}
            >
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
