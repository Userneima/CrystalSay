import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, type ArchiveBatch } from '../store/useStore'
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
  source_video?: string
}

function rawToCrystal(raw: RawCrystal, index: number): Crystal {
  const tag = raw.topic_tag || '社交'
  return {
    id: `crystal-archive-${Date.now()}-${index}`,
    name: raw.crystal_name,
    english: raw.english_sentence,
    chinese: raw.chinese_meaning,
    chunks: raw.chunks,
    difficulty: (raw.difficulty || '中等') as Crystal['difficulty'],
    topicTag: tag,
    usageScene: raw.usage_scene,
    expressionFunction: raw.expression_function,
    reuseValue: raw.reuse_value,
    visualHint: raw.visual_hint,
    theme: getTheme(raw.visual_hint, tag),
    mastered: false,
    practicedAt: null,
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const archive = useStore((s) => s.archive)
  const addCrystals = useStore((s) => s.addCrystals)
  const removeFromArchive = useStore((s) => s.removeFromArchive)
  const clearArchive = useStore((s) => s.clearArchive)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedSentences, setSelectedSentences] = useState<Map<string, Set<number>>>(new Map())
  const [addedBatchId, setAddedBatchId] = useState<string | null>(null)

  const toggleExpand = (batchId: string) => {
    setExpandedId((prev) => (prev === batchId ? null : batchId))
  }

  const toggleSentence = (batchId: string, index: number) => {
    setSelectedSentences((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(batchId))
      if (set.has(index)) set.delete(index)
      else set.add(index)
      next.set(batchId, set)
      return next
    })
  }

  const selectAllInBatch = (batch: ArchiveBatch) => {
    setSelectedSentences((prev) => {
      const next = new Map(prev)
      const current = next.get(batch.id)
      if (current && current.size === batch.sentences.length) {
        next.set(batch.id, new Set())
      } else {
        next.set(batch.id, new Set(batch.sentences.map((_, i) => i)))
      }
      return next
    })
  }

  const handleAddFromBatch = (batch: ArchiveBatch) => {
    const indices = selectedSentences.get(batch.id)
    if (!indices || indices.size === 0) return
    const selected = batch.sentences.filter((_, i) => indices.has(i))
    const crystals = selected.map((r, i) => rawToCrystal(r, i))
    addCrystals(crystals)

    // Remove selected from batch
    const remaining = batch.sentences.filter((_, i) => !indices.has(i))
    if (remaining.length === 0) {
      removeFromArchive(batch.id)
      setExpandedId(null)
    } else {
      // Update the batch — we need to remove and re-add with remaining
      removeFromArchive(batch.id)
      useStore.getState().addToArchive(batch.sourceName, remaining)
    }
    setAddedBatchId(batch.id)
    setSelectedSentences((prev) => {
      const next = new Map(prev)
      next.delete(batch.id)
      return next
    })
    setTimeout(() => setAddedBatchId(null), 1500)
  }

  const handleDeleteBatch = (batchId: string) => {
    removeFromArchive(batchId)
    if (expandedId === batchId) setExpandedId(null)
  }

  if (archive.length === 0) {
    return (
      <div className="w-full h-full overflow-y-auto bg-[#02030a]">
        <div className="min-h-full max-w-lg mx-auto px-5 pt-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 min-h-[44px] text-white/40 hover:text-white/70 transition-colors text-sm"
            >
              <span className="text-lg leading-none">‹</span>
              <span>星系</span>
            </button>
            <span className="text-white/30 text-xs tracking-wider">历 史</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-5 py-20">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: `radial-gradient(circle, ${THEME_COLORS['blue-green'].glow}12, transparent 65%)` }}>
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l3 3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white/25 text-sm mb-1">暂无收藏历史</p>
              <p className="text-white/15 text-xs">更新页面中未选的句子会保留在这里</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-[#02030a]">
      <div className="min-h-full max-w-lg mx-auto px-5 pt-6 pb-28">
        {/* top bar */}
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 min-h-[44px] text-white/40 hover:text-white/70 transition-colors text-sm"
          >
            <span className="text-lg leading-none">‹</span>
            <span>星系</span>
          </button>
          <span className="text-white/30 text-xs tracking-wider">历 史</span>
        </div>

        <div className="flex items-center justify-between mb-5 px-1">
          <p className="text-white/25 text-xs">
            {archive.length} 个来源 · {archive.reduce((sum, b) => sum + b.sentences.length, 0)} 条未选句子
          </p>
          {archive.length > 0 && (
            <button
              onClick={() => { if (confirm('清空全部历史？')) clearArchive() }}
              className="min-h-[44px] flex items-center text-white/20 text-xs hover:text-red-400/60 transition-colors"
            >
              清空
            </button>
          )}
        </div>

        {/* batch cards */}
        <div className="flex flex-col gap-3">
          {archive.map((batch, bi) => {
            const isExpanded = expandedId === batch.id
            const isEmpty = batch.sentences.length === 0
            const selSet = selectedSentences.get(batch.id)
            const selCount = selSet?.size ?? 0

            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: bi * 0.04, duration: 0.25 }}
                className={`rounded-2xl border transition-all duration-200 ${
                  isEmpty
                    ? 'bg-white/[0.01] border-white/[0.03] opacity-40'
                    : 'bg-white/[0.03] border-white/[0.07]'
                }`}
              >
                {/* batch header */}
                <button
                  onClick={() => !isEmpty && toggleExpand(batch.id)}
                  disabled={isEmpty}
                  className="w-full flex items-center justify-between min-h-[52px] p-4 text-left disabled:cursor-default"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white/70 text-sm font-medium truncate">{batch.sourceName}</h3>
                    <p className="text-white/25 text-[11px] mt-0.5">
                      {formatDate(batch.createdAt)} · {batch.sentences.length} 条句子
                      {isEmpty && ' · 已全部收录'}
                    </p>
                  </div>
                  {isEmpty ? (
                    <span className="text-green-400/40 text-[10px] shrink-0">✓</span>
                  ) : (
                    <svg
                      viewBox="0 0 16 16"
                      className={`w-4 h-4 text-white/25 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                {/* expanded sentences */}
                <AnimatePresence>
                  {isExpanded && !isEmpty && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 border-t border-white/[0.05]">
                        {/* select all for this batch */}
                        <div className="flex items-center justify-between py-2">
                          <button
                            onClick={() => selectAllInBatch(batch)}
                            className="min-h-[44px] flex items-center text-white/30 text-[11px] hover:text-white/50 transition-colors"
                          >
                            {selCount === batch.sentences.length ? '取消全选' : '全选'}
                          </button>
                          <button
                            onClick={() => handleDeleteBatch(batch.id)}
                            className="min-h-[44px] flex items-center text-white/15 text-[11px] hover:text-red-400/50 transition-colors"
                          >
                            删除
                          </button>
                        </div>

                        {/* sentences */}
                        <div className="flex flex-col gap-2">
                          {batch.sentences.map((s, si) => {
                            const isSel = selSet?.has(si) ?? false
                            return (
                              <button
                                key={si}
                                onClick={() => toggleSentence(batch.id, si)}
                                className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 ${
                                  isSel
                                    ? 'bg-white/[0.06] border border-white/[0.1]'
                                    : 'bg-white/[0.02] border border-white/[0.03]'
                                }`}
                              >
                                <div
                                  className={`shrink-0 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all ${
                                    isSel ? 'border-purple-400 bg-purple-400/25' : 'border-white/[0.12]'
                                  }`}
                                >
                                  {isSel && (
                                    <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 text-purple-200">
                                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{s.english_sentence}</p>
                                  <p className="text-white/30 text-[10px] mt-1 line-clamp-1">{s.chinese_meaning}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>

                        {/* add button */}
                        <button
                          onClick={() => handleAddFromBatch(batch)}
                          disabled={selCount === 0}
                          className="w-full mt-3 py-2.5 rounded-xl font-semibold text-xs text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{
                            background: `linear-gradient(135deg, ${THEME_COLORS.amethyst.primary}55, ${THEME_COLORS.amethyst.glow}33)`,
                            border: `1px solid ${THEME_COLORS.amethyst.glow}22`,
                          }}
                        >
                          添加 {selCount} 条到星系
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* added feedback */}
                <AnimatePresence>
                  {addedBatchId === batch.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="px-4 pb-3 text-center"
                    >
                      <span className="text-green-400/60 text-xs">已添加到星系</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
