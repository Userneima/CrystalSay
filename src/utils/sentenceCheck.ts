export interface DiagnosisResult {
  passed: boolean
  score: number
  feedback: string
  details: string[]
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function diagnoseSentence(input: string, target: string): DiagnosisResult {
  const inputTokens = tokenize(input)
  const targetTokens = tokenize(target)
  const targetSet = new Set(targetTokens)

  const matched = inputTokens.filter((t) => targetSet.has(t)).length
  const score = targetTokens.length > 0 ? matched / targetTokens.length : 0

  const missing = targetTokens.filter((t) => !inputTokens.includes(t))
  const extra = inputTokens.filter((t) => !targetSet.has(t))
  const orderCorrect = inputTokens.join(' ') === targetTokens.join(' ')

  const details: string[] = []

  if (missing.length > 0) {
    details.push(`缺少关键词: ${missing.join(', ')}`)
  }
  if (extra.length > 0) {
    details.push(`多余或替换词: ${extra.join(', ')}`)
  }
  if (!orderCorrect && missing.length === 0 && extra.length === 0) {
    details.push('词序有误，请检查语序排列')
  }

  const passed = score >= 0.85 && missing.length <= 1

  let feedback: string
  if (score >= 0.95 && missing.length === 0 && extra.length === 0) {
    feedback = '非常准确！你的表达几乎完美，与原句高度一致。'
  } else if (passed) {
    feedback = '整体不错，只有细微偏差。注意查看下方建议进行微调。'
  } else if (score >= 0.6) {
    feedback = '方向正确，但还差一点。检查缺少的关键词和替换的词语。'
  } else if (score >= 0.3) {
    feedback = '部分词语正确，但与原句差异较大。建议回顾语块重组结果，重新组织句子。'
  } else {
    feedback = '与原句差异较大。建议回到上一步重新进行语块排序，再次尝试。'
  }

  return { passed, score: Math.round(score * 100), feedback, details }
}
