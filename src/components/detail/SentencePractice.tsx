import type { Crystal } from '../../types'

interface SentencePracticeProps {
  crystal: Crystal
  onPassed: () => void
}

export default function SentencePractice({ crystal, onPassed }: SentencePracticeProps) {
  const handleDone = () => {
    setTimeout(() => onPassed(), 600)
  }

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-white/25 text-xs tracking-widest shrink-0">整 句 输 出</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      <p className="text-white/30 text-[11px] text-center tracking-wider">朗读下面的英文句子</p>

      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
        <p className="text-xl font-bold text-white/85 leading-relaxed italic">
          {crystal.english}
        </p>
      </div>

<button
          onClick={handleDone}
          className="w-full py-3 rounded-full text-sm font-semibold tracking-wider text-white transition-all active:scale-95 min-h-[48px]"
          style={{
            background: 'linear-gradient(135deg, rgba(168,120,232,0.7), rgba(124,92,231,0.7))',
            boxShadow: '0 0 30px rgba(168,120,232,0.15)',
          }}
        >
          我念完了
        </button>
    </div>
  )
}
