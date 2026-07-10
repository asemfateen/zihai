import { useState, useEffect, useRef, useCallback } from 'react'

const browserSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
const audioSupported = typeof window !== 'undefined' && typeof Audio !== 'undefined'

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const audioRef = useRef(null)
  const lastCallRef = useRef({ text: '', tone: null, time: 0 })

  useEffect(() => {
    if (audioSupported) {
      setReady(true)
    }

    if (!browserSupported) return

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
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsLoading(false)
      setIsSpeaking(false)
    }
  }, [])

  const speakBrowser = useCallback((text, tone) => {
    if (!browserSupported || !text) {
      setIsLoading(false)
      return false
    }
    const v = window.speechSynthesis.getVoices()

    // Priority: Premium/Neural/Online/Google voices first
    let chineseVoice = v.find((voice) =>
      (voice.lang.startsWith('zh') || voice.lang.includes('cmn')) &&
      (voice.name.toLowerCase().includes('premium') ||
       voice.name.toLowerCase().includes('neural') ||
       voice.name.toLowerCase().includes('online') ||
       voice.name.toLowerCase().includes('google'))
    )

    // Fallback to any Chinese voice
    if (!chineseVoice) {
      chineseVoice = v.find((voice) => voice.lang.startsWith('zh') || voice.lang.includes('cmn'))
    }

    window.speechSynthesis.cancel()

    let speechText = text
    if (/^[a-z]+$/i.test(text)) {
      console.warn('Browser TTS fallback received raw pinyin. It may spell the letters in English.')
    }

    const utterance = new SpeechSynthesisUtterance(speechText)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8
    if (chineseVoice) utterance.voice = chineseVoice

    utterance.onstart = () => {
      setIsLoading(false)
      setIsSpeaking(true)
    }
    utterance.onend = () => {
      setIsSpeaking(false)
      setIsLoading(false)
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      setIsLoading(false)
    }

    window.speechSynthesis.speak(utterance)
    return true
  }, [])

  const speak = useCallback(async (text, tone) => {
    if (!text) return false

    // Prevent double-calls (common with fast clicks or React issues)
    const now = Date.now()
    if (text === lastCallRef.current.text && tone === lastCallRef.current.tone && (now - lastCallRef.current.time < 300)) {
      return false
    }
    lastCallRef.current = { text, tone, time: now }

    // Stop any current playback
    if (browserSupported) window.speechSynthesis.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onplay = null
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }

    setIsLoading(true)
    setIsSpeaking(false)

    // Try Premium Backend TTS first
    try {
      const toneQuery = tone ? `&tone=${tone}` : ''
      const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}${toneQuery}&t=${now}`)
      audioRef.current = audio

      audio.onplay = () => {
        setIsLoading(false)
        setIsSpeaking(true)
      }
      audio.onended = () => {
        setIsSpeaking(false)
        setIsLoading(false)
        audioRef.current = null
      }
      audio.onerror = () => {
        audioRef.current = null
        // Fallback to browser (speakBrowser handles setting isLoading/isSpeaking)
        speakBrowser(text, tone)
      }

      await audio.play()
      return true
    } catch (err) {
      console.warn('Backend TTS failed, falling back to browser:', err)
      return speakBrowser(text, tone)
    }
  }, [speakBrowser])

  return { speak, isSpeaking, isLoading, ready, supported: browserSupported || audioSupported }
}
