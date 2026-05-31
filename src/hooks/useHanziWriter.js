import { useState, useEffect, useRef, useCallback } from 'react'
import HanziWriter from 'hanzi-writer'

const HANZI_CACHE_MAX = 200

export function useHanziWriter(word) {
  const [supportedChars, setSupportedChars] = useState({})
  const [writersReady, setWritersReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const writerRefs = useRef({})
  const writersRef = useRef({})
  const strokeCountsRef = useRef({})
  const hanziDataCacheRef = useRef(new Map())
  const effectIdRef = useRef(0)
  const activeCharIndexRef = useRef(-1)
  const pausedRef = useRef(false)
  const iterationRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!word) return

    const effectId = ++effectIdRef.current
    const chars = word.character.split('')
    const cache = hanziDataCacheRef.current

    const rafIds = []
    let pending = chars.length
    let readyFired = false

    writersRef.current = {}

    chars.forEach((char, i) => {
      const container = writerRefs.current[i]
      if (!container) {
        pending--
        checkReady()
        return
      }

      container.innerHTML = ''

      const rafId = requestAnimationFrame(() => {
        if (effectId !== effectIdRef.current) return
        if (!mountedRef.current) return

        const rect = container.getBoundingClientRect()
        const size = Math.round(Math.min(rect.width, rect.height)) || 120

        try {
          const writer = HanziWriter.create(container, char, {
            width: size,
            height: size,
            padding: 5,
            showOutline: true,
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 300,
            strokeColor: '#c0392b',
            outlineColor: '#2a2a2a',
            drawingColor: '#c0392b',
            radicalColor: '#e74c3c',
            showCharacter: false,
          })
          writersRef.current[i] = writer
          setSupportedChars((prev) => ({ ...prev, [i]: true }))
        } catch (e) {
          console.error('Failed to initialize HanziWriter:', e)
          setSupportedChars((prev) => ({ ...prev, [i]: false }))
        }
        pending--
        checkReady()
      })
      rafIds.push(rafId)
    })

    function checkReady() {
      if (!readyFired && pending <= 0) {
        readyFired = true
        setWritersReady(true)
      }
    }

    chars.forEach((char, i) => {
      if (cache.has(char)) {
        strokeCountsRef.current[i] = cache.get(char).strokes.length
        return
      }
      HanziWriter.loadCharacterData(char)
        .then((data) => {
          if (effectId !== effectIdRef.current) return
          if (!mountedRef.current) return
          if (cache.size >= HANZI_CACHE_MAX) {
            const firstKey = cache.keys().next().value
            cache.delete(firstKey)
          }
          cache.set(char, data)
          strokeCountsRef.current[i] = data.strokes.length
        })
        .catch((err) => {
          if (effectId !== effectIdRef.current) return
          if (!mountedRef.current) return
          console.error(`Failed to load character data for ${char}:`, err)
          strokeCountsRef.current[i] = 5
        })
    })

    return () => {
      rafIds.forEach((id) => cancelAnimationFrame(id))
      Object.values(writersRef.current).forEach((writer) => {
        if (writer && typeof writer.cancelAnimation === 'function') writer.cancelAnimation()
      })
      writersRef.current = {}
      strokeCountsRef.current = {}
    }
  }, [word])

  const playFromIndex = useCallback(
    (startIndex) => {
      if (!word || !writersReady) return
      const iteration = ++iterationRef.current
      pausedRef.current = false
      setIsPaused(false)
      setIsPlaying(true)
      activeCharIndexRef.current = startIndex

      Object.values(writersRef.current).forEach((w) => {
        if (w && typeof w.cancelAnimation === 'function') w.cancelAnimation()
      })

      const chars = word.character.split('')
      let i = startIndex

      const animateNext = () => {
        if (iteration !== iterationRef.current || !mountedRef.current) {
          setIsPlaying(false)
          setIsPaused(false)
          return
        }
        if (pausedRef.current) {
          return
        }
        if (i >= chars.length) {
          setIsPlaying(false)
          setIsPaused(false)
          return
        }
        activeCharIndexRef.current = i
        const writer = writersRef.current[i]
        if (writer && typeof writer.animateCharacter === 'function') {
          writer.cancelAnimation()
          writer.animateCharacter({
            onComplete: () => {
              if (iteration !== iterationRef.current || !mountedRef.current) return
              i++
              setTimeout(animateNext, 200)
            },
          })
        } else {
          i++
          setTimeout(animateNext, 100)
        }
      }

      animateNext()
    },
    [word, writersReady],
  )

  const pause = useCallback(() => {
    if (!isPlaying || isPaused) return
    pausedRef.current = true
    setIsPaused(true)
    const i = activeCharIndexRef.current
    const writer = writersRef.current[i]
    if (writer && typeof writer.pauseAnimation === 'function') {
      writer.pauseAnimation()
    }
  }, [isPlaying, isPaused])

  const resume = useCallback(() => {
    if (!isPlaying || !isPaused) return
    pausedRef.current = false
    setIsPaused(false)
    const writer = writersRef.current[activeCharIndexRef.current]
    if (writer && typeof writer.resumeAnimation === 'function') {
      writer.resumeAnimation()
    }
  }, [isPlaying, isPaused])

  const togglePlay = useCallback(() => {
    if (isPlaying && isPaused) {
      resume()
    } else if (isPlaying) {
      pause()
    } else {
      playFromIndex(0)
    }
  }, [isPlaying, isPaused, pause, resume, playFromIndex])

  return {
    writerRefs,
    supportedChars,
    writersReady,
    isPlaying,
    isPaused,
    playFromIndex,
    pause,
    resume,
    togglePlay,
  }
}
