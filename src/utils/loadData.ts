import type { Crystal } from '../types'
import { getTheme } from './themeMapping'

interface RawCrystal {
  crystal_name: string
  english_sentence: string
  chinese_meaning: string
  chunks: string[]
  difficulty: string
  topic_tag: string
  usage_scene: string
  expression_function: string
  reuse_value: number
  visual_hint: string
}

export async function loadCrystals(): Promise<Crystal[]> {
  const res = await fetch('/data/crystals.json')
  const raw: RawCrystal[] = await res.json()
  return raw.map((r, index) => ({
    id: `crystal-${index}`,
    name: r.crystal_name,
    english: r.english_sentence,
    chinese: r.chinese_meaning,
    chunks: r.chunks,
    difficulty: r.difficulty as Crystal['difficulty'],
    topicTag: r.topic_tag,
    usageScene: r.usage_scene,
    expressionFunction: r.expression_function,
    reuseValue: r.reuse_value,
    visualHint: r.visual_hint,
    theme: getTheme(r.visual_hint, r.topic_tag),
    mastered: false,
    practicedAt: null,
  }))
}
