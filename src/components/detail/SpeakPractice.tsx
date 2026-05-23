import { useState, useCallback } from 'react'
import type { Crystal } from '../../types'
import { THEME_COLORS } from '../../utils/themeMapping'
import CrystalHero from './CrystalHero'

interface SpeakPracticeProps {
  crystal: Crystal
  onComplete: () => void
}

export default function SpeakPractice({ crystal, onComplete }: SpeakPracticeProps) {
  const [lightingUp, setLightingUp] = useState(false)
  const [done, setDone] = useState(false)
  const theme = THEME_COLORS[crystal.theme]

  const handleDone = useCallback(() => {
    setLightingUp(true)
    setTimeout(() => {
      setDone(true)
      onComplete()
    }, 1200)
  }, [onComplete])

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-5">
      <CrystalHero crystal={crystal} animateBright={lightingUp} />

      {!done ? (
        <>
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

          <button
            onClick={handleDone}
            disabled={lightingUp}
            className="min-h-[44px] px-8 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}88, ${theme.glow}44)`,
              border: `1px solid ${theme.glow}44`,
              color: '#fff',
            }}
          >
            {lightingUp ? '点亮中…' : '我念完了'}
          </button>
        </>
      ) : (
        <p className="text-white/20 text-xs tracking-wider">— 已点亮 —</p>
      )}
    </div>
  )
}
