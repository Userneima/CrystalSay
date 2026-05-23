import type { Crystal, Theme } from '../../types'
import { THEME_COLORS } from '../../utils/themeMapping'

interface CrystalInfoProps {
  crystal: Crystal
}

const DIFFICULTY_COLORS: Record<string, string> = {
  '简单': 'text-green-400',
  '中等': 'text-yellow-400',
  '较难': 'text-red-400',
}

export default function CrystalInfo({ crystal }: CrystalInfoProps) {
  const theme = THEME_COLORS[crystal.theme]

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Crystal name + theme indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-4 h-4 rounded-full"
          style={{ background: theme.glow, boxShadow: `0 0 12px ${theme.glow}` }}
        />
        <h2 className="text-xl font-bold text-white/90">{crystal.name}</h2>
        <span className={`text-xs ${DIFFICULTY_COLORS[crystal.difficulty]}`}>
          {crystal.difficulty}
        </span>
        <span className="text-white/20 text-xs">·</span>
        <span className="text-white/30 text-xs">{crystal.topicTag}</span>
      </div>

      {/* English sentence */}
      <p className="text-2xl font-bold text-white leading-relaxed mb-3">
        {crystal.english}
      </p>

      {/* Chinese meaning */}
      <p className="text-lg text-white/70 mb-4">
        {crystal.chinese}
      </p>

      {/* Usage scene */}
      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
        <p className="text-white/40 text-xs tracking-wider mb-1.5">使用场景</p>
        <p className="text-white/60 text-sm leading-relaxed">{crystal.usageScene}</p>
      </div>

      {/* Expression function */}
      <div className="mt-2 text-white/30 text-xs">
        表达功能：{crystal.expressionFunction}
      </div>
    </div>
  )
}
