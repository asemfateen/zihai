import { useState, useEffect, useRef, useCallback } from 'react'

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSupported(true)
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'zh-CN' // Listen in Chinese

      rec.onstart = () => {
        setIsListening(true)
        setError(null)
      }

      rec.onresult = (event) => {
        const result = event.results[0][0].transcript
        setTranscript(result)
      }

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        let friendlyError = event.error
        if (event.error === 'network') {
          friendlyError = 'Network error. Chrome requires an internet connection for speech recognition.'
        } else if (event.error === 'not-allowed') {
          friendlyError = 'Microphone access denied. Please allow microphone access in your browser.'
        }
        setError(friendlyError)
        setIsListening(false)
      }

      rec.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = rec
    }
  }, [])

  const startListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    setTranscript('')
    setError(null)
    try {
      recognitionRef.current.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setError('Could not start microphone')
    }
  }, [supported])

  const stopListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch (err) {
      console.error('Failed to stop speech recognition:', err)
    }
  }, [supported])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  return {
    supported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
