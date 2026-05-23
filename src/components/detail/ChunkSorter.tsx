import { useState, useMemo, useEffect, useCallback } from 'react'
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
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const s = shuffle(crystal.chunks)
    setPlaced([]); setPool(s); setResult('idle'); setSubmitted(false)
  }, [crystal])

  const allPlaced = placed.length === crystal.chunks.length

  const handlePick = useCallback((chunk: string) => {
    if (submitted) return
    setPlaced(p => [...p, chunk]); setPool(p => p.filter(c => c !== chunk)); setResult('idle')
  }, [submitted])

  const handleRemove = useCallback((index: number) => {
    if (submitted) return
    const chunk = placed[index]
    setPlaced(p => p.filter((_, i) => i !== index)); setPool(p => [...p, chunk]); setResult('idle')
  }, [submitted, placed])

  const handleReset = useCallback(() => {
    setPlaced([]); setPool(shuffle(crystal.chunks)); setResult('idle'); setSubmitted(false)
  }, [crystal.chunks])

  const handleSubmit = useCallback(() => {
    const isCorrect = placed.join(' ') === crystal.chunks.join(' ')
    setSubmitted(true)
    if (isCorrect) { setResult('correct'); setTimeout(onComplete, 1400) }
    else setResult('wrong')
  }, [placed, crystal.chunks, onComplete])

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Exercise card */}
      <div className="rounded-2xl p-4 flex flex-col gap-3 bg-white/[0.02] border border-white/[0.06]">
        {/* Slots */}
        <div
          className={`min-h-[52px] p-3 rounded-2xl border-2 border-dashed flex flex-wrap gap-2 items-center justify-center transition-all duration-300 ${result === 'wrong' ? 'shake' : ''}`}
          style={{
            borderColor: result === 'correct' ? 'rgba(74,222,128,0.4)' : result === 'wrong' ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.08)',
            background: result === 'correct' ? 'rgba(74,222,128,0.04)' : result === 'wrong' ? 'rgba(248,113,113,0.04)' : 'transparent',
          }}
        >
          {placed.length === 0 && !submitted && (
            <span className="text-white/10 text-[13px] sm:text-sm">点击下方语块填入此处</span>
          )}
          {placed.map((chunk, i) => (
            <button key={`placed-${i}`} onClick={() => handleRemove(i)}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl text-[13px] sm:text-sm font-medium transition-all"
              style={{
                background: result === 'correct' ? 'rgba(74,222,128,0.12)' : result === 'wrong' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${result === 'correct' ? 'rgba(74,222,128,0.25)' : result === 'wrong' ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.12)'}`,
                color: result === 'correct' ? '#86efac' : result === 'wrong' ? '#fca5a5' : 'rgba(255,255,255,0.8)',
                cursor: submitted ? 'default' : 'pointer',
              }}
            >{chunk}</button>
          ))}
        </div>

        {/* Pool + controls */}
        {!submitted && (
          <>
            <div className="flex flex-wrap gap-2 justify-center">
              {pool.map(chunk => (
                <button key={chunk} onClick={() => handlePick(chunk)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-[13px] sm:text-sm font-medium bg-white/[0.04] text-white/65 border border-white/[0.12] hover:bg-white/[0.08] hover:text-white/85 hover:border-white/[0.2] active:scale-95 transition-all">
                  {chunk}
                </button>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={handleReset}
                className="px-4 py-2.5 rounded-full text-[11px] sm:text-xs font-medium tracking-wider text-white/35 border border-white/[0.08] hover:text-white/55 hover:border-white/[0.15] transition-all min-h-[44px] active:scale-95">
                清空
              </button>
              <button onClick={handleSubmit} disabled={!allPlaced}
                className={`px-5 py-2.5 rounded-full text-[13px] sm:text-sm font-semibold tracking-wider transition-all duration-300 min-h-[44px] active:scale-95 ${
                  allPlaced
                    ? 'bg-white/[0.08] border border-white/[0.12] text-gray-100 cursor-pointer'
                    : 'bg-white/[0.02] border border-white/[0.04] text-white/15 cursor-not-allowed'
                }`}>
                提交检查
              </button>
            </div>
          </>
        )}
      </div>

      {/* Error state with correct answer */}
      {result === 'wrong' && (
        <div className="w-full p-4 rounded-2xl text-center" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.14)' }}>
          <p className="text-[13px] sm:text-sm font-medium mb-2 text-red-300/80">正确顺序</p>
          <p className="text-sm sm:text-base font-medium italic mb-3 text-white/90 break-words">{crystal.english}</p>
          <button onClick={handleReset}
            className="px-5 py-2.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-wider min-h-[44px] active:scale-95 bg-transparent border border-white/[0.08] text-white/40">
            重新尝试
          </button>
        </div>
      )}
    </div>
  )
}
