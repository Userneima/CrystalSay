import type { Crystal } from '../../types'
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
    <div className="w-full max-w-3xl mx-auto text-center">
      {/* Crystal name + theme indicator */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-6">
        <div
          className="w-4 h-4 shrink-0 rounded-full"
          style={{ background: theme.glow, boxShadow: `0 0 12px ${theme.glow}` }}
        />
        <h2 className="text-xl font-bold text-white/90">{crystal.name}</h2>
        <span className={`text-xs ${DIFFICULTY_COLORS[crystal.difficulty]}`}>
          {crystal.difficulty}
        </span>
        <span className="text-white/20 text-xs">·</span>
        <span className="text-white/30 text-xs">{crystal.topicTag}</span>
      </div>

      {/* Chinese meaning */}
      <p className="text-lg text-white/70 text-center">
        {crystal.chinese}
      </p>
    </div>
  )
}
