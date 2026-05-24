import { useState, useEffect, useMemo } from 'react'
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

interface VideoSource {
  title: string
  url: string
  topic: string
  sentences: RawCrystal[]
}

function rawToCrystal(raw: RawCrystal, index: number): Crystal {
  const tag = raw.topic_tag || '社交'
  return {
    id: `crystal-new-${Date.now()}-${index}`,
    name: raw.crystal_name,
    english: raw.english_sentence,
    chinese: raw.chinese_meaning,
    chunks: raw.chunks,
    difficulty: (raw.difficulty || '中等') as Crystal['difficulty'],
    topicTag: tag,
    usageScene: raw.usage_scene || '',
    expressionFunction: raw.expression_function || '',
    reuseValue: raw.reuse_value || 3,
    visualHint: raw.visual_hint || tag,
    theme: getTheme(raw.visual_hint || tag, tag),
    mastered: false,
    practicedAt: null,
  }
}

export default function UpdatePage() {
  const navigate = useNavigate()
  const addCrystals = useStore((s) => s.addCrystals)
  const addToArchive = useStore((s) => s.addToArchive)
  const crystals = useStore((s) => s.crystals)

  const [candidates, setCandidates] = useState<Crystal[]>([])
  const [videoSources, setVideoSources] = useState<VideoSource[]>([])
  const [rawIndex, setRawIndex] = useState<Map<string, { raw: RawCrystal; sourceName: string }>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)
  const [expandedSource, setExpandedSource] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/new-crystals.json')
      .then((r) => r.json())
      .then((data: { videos: VideoSource[] }) => {
        const allCandidates: Crystal[] = []
        const index = new Map<string, { raw: RawCrystal; sourceName: string }>()
        let idCounter = 0

        data.videos.forEach((video) => {
          video.sentences.forEach((raw) => {
            if (crystals.some((existing) => existing.english === raw.english_sentence)) return
            const c = rawToCrystal(raw, idCounter++)
            allCandidates.push(c)
            index.set(c.id, { raw, sourceName: video.title })
          })
        })

        setVideoSources(data.videos.filter((v) =>
          v.sentences.some((s) => !crystals.some((e) => e.english === s.english_sentence))
        ))
        setCandidates(allCandidates)
        setRawIndex(index)
        setSelected(new Set())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [crystals])

  useEffect(() => {
    if (added) { const t = setTimeout(() => navigate('/'), 1800); return () => clearTimeout(t) }
  }, [added, navigate])

  // Group candidates by source video
  const sourceGroups = useMemo(() => {
    const map = new Map<string, { crystals: Crystal[]; url: string; topic: string }>()
    candidates.forEach((c) => {
      const info = rawIndex.get(c.id)
      const src = info?.sourceName || '未知来源'
      if (!map.has(src)) {
        const video = videoSources.find((v) => v.title === src)
        map.set(src, { crystals: [], url: video?.url || '', topic: video?.topic || '' })
      }
      map.get(src)!.crystals.push(c)
    })
    return Array.from(map.entries())
  }, [candidates, rawIndex, videoSources])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const toggleSource = (sourceName: string) => {
    const group = sourceGroups.find(([n]) => n === sourceName)
    if (!group) return
    const ids = group[1].crystals.map((c) => c.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const handleAdd = () => {
    const toAdd = candidates.filter((c) => selected.has(c.id))
    if (toAdd.length === 0) return
    addCrystals(toAdd)

    // Archive unselected, grouped by source video
    const selectedIds = new Set(toAdd.map((c) => c.id))
    const groups = new Map<string, RawCrystal[]>()
    candidates.forEach((c) => {
      if (selectedIds.has(c.id)) return
      const info = rawIndex.get(c.id)
      const src = info?.sourceName || '未知来源'
      if (!info) return
      if (!groups.has(src)) groups.set(src, [])
      groups.get(src)!.push(info.raw)
    })
    groups.forEach((sentences, sourceName) => {
      if (sentences.length > 0) addToArchive(sourceName, sentences)
    })

    setAdded(true)
  }

  const totalSelected = selected.size

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#02030a]">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 animate-pulse" />
      </div>
    )
  }

  if (candidates.length === 0 && !added) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#02030a] gap-5 px-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: `radial-gradient(circle, ${THEME_COLORS.amethyst.glow}15, transparent 65%)` }}>
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/15" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M12 2l8 6-4 14H8L4 8l8-6z" fill="currentColor" opacity="0.15"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-white/30 text-sm mb-1">暂无新晶体</p>
          <p className="text-white/15 text-xs">收藏视频中提取的表达都已处理</p>
        </div>
        <button onClick={() => navigate('/')} className="text-white/40 text-sm hover:text-white/60 transition-colors">
          ← 返回星系
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-[#02030a]">
      <div className="min-h-full max-w-lg mx-auto px-5 pt-6 pb-28">

        {/* top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 min-h-[44px] text-white/40 hover:text-white/70 transition-colors text-sm"
          >
            <span className="text-lg leading-none">‹</span>
            <span>星系</span>
          </button>
          <span className="text-white/30 text-xs tracking-wider">更 新</span>
        </div>

        {/* header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-white/30 text-xs">
            {sourceGroups.length} 个来源 · {candidates.length} 个表达
          </p>
          <span className="text-white/20 text-[10px]">已选 {totalSelected}</span>
        </div>

        {/* source groups */}
        <div className="flex flex-col gap-3">
          {sourceGroups.map(([sourceName, group], gi) => {
            const groupCrystals = group.crystals
            const groupIds = groupCrystals.map((c) => c.id)
            const groupSelected = groupIds.filter((id) => selected.has(id)).length
            const isExpanded = expandedSource === sourceName

            return (
              <motion.div
                key={sourceName}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.05, duration: 0.25 }}
                className="rounded-2xl border bg-white/[0.03] border-white/[0.07] overflow-hidden"
              >
                {/* source header */}
                <button
                  onClick={() => setExpandedSource(isExpanded ? null : sourceName)}
                  className="w-full flex items-center justify-between min-h-[52px] p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white/70 text-sm font-medium truncate">{sourceName}</h3>
                    <p className="text-white/25 text-[11px] mt-0.5">
                      {groupCrystals.length} 个表达{groupSelected > 0 && ` · 已选 ${groupSelected}`}
                    </p>
                    {group.url && (
                      <p className="text-white/15 text-[10px] mt-0.5 truncate">{group.url}</p>
                    )}
                  </div>
                  <svg viewBox="0 0 16 16" className={`w-4 h-4 text-white/25 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* expanded sentences */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-white/[0.05]">
                        <button onClick={() => toggleSource(sourceName)}
                          className="py-2 text-white/30 text-[11px] hover:text-white/50 transition-colors">
                          {groupSelected === groupCrystals.length ? '取消全选' : '全选'}
                        </button>

                        <div className="flex flex-col gap-2">
                          {groupCrystals.map((c) => {
                            const isSel = selected.has(c.id)
                            return (
                              <button
                                key={c.id}
                                onClick={() => toggle(c.id)}
                                className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                                  isSel ? 'bg-white/[0.05] border border-white/[0.1]' : 'bg-white/[0.02] border border-white/[0.03]'
                                }`}
                              >
                                <div className={`shrink-0 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all ${
                                  isSel ? 'border-purple-400 bg-purple-400/25' : 'border-white/[0.12]'
                                }`}>
                                  {isSel && (
                                    <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 text-purple-200">
                                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{c.english}</p>
                                  <p className="text-white/25 text-[10px] mt-1 line-clamp-1">{c.chinese}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* fixed bottom CTA */}
      <AnimatePresence>
        {!added && candidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-6 safe-bottom"
            style={{ background: 'linear-gradient(0deg, #02030a 60%, transparent 100%)' }}
          >
            <div className="w-[calc(100%-40px)] max-w-lg">
              <button
                onClick={handleAdd}
                disabled={totalSelected === 0}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                style={{
                  background: `linear-gradient(135deg, ${THEME_COLORS.amethyst.primary}66, ${THEME_COLORS.amethyst.glow}44)`,
                  border: `1px solid ${THEME_COLORS.amethyst.glow}33`,
                }}
              >
                添加 {totalSelected} 颗晶体到星系
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
            className="fixed inset-0 z-30 flex items-center justify-center bg-[#02030a]/90"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: `radial-gradient(circle, ${THEME_COLORS.amethyst.glow}33, transparent 65%)` }}>
                <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: THEME_COLORS.amethyst.glow }} fill="none">
                  <path d="M12 2l8 6-4 14H8L4 8l8-6z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M12 2l-4 6h8l-4-6z" fill="currentColor" opacity="0.5"/>
                </svg>
              </div>
              <p className="text-white/50 text-sm tracking-wider">晶体已加入星系</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
