import { useState } from 'react'
import Navbar from '../components/Navbar'
import { SpeakerIcon, SpeakerWaveIcon } from '../components/Icons'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'

const INITIALS = [
  { label: 'Zero Initial', value: '' },
  { label: 'b', value: 'b' }, { label: 'p', value: 'p' }, { label: 'm', value: 'm' }, { label: 'f', value: 'f' },
  { label: 'd', value: 'd' }, { label: 't', value: 't' }, { label: 'n', value: 'n' }, { label: 'l', value: 'l' },
  { label: 'g', value: 'g' }, { label: 'k', value: 'k' }, { label: 'h', value: 'h' },
  { label: 'j', value: 'j' }, { label: 'q', value: 'q' }, { label: 'x', value: 'x' },
  { label: 'zh', value: 'zh' }, { label: 'ch', value: 'ch' }, { label: 'sh', value: 'sh' }, { label: 'r', value: 'r' },
  { label: 'z', value: 'z' }, { label: 'c', value: 'c' }, { label: 's', value: 's' },
  { label: 'y', value: 'y' }, { label: 'w', value: 'w' }
]

const FINALS = [
  'a', 'o', 'e', 'i', 'u', 'ü',
  'ai', 'ei', 'ui', 'ao', 'ou', 'iu',
  'ie', 'üe', 'er', 'an', 'en', 'in',
  'un', 'ün', 'ang', 'eng', 'ing', 'ong'
]

const VALID_COMBINATIONS = {
  '': ['a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'er', 'an', 'en', 'ang', 'eng', 'ong'],
  'b': ['a', 'o', 'i', 'u', 'ai', 'ei', 'ao', 'ie', 'an', 'en', 'in', 'ang', 'eng', 'ing'],
  'p': ['a', 'o', 'i', 'u', 'ai', 'ei', 'ao', 'ou', 'ie', 'an', 'en', 'in', 'ang', 'eng', 'ing'],
  'm': ['a', 'o', 'e', 'i', 'u', 'ai', 'ei', 'ao', 'ou', 'ie', 'an', 'en', 'in', 'ang', 'eng', 'ing'],
  'f': ['a', 'o', 'u', 'ei', 'ou', 'an', 'en', 'ang', 'eng'],
  'd': ['a', 'e', 'i', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'an', 'en', 'ang', 'eng', 'ong'],
  't': ['a', 'e', 'i', 'u', 'ai', 'ui', 'ao', 'ou', 'ie', 'an', 'en', 'ang', 'eng', 'ong'],
  'n': ['a', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ao', 'ou', 'ie', 'üe', 'an', 'en', 'in', 'ang', 'eng', 'ing', 'ong'],
  'l': ['a', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'an', 'in', 'ang', 'eng', 'ing', 'ong'],
  'g': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  'k': ['a', 'e', 'u', 'ai', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  'h': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  'j': ['i', 'u', 'ü', 'ia', 'ian', 'iang', 'iao', 'ie', 'in', 'ing', 'iong', 'iu', 'ong', 'üe', 'un', 'ün'],
  'q': ['i', 'u', 'ü', 'ia', 'ian', 'iang', 'iao', 'ie', 'in', 'ing', 'iong', 'iu', 'ong', 'üe', 'un', 'ün'],
  'x': ['i', 'u', 'ü', 'ia', 'ian', 'iang', 'iao', 'ie', 'in', 'ing', 'iong', 'iu', 'ong', 'üe', 'un', 'ün'],
  'zh': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  'ch': ['a', 'e', 'u', 'ai', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  'sh': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng'],
  'r': ['e', 'u', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  'z': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  'c': ['a', 'e', 'u', 'ai', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  's': ['a', 'e', 'u', 'ai', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  'y': ['a', 'o', 'e', 'i', 'u', 'ü', 'an', 'ang', 'ao', 'in', 'ing', 'ong', 'un', 'ün', 'ie', 'ue', 'üe'],
  'w': ['a', 'o', 'e', 'i', 'u', 'ai', 'ei', 'an', 'en', 'ang', 'eng']
}

function getToneSyllable(syllable, tone) {
  const vowels = ['a', 'o', 'e', 'i', 'u', 'ü']
  const toneMarks = {
    'a': ['ā', 'á', 'ǎ', 'à'],
    'o': ['ō', 'ó', 'ǒ', 'ò'],
    'e': ['ē', 'é', 'ě', 'è'],
    'i': ['ī', 'í', 'ǐ', 'ì'],
    'u': ['ū', 'ú', 'ǔ', 'ù'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ']
  }

  let targetVowel = ''
  if (syllable.includes('a')) targetVowel = 'a'
  else if (syllable.includes('o')) targetVowel = 'o'
  else if (syllable.includes('e')) targetVowel = 'e'
  else if (syllable.includes('ui')) targetVowel = 'i'
  else if (syllable.includes('iu')) targetVowel = 'u'
  else {
    for (const v of vowels) {
      if (syllable.includes(v)) {
        targetVowel = v
        break
      }
    }
  }

  if (targetVowel && toneMarks[targetVowel]) {
    const mark = toneMarks[targetVowel][tone - 1]
    return syllable.replace(targetVowel, mark)
  }
  return syllable + tone
}

function PinyinChartPage() {
  const [selectedInitial, setSelectedInitial] = useState('')
  const [selectedSyllable, setSelectedSyllable] = useState(null)
  const [activeTonedSyllable, setActiveTonedSyllable] = useState(null)
  const { speak: speakTTS, isSpeaking } = useSpeechSynthesis()

  const speakSyllable = (syllable, tone) => {
    const toned = getToneSyllable(syllable, tone)
    setActiveTonedSyllable(toned)
    speakTTS(toned)
  }

  const validFinals = VALID_COMBINATIONS[selectedInitial] || []

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pinyin Sound Chart</h1>
          <p className="text-text-secondary">Click any initial, combine with a final, and tap tones to hear correct pronunciations.</p>
        </header>

        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-5 mb-6">
          <h3 className="text-xs uppercase font-bold text-text-secondary tracking-wider mb-3">1. Select Initials</h3>
          <div className="flex flex-wrap gap-2">
            {INITIALS.map((init) => (
              <button
                key={init.label}
                onClick={() => {
                  setSelectedInitial(init.value)
                  setSelectedSyllable(null)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  selectedInitial === init.value
                    ? 'bg-primary border-primary text-text-primary'
                    : 'bg-surface/80 backdrop-blur-xl border-border/50 text-text-secondary hover:border-primary/50'
                }`}
              >
                {init.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-5">
            <h3 className="text-xs uppercase font-bold text-text-secondary tracking-wider mb-3">2. Combines into Syllable</h3>
            {validFinals.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {validFinals.map((fn) => {
                  const syl = selectedInitial + fn
                  return (
                    <button
                      key={fn}
                      onClick={() => setSelectedSyllable(syl)}
                      className={`p-3 rounded-lg text-base font-bold transition-all border text-center ${
                        selectedSyllable === syl
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-surface/80 backdrop-blur-xl border-border/50 text-text-primary hover:border-primary/50'
                      }`}
                    >
                      {syl}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Select an initial above to see syllable options.</p>
            )}
          </div>

          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-5 flex flex-col justify-start">
            <h3 className="text-xs uppercase font-bold text-text-secondary tracking-wider mb-3">3. Play Tones</h3>
            {selectedSyllable ? (
              <div className="space-y-3 mt-2">
                <p className="text-center text-xl font-semibold mb-4">
                  Syllable: <span className="text-primary font-black">{selectedSyllable}</span>
                </p>
                {[1, 2, 3, 4].map((tone) => {
                  const tonedText = getToneSyllable(selectedSyllable, tone)
                  const isActive = isSpeaking && activeTonedSyllable === tonedText
                  return (
                    <button
                      key={tone}
                      onClick={() => speakSyllable(selectedSyllable, tone)}
                      className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all hover:scale-102 active:scale-98 ${
                        isActive
                          ? 'bg-primary/10 border-primary text-primary animate-pulse'
                          : 'bg-surface/80 backdrop-blur-xl border-border/50 text-text-primary hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-2xl font-black text-text-primary">{tonedText}</span>
                        <span className="text-xs text-text-secondary font-medium">Tone {tone}</span>
                      </div>
                      {isActive ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-sm text-text-secondary py-12">
                Select a syllable on the left to play tones.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PinyinChartPage
