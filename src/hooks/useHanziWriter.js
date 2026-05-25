import { useState, useEffect, useRef, useCallback } from 'react'
import HanziWriter from 'hanzi-writer'

const HANZI_CACHE_MAX = 200

function isMounted(mountedRef) {
  return !mountedRef.current
}

export function useHanziWriter(word, mountedRef) {
  const [supportedChars, setSupportedChars] = useState({})
  const writerRefs = useRef({})
  const writersRef = useRef({})
  const strokeCountsRef = useRef({})
  const hanziDataCacheRef = useRef(new Map())
  const effectIdRef = useRef(0)

  useEffect(() => {
    if (!word) return

    const effectId = ++effectIdRef.current
    const chars = word.character.split('')
    const newSupported = {}
    const newWriters = {}
    const cache = hanziDataCacheRef.current

    const rafIds = []
    chars.forEach((char, i) => {
      const container = writerRefs.current[i]
      if (!container) return

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

          newWriters[i] = writer
          newSupported[i] = true
        } catch (e) {
          console.error('Failed to initialize HanziWriter:', e)
          newSupported[i] = false
        }
      })
      rafIds.push(rafId)
    })

    writersRef.current = newWriters
    setSupportedChars(newSupported)

    chars.forEach((char, i) => {
      if (cache.has(char)) {
        strokeCountsRef.current[i] = cache.get(char).strokes.length
        return
      }
      HanziWriter.loadCharacterData(char).then((data) => {
        if (effectId !== effectIdRef.current) return
        if (!mountedRef.current) return
        if (cache.size >= HANZI_CACHE_MAX) {
          const firstKey = cache.keys().next().value
          cache.delete(firstKey)
        }
        cache.set(char, data)
        strokeCountsRef.current[i] = data.strokes.length
      }).catch((err) => {
        if (effectId !== effectIdRef.current) return
        if (!mountedRef.current) return
        console.error(`Failed to load character data for ${char}:`, err)
        strokeCountsRef.current[i] = 5
        setSupportedChars((prev) => ({ ...prev, [i]: false }))
      })
    })

    return () => {
      rafIds.forEach(id => cancelAnimationFrame(id))
      Object.values(writersRef.current).forEach((writer) => {
        if (writer && typeof writer.cancelAnimation === 'function') writer.cancelAnimation()
      })
      writersRef.current = {}
      strokeCountsRef.current = {}
    }
  }, [word, mountedRef])

  const pausedRef = useRef(false)
  const resumeHandlersRef = useRef([])

  const animateCharacterWithPromise = useCallback((writer, charIndex) => {
    return new Promise((resolve) => {
      if (!mountedRef.current) { resolve(); return }
      const strokeCount = strokeCountsRef.current[charIndex]
      const effectiveStrokes = (strokeCount !== undefined && strokeCount > 0) ? strokeCount : 5
      const duration = effectiveStrokes * 300 + 200
      if (writer) writer.cancelAnimation()
      if (writer) writer.animateCharacter()
      const timer = setTimeout(() => {
        resumeHandlersRef.current = resumeHandlersRef.current.filter(h => h !== resume)
        if (!pausedRef.current) resolve()
      }, duration)
      const resume = () => { clearTimeout(timer); resolve() }
      resumeHandlersRef.current = [...resumeHandlersRef.current, resume]
    })
  }, [mountedRef])

  const playAll = useCallback(async () => {
    if (!word) return
    pausedRef.current = false
    const chars = word.character.split('')
    for (let i = 0; i < chars.length; i++) {
      if (!mountedRef.current || pausedRef.current) break
      const writer = writersRef.current[i]
      if (writer) {
        await animateCharacterWithPromise(writer, i)
        if (!mountedRef.current || pausedRef.current) break
        if (i < chars.length - 1) {
          await new Promise((resolve) => {
            const interval = setInterval(() => {
              if (!mountedRef.current || pausedRef.current) { clearInterval(interval); resolve(); return }
            }, 100)
            setTimeout(() => { clearInterval(interval); resolve() }, 400)
          })
        }
      }
    }
  }, [word, animateCharacterWithPromise, mountedRef])

  const pauseAll = useCallback(() => {
    pausedRef.current = true
    resumeHandlersRef.current.forEach(h => h())
    resumeHandlersRef.current = []
    Object.values(writersRef.current).forEach((writer) => {
      if (writer && typeof writer.pauseAnimation === 'function') writer.pauseAnimation()
    })
  }, [])

  const replayAll = useCallback(() => {
    pausedRef.current = false
    Object.values(writersRef.current).forEach((writer) => {
      if (writer && typeof writer.animateCharacter === 'function') {
        if (typeof writer.cancelAnimation === 'function') writer.cancelAnimation()
        writer.animateCharacter()
      }
    })
  }, [])

  return {
    writerRefs,
    supportedChars,
    playAll,
    pauseAll,
    replayAll,
  }
}
