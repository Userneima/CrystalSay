import { useState, useRef, useCallback } from 'react'
import type { Crystal } from '../../types'
import { diagnoseSentence, type DiagnosisResult } from '../../utils/sentenceCheck'

interface SentencePracticeProps {
  crystal: Crystal
  onPassed: () => void
}

export default function SentencePractice({ crystal, onPassed }: SentencePracticeProps) {
  const [input, setInput] = useState('')
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceSupported] = useState(() =>
    typeof window !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia),
  )
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    setVoiceError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(URL.createObjectURL(blob))
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      setVoiceError('麦克风权限未开启')
      setTimeout(() => setVoiceError(null), 3000)
    }
  }, [audioUrl])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }, [])

  const toggleRecording = useCallback(() => {
    if (recording) stopRecording()
    else startRecording()
  }, [recording, startRecording, stopRecording])

  const handleDiagnose = () => {
    if (!input.trim()) return
    setDiagnosis(diagnoseSentence(input.trim(), crystal.english))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && input.trim() && !(diagnosis?.passed)) {
      e.preventDefault(); handleDiagnose()
    }
  }

  const diagPassed = diagnosis?.passed ?? false
  const canSubmit = input.trim().length > 0 && !diagPassed

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-white/25 text-xs tracking-widest shrink-0">整 句 输 出</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      <p className="text-white/30 text-[11px] text-center tracking-wider">根据中文提示，输入或说出完整英文句子</p>
      <p className="text-xl font-bold text-white text-center leading-relaxed">{crystal.chinese}</p>

      {/* Input row */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setDiagnosis(null) }}
          onKeyDown={handleKeyDown}
          placeholder="输入英文句子..."
          className="w-full min-h-[44px] px-4 pr-12 py-0 rounded-xl text-sm outline-none transition-all bg-white/[0.03] border border-white/[0.08] text-white/80 focus:border-white/[0.18] focus:bg-white/[0.05] placeholder:text-white/15"
        />
        {voiceSupported && (
          <button
            onClick={toggleRecording}
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
              recording ? 'bg-red-400/20 text-red-300' : 'text-white/30 hover:text-white/50'
            }`}
            title={recording ? '点击停止' : '录音'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
        )}
      </div>

      {recording && <p className="text-[11px] text-center text-red-300/70 animate-pulse">正在录音，再次点击结束...</p>}
      {voiceError && <p className="text-[11px] text-center text-red-300/70">{voiceError}</p>}

      {/* Audio playback */}
      {audioUrl && !recording && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <button onClick={togglePlayback}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/60 transition-colors shrink-0">
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
            )}
          </button>
          <span className="text-white/25 text-[10px]">录音回放</span>
          <audio ref={audioRef} src={audioUrl} className="hidden" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />
        </div>
      )}

      {diagPassed ? (
        <button onClick={() => onPassed()}
          className="w-full py-3 rounded-full text-sm font-semibold tracking-wider text-white transition-all active:scale-95 min-h-[48px]"
          style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.7), rgba(52,211,153,0.7))', boxShadow: '0 0 30px rgba(74,222,128,0.15)' }}>
          标记为已练习
        </button>
      ) : (
        <button onClick={handleDiagnose} disabled={!canSubmit}
          className="w-full py-3 rounded-full text-sm font-semibold tracking-wider transition-all min-h-[48px] active:scale-[0.98] disabled:opacity-30"
          style={{ background: canSubmit ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${canSubmit ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, color: canSubmit ? '#fff' : 'rgba(255,255,255,0.15)' }}>
          提交 AI 诊断
        </button>
      )}

      {/* Diagnosis */}
      {diagnosis && (
        <div className="w-full p-4 rounded-2xl" style={{
          background: diagPassed ? 'rgba(74,222,128,0.03)' : 'rgba(251,191,36,0.03)',
          border: `1px solid ${diagPassed ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.12)'}`,
        }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `conic-gradient(${diagPassed ? '#4ade80' : '#fbbf24'} ${diagnosis.score}%, rgba(255,255,255,0.04) ${diagnosis.score}%)` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium bg-[#02030a]" style={{ color: diagPassed ? '#86efac' : '#fde68a' }}>
                {diagnosis.score}
              </div>
            </div>
            <p className="text-xs leading-relaxed flex-1 text-white/50">{diagnosis.feedback}</p>
          </div>
          {diagnosis.details.length > 0 && (
            <div className="border-t border-white/[0.06] pt-2.5 mt-2.5">
              {diagnosis.details.map((d, i) => (
                <div key={i} className="text-[11px] py-0.5 flex items-start gap-1.5 text-white/30">
                  <span>·</span><span>{d}</span>
                </div>
              ))}
            </div>
          )}
          {!diagPassed && (
            <div className="border-t border-white/[0.06] pt-2.5 mt-2.5">
              <p className="text-[10px] text-white/30 mb-1">标准表达</p>
              <p className="text-[13px] font-medium text-white/80 italic break-words">{crystal.english}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
