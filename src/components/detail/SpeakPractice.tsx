import { useState } from 'react'
import type { Crystal, Theme } from '../../types'
import { THEME_COLORS } from '../../utils/themeMapping'

interface SpeakPracticeProps {
  crystal: Crystal
  onComplete: () => void
}

export default function SpeakPractice({ crystal, onComplete }: SpeakPracticeProps) {
  const [done, setDone] = useState(false)
  const theme = THEME_COLORS[crystal.theme]

  const handleDone = () => {
    setDone(true)
    onComplete()
  }

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-8">
      {/* Crystal icon */}
      <div className="relative">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, ${theme.glow}22, transparent 70%)`,
            boxShadow: `0 0 60px ${theme.glow}33`,
          }}
        >
          <div
            className="w-14 h-14"
            style={{
              background: `linear-gradient(145deg, ${theme.glow}, ${theme.primary})`,
              clipPath: 'polygon(50% 0%, 90% 30%, 78% 88%, 22% 88%, 10% 30%)',
              filter: `drop-shadow(0 0 12px ${theme.glow})`,
            }}
          />
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
          <div
            className="absolute w-1.5 h-1.5 rounded-full top-0 left-1/2 -translate-x-1/2"
            style={{ background: theme.glow, boxShadow: `0 0 6px ${theme.glow}` }}
          />
        </div>
      </div>

      {/* Chinese prompt */}
      <p className="text-white/50 text-sm tracking-wider">请根据中文提示，开口说出英文句子</p>
      <p className="text-2xl font-bold text-white text-center leading-relaxed">
        {crystal.chinese}
      </p>

      {/* Hidden English area */}
      <div className="w-full p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-[#02030a]/90">
          <div
            className="w-16 h-16 rounded-full opacity-20"
            style={{
              background: `radial-gradient(circle, ${theme.glow}, transparent 70%)`,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </div>
        <p className="text-white/10 text-lg font-mono blur-sm select-none">
          {crystal.english}
        </p>
      </div>

      {/* Done button */}
      {!done ? (
        <button
          onClick={handleDone}
          className="px-8 py-3 rounded-2xl font-bold text-sm transition-all"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}88, ${theme.glow}44)`,
            border: `1px solid ${theme.glow}44`,
            color: '#fff',
          }}
        >
          我念完了
        </button>
      ) : (
        <div className="text-center">
          <div className="text-green-300 text-lg font-bold mb-2">练习完成！</div>
          <p className="text-white/40 text-sm">这颗晶体已经被你点亮</p>
        </div>
      )}
    </div>
  )
}
