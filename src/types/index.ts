export interface Crystal {
  id: string
  name: string
  english: string
  chinese: string
  chunks: string[]
  difficulty: '简单' | '中等' | '较难'
  topicTag: string
  usageScene: string
  expressionFunction: string
  reuseValue: number
  visualHint: string
  theme: 'blue-green' | 'amethyst' | 'amber' | 'ice-white'
  mastered: boolean
  practicedAt: string | null
}

export interface Cluster {
  id: string
  name: string
  crystalIds: string[]
  centerPosition: [number, number, number]
}

export type Theme = Crystal['theme']

export interface ThemeColors {
  primary: string
  glow: string
  emissive: string
}
