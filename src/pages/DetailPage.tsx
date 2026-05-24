import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import CrystalInfo from '../components/detail/CrystalInfo'
import CrystalHero from '../components/detail/CrystalHero'
import ChunkSorter from '../components/detail/ChunkSorter'
import SentencePractice from '../components/detail/SentencePractice'

function StarfieldBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1 + 0.3, o: Math.random() * 0.4 + 0.2, s: Math.random() * 0.004 + 0.002,
    }))
    let id: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(st => {
        st.o += st.s; if (st.o > 0.7 || st.o < 0.15) st.s *= -1
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180,190,220,${st.o})`; ctx.fill()
      })
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
}

type Stage = 'chunks' | 'sentence'
const RETURN_HOME_AFTER_MASTERY_MS = 2200

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const crystal = useStore((s) => s.crystals.find((c) => c.id === id))
  const allCrystals = useStore((s) => s.crystals)
  const recordChunkPass = useStore((s) => s.recordChunkPass)
  const recordSentencePass = useStore((s) => s.recordSentencePass)
  const counts = useStore((s) => s.practiceCounts[id ?? '']) ?? { chunks: 0, sentence: 0 }
  const [stage, setStage] = useState<Stage>('chunks')
  const [completionPulse, setCompletionPulse] = useState(0)
  const returnHomeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setStage('chunks')
    setCompletionPulse(0)
    if (returnHomeTimerRef.current) {
      window.clearTimeout(returnHomeTimerRef.current)
      returnHomeTimerRef.current = null
    }
  }, [id])

  useEffect(() => {
    return () => {
      if (returnHomeTimerRef.current) {
        window.clearTimeout(returnHomeTimerRef.current)
      }
    }
  }, [])

  if (!crystal) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#02030a]">
        <div className="text-center">
          <p className="text-white/40 mb-4">晶体不存在</p>
          <button onClick={() => navigate('/')} className="text-white/60 hover:text-white transition-colors text-sm">← 返回星系</button>
        </div>
      </div>
    )
  }

  const handleChunksComplete = () => {
    recordChunkPass(crystal.id)
    setStage('sentence')
  }

  const handleSentencePassed = () => {
    const shouldReturnHome = !crystal.mastered && allCrystals.every((c) => c.mastered || c.id === crystal.id)
    setCompletionPulse((pulse) => pulse + 1)
    recordSentencePass(crystal.id)

    if (shouldReturnHome) {
      if (returnHomeTimerRef.current) window.clearTimeout(returnHomeTimerRef.current)
      returnHomeTimerRef.current = window.setTimeout(() => {
        navigate('/')
      }, RETURN_HOME_AFTER_MASTERY_MS)
    }
  }

  const nextCrystal = allCrystals.find((c) => !c.mastered && c.id !== id)
  const allMastered = allCrystals.every((c) => c.mastered || c.id === id)

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden relative bg-[#02030a]">
      <StarfieldBg />

      <div className="relative z-[1] max-w-[560px] mx-auto px-5 py-6 flex flex-col gap-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 min-h-[44px] text-white/40 hover:text-white/70 transition-colors text-sm">
            <span className="text-lg leading-none">‹</span> 星系
          </button>
          <div className="flex gap-2">
            {crystal.practicedAt && !crystal.mastered && (
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full text-cyan-300/70 bg-cyan-400/8 border border-cyan-400/15">已练习</span>
            )}
            {crystal.mastered && (
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full text-green-300/70 bg-green-400/8 border border-green-400/15">已掌握</span>
            )}
          </div>
        </div>

        {/* Crystal hero */}
        <CrystalHero crystal={crystal} animateBright={crystal.mastered} completionPulse={completionPulse} />

        {/* Stage content */}
        <AnimatePresence mode="wait">
          {stage === 'chunks' && (
            <motion.div key="chunks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex flex-col gap-5">
              <CrystalInfo crystal={crystal} />
              <ChunkSorter crystal={crystal} onComplete={handleChunksComplete} />
            </motion.div>
          )}

          {stage === 'sentence' && (
            <motion.div key="sentence" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <SentencePractice crystal={crystal} onPassed={handleSentencePassed} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Practice progress */}
        {(counts.chunks > 0 || counts.sentence > 0) && !crystal.mastered && (
          <p className="text-center text-white/15 text-[10px] tracking-wider">
            进度 {counts.chunks + counts.sentence}/2 · 完成语块+整句各一次自动掌握
          </p>
        )}

        {/* Mastered */}
        {crystal.mastered && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-white/20 text-xs tracking-wider">— 已掌握 —</p>
            {nextCrystal && !allMastered && (
              <button onClick={() => navigate(`/crystal/${nextCrystal.id}`)}
                className="px-6 py-3 rounded-full text-sm font-semibold tracking-wider text-white transition-all active:scale-95 min-h-[48px]"
                style={{ background: 'linear-gradient(135deg, rgba(168,120,232,0.6), rgba(124,92,231,0.6))', border: '1px solid rgba(168,120,232,0.3)' }}>
                下一个晶体 →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
