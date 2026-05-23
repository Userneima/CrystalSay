import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import CrystalInfo from '../components/detail/CrystalInfo'
import ChunkSorter from '../components/detail/ChunkSorter'
import SpeakPractice from '../components/detail/SpeakPractice'
import ProgressBar from '../components/detail/ProgressBar'

type Stage = 'info' | 'sort' | 'speak' | 'done'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const crystal = useStore((s) => s.crystals.find((c) => c.id === id))
  const markMastered = useStore((s) => s.markMastered)
  const [stage, setStage] = useState<Stage>('info')

  if (!crystal) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#02030a]">
        <div className="text-center">
          <p className="text-white/40 mb-4">晶体不存在</p>
          <button
            onClick={() => navigate('/')}
            className="text-white/60 hover:text-white transition-colors text-sm"
          >
            ← 返回星系
          </button>
        </div>
      </div>
    )
  }

  const stageIndex = { info: 0, sort: 1, speak: 2, done: 2 }[stage]
  const stageLabels = ['认识晶体', '语块重组', '开口复述']

  const handleSortComplete = () => setStage('speak')
  const handleSpeakComplete = () => {
    markMastered(crystal.id)
    setStage('done')
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-[#02030a]">
      <div className="min-h-full px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        {/* Top bar */}
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm"
          >
            <span className="text-lg leading-none">‹</span>
            <span>星系</span>
          </button>
          {crystal.mastered && (
            <span className="text-xs text-green-400/70 bg-green-400/10 px-2.5 py-1 rounded-full">
              已掌握
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mx-auto mt-7 w-full max-w-4xl">
          <ProgressBar step={stageIndex} total={3} labels={stageLabels} />
        </div>

        {/* Stage content */}
        <main className="mx-auto mt-10 flex w-full max-w-4xl flex-col items-center">
          {stage === 'info' && (
            <div className="flex w-full flex-col items-center gap-8">
              <CrystalInfo crystal={crystal} />
              <button
                onClick={() => setStage('sort')}
                className="px-6 py-3 rounded-2xl font-bold text-sm bg-white/[0.08] border border-white/[0.12] text-white/80 hover:bg-white/[0.14] hover:text-white transition-all"
              >
                开始练习
              </button>
            </div>
          )}

          {stage === 'sort' && (
            <ChunkSorter crystal={crystal} onComplete={handleSortComplete} />
          )}

          {stage === 'speak' && (
            <SpeakPractice crystal={crystal} onComplete={handleSpeakComplete} />
          )}

          {stage === 'done' && (
            <div className="flex w-full flex-col items-center gap-8">
              <CrystalInfo crystal={crystal} />
              <div className="text-center text-green-300/80 text-sm">
                ✓ 这颗晶体已经被你点亮，收录到你的表达云中
              </div>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-2xl font-bold text-sm bg-white/[0.08] border border-white/[0.12] text-white/80 hover:bg-white/[0.14] transition-all"
              >
                返回星系
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
