import type { Theme } from '../types'

export function getTheme(visualHint: string, topicTag: string): Theme {
  const h = visualHint
  if (h.includes('紫')) return 'amethyst'
  if (h.includes('琥珀') || h.includes('金')) return 'amber'
  if (h.includes('蓝') || h.includes('绿') || h.includes('青')) return 'blue-green'
  if (h.includes('冰') || h.includes('白')) return 'ice-white'

  const map: Record<string, Theme> = {
    '社交': 'amethyst',
    '学习': 'blue-green',
    '生活': 'amber',
    '观点表达': 'ice-white',
  }
  return map[topicTag] ?? 'blue-green'
}

export const THEME_COLORS: Record<Theme, { primary: string; glow: string; emissive: string }> = {
  'amber':       { primary: '#f0a040', glow: '#ffb74d', emissive: '#b85e00' },
  'amethyst':    { primary: '#b388ff', glow: '#ce93d8', emissive: '#6200ea' },
  'blue-green':  { primary: '#4dd0e1', glow: '#80deea', emissive: '#006064' },
  'ice-white':   { primary: '#e0e0ff', glow: '#ffffff', emissive: '#304ffe' },
}
