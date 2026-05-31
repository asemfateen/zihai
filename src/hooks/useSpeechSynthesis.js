import { useState, useEffect, useRef, useCallback } from 'react'

const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isSupported) return
    const update = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length > 0) {
        setReady(true)
      }
    }
    update()
    window.speechSynthesis.onvoiceschanged = update
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [])

  const speak = useCallback((text) => {
    if (!isSupported || !text) return false
    const v = window.speechSynthesis.getVoices()
    const chineseVoice = v.find((voice) => voice.lang.startsWith('zh') || voice.lang.includes('cmn'))
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8
    if (chineseVoice) utterance.voice = chineseVoice
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
    return true
  }, [])

  return { speak, isSpeaking, ready, supported: isSupported }
}
