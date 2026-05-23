import { useState, useMemo, useEffect } from 'react'
import type { Crystal } from '../../types'

interface ChunkSorterProps {
  crystal: Crystal
  onComplete: () => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ChunkSorter({ crystal, onComplete }: ChunkSorterProps) {
  const shuffled = useMemo(() => shuffle(crystal.chunks), [crystal.chunks])
  const [placed, setPlaced] = useState<string[]>([])
  const [pool, setPool] = useState<string[]>(shuffled)
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle')

  // Reset when crystal changes
  useEffect(() => {
    const s = shuffle(crystal.chunks)
    setPlaced([])
    setPool(s)
    setResult('idle')
  }, [crystal])

  const handlePick = (chunk: string) => {
    if (result === 'correct') return
    setPlaced((p) => [...p, chunk])
    setPool((p) => p.filter((c) => c !== chunk))
    setResult('idle')
  }

  const handleRemove = (index: number) => {
    if (result === 'correct') return
    const chunk = placed[index]
    setPlaced((p) => p.filter((_, i) => i !== index))
    setPool((p) => [...p, chunk])
    setResult('idle')
  }

  // Auto-check when all placed
  useEffect(() => {
    if (placed.length === crystal.chunks.length && result === 'idle') {
      const isCorrect = placed.join(' ') === crystal.chunks.join(' ')
      if (isCorrect) {
        setResult('correct')
        setTimeout(onComplete, 1200)
      } else {
        setResult('wrong')
        setTimeout(() => {
          setPlaced([])
          setPool(shuffle(crystal.chunks))
          setResult('idle')
        }, 900)
      }
    }
  }, [placed, crystal.chunks, result, onComplete])

  return (
    <div className="w-full max-w-lg mx-auto">
      <p className="text-white/40 text-xs sm:text-xs tracking-wider mb-4 text-center">根据中文提示，将语块按正确顺序还原</p>

      {/* Slots area */}
      <div
        className={`min-h-[60px] p-4 rounded-2xl border-2 border-dashed flex flex-wrap gap-2 items-center justify-center transition-colors mb-6 ${
          result === 'correct'
            ? 'border-green-400/60 bg-green-400/[0.06]'
            : result === 'wrong'
            ? 'border-red-400/60 bg-red-400/[0.06] shake'
            : 'border-white/[0.12] bg-white/[0.02]'
        }`}
      >
        {placed.length === 0 && (
          <span className="text-white/15 text-sm">点击下方语块填入此处</span>
        )}
        {placed.map((chunk, i) => (
          <button
            key={`${chunk}-${i}`}
            onClick={() => handleRemove(i)}
            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              result === 'correct'
                ? 'bg-green-400/20 text-green-300 border border-green-400/30'
                : 'bg-white/[0.08] text-white/80 border border-white/[0.12] hover:bg-white/[0.14]'
            }`}
          >
            {chunk}
          </button>
        ))}
      </div>

      {/* Pool area */}
      <div className="flex flex-wrap gap-2.5 justify-center">
        {pool.map((chunk) => (
          <button
            key={chunk}
            onClick={() => handlePick(chunk)}
            disabled={result === 'correct'}
            className="min-h-[44px] px-4 py-3 rounded-xl text-sm font-medium bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.12] hover:text-white/90 hover:border-white/[0.2] transition-all disabled:opacity-30 disabled:cursor-default"
          >
            {chunk}
          </button>
        ))}
      </div>
    </div>
  )
}
