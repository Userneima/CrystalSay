import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { getTheme, THEME_COLORS } from '../utils/themeMapping'
import type { Crystal } from '../types'

interface RawCrystal {
  crystal_name: string
  english_sentence: string
  chinese_meaning: string
  usage_scene: string
  expression_function: string
  chunks: string[]
  difficulty: string
  topic_tag: string
  reuse_value: number
  visual_hint: string
}

function rawToCrystal(raw: RawCrystal, index: number): Crystal {
  return {
    id: `crystal-new-${Date.now()}-${index}`,
    name: raw.crystal_name,
    english: raw.english_sentence,
    chinese: raw.chinese_meaning,
    chunks: raw.chunks,
    difficulty: raw.difficulty as Crystal['difficulty'],
    topicTag: raw.topic_tag,
    usageScene: raw.usage_scene,
    expressionFunction: raw.expression_function,
    reuseValue: raw.reuse_value,
    visualHint: raw.visual_hint,
    theme: getTheme(raw.visual_hint, raw.topic_tag),
    mastered: false,
    practicedAt: null,
  }
}

const DIFFICULTY_COLORS: Record<string, string> = {
  '简单': 'bg-green-400/70',
  '中等': 'bg-yellow-400/70',
  '较难': 'bg-red-400/60',
}

export default function UpdatePage() {
  const navigate = useNavigate()
  const addCrystals = useStore((s) => s.addCrystals)
  const crystals = useStore((s) => s.crystals)

  const [candidates, setCandidates] = useState<Crystal[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    fetch('/data/new-crystals.json')
      .then((r) => r.json())
      .then((raw: RawCrystal[]) => {
        const converted = raw
          .map((r, i) => rawToCrystal(r, i))
          .filter((c) => !crystals.some((existing) => existing.english === c.english))
        setCandidates(converted)
        setSelected(new Set(converted.map((c) => c.id)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [crystals])

  useEffect(() => {
    if (added) {
      const t = setTimeout(() => navigate('/'), 1800)
      return () => clearTimeout(t)
    }
  }, [added, navigate])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(candidates.map((c) => c.id)))
    }
  }

  const handleAdd = () => {
    const toAdd = candidates.filter((c) => selected.has(c.id))
    if (toAdd.length === 0) return
    addCrystals(toAdd)
    setAdded(true)
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#080c18]">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400/60 to-cyan-400/60 animate-pulse" />
      </div>
    )
  }

  if (candidates.length === 0 && !added) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#080c18] gap-4 px-5">
        <p className="text-white/30 text-sm">没有发现新的表达晶体</p>
        <button onClick={() => navigate('/')} className="text-white/40 text-sm hover:text-white/60 transition-colors">
          ← 返回星系
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-[#080c18]">
      <div className="min-h-full max-w-lg mx-auto px-5 pt-6 pb-28">

        {/* top bar */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-white/35 hover:text-white/60 transition-colors text-sm"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>星系</span>
          </button>
          <span className="text-white/30 text-xs tracking-wider">发 现 新 晶 体</span>
        </div>

        {/* subtitle + select all */}
        <div className="flex items-center justify-between mb-5 px-1">
          <p className="text-white/25 text-xs">
            从收藏视频中识别到 <span className="text-white/50">{candidates.length}</span> 个新表达
          </p>
          <button
            onClick={toggleAll}
            className="text-white/35 text-xs hover:text-white/55 transition-colors"
          >
            {selected.size === candidates.length ? '取消全选' : '全选'}
          </button>
        </div>

        {/* crystal cards */}
        <div className="flex flex-col gap-3">
          {candidates.map((c, i) => {
            const theme = THEME_COLORS[c.theme]
            const isSel = selected.has(c.id)
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                onClick={() => toggle(c.id)}
                className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                  isSel
                    ? 'bg-white/[0.05] border-white/[0.12]'
                    : 'bg-white/[0.02] border-white/[0.04] opacity-45'
                }`}
              >
                <div className="flex gap-4">
                  {/* crystal visual */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-14"
                      style={{
                        clipPath: 'polygon(50% 0%, 82% 14%, 96% 40%, 86% 82%, 50% 100%, 14% 82%, 4% 40%, 18% 14%)',
                        background: `linear-gradient(160deg, ${theme.glow}66, ${theme.primary}dd, ${theme.emissive})`,
                        boxShadow: `0 0 12px ${theme.glow}44`,
                        opacity: isSel ? 1 : 0.5,
                      }}
                    />
                    <div className={`w-1 h-1 rounded-full ${DIFFICULTY_COLORS[c.difficulty]}`} />
                  </div>

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white/85 text-sm font-semibold truncate">{c.name}</h3>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mb-2">{c.english}</p>
                    <p className="text-white/35 text-[11px] leading-relaxed line-clamp-1 mb-2">{c.chinese}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 border border-white/[0.06]">
                        {c.topicTag}
                      </span>
                      <span className="text-[10px] text-white/25">{c.difficulty} · {c.chunks.length} chunks</span>
                      <span className="text-[10px] text-amber-400/60">
                        {'✦'.repeat(c.reuseValue)}{'✧'.repeat(5 - c.reuseValue)}
                      </span>
                    </div>
                  </div>

                  {/* checkbox */}
                  <div className={`shrink-0 w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center self-start transition-all duration-200 ${
                    isSel ? 'border-purple-400 bg-purple-400/25 text-purple-200' : 'border-white/[0.15]'
                  }`}>
                    {isSel && (
                      <svg viewBox="0 0 16 16" className="w-3 h-3"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* fixed bottom bar */}
      <AnimatePresence>
        {!added && candidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-6 safe-bottom"
            style={{ background: 'linear-gradient(0deg, #080c18 60%, transparent 100%)' }}
          >
            <div className="w-[calc(100%-40px)] max-w-lg">
              <button
                onClick={handleAdd}
                disabled={selected.size === 0}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                style={{ background: 'linear-gradient(135deg, rgba(168,120,232,0.6), rgba(124,92,231,0.6))' }}
              >
                添加 {selected.size} 颗晶体到星系
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* success overlay */}
      <AnimatePresence>
        {added && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-[#080c18]/90"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col items-center gap-4"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: `radial-gradient(circle, ${THEME_COLORS.amethyst.glow}33, transparent 65%)` }}
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-purple-300/80" fill="none">
                  <path d="M12 2l8 6-4 14H8L4 8l8-6z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M12 2l-4 6h8l-4-6z" fill="currentColor" opacity="0.5"/>
                </svg>
              </div>
              <p className="text-white/60 text-sm tracking-wider">晶体已加入星系</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
