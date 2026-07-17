import { useState } from 'react'
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
    speakTTS(syllable, tone)
  }

  const validFinals = VALID_COMBINATIONS[selectedInitial] || []

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent drop-shadow-sm">Pinyin Sound Chart</h1>
          <p className="text-lg text-text-secondary font-medium">Click any initial, combine with a final, and tap tones to hear correct pronunciations.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-12 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all animate-fade-in [animation-delay:100ms] group relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <h3 className="text-xs uppercase font-black text-text-secondary tracking-widest mb-5 bg-surface inline-block px-4 py-1.5 rounded-full border border-border relative z-10 shadow-sm">1. Select Initials</h3>
             <div className="flex flex-wrap gap-2.5 relative z-10">
               {INITIALS.map((init) => (
                 <button
                   key={init.label}
                   onClick={() => {
                     setSelectedInitial(init.value)
                     setSelectedSyllable(null)
                   }}
                   className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${
                     selectedInitial === init.value
                       ? 'bg-primary border-primary text-text-primary shadow-md shadow-primary/20 scale-105'
                       : 'bg-surface/80 backdrop-blur-xl border-border/50 text-text-secondary hover:border-primary/50 hover:bg-surface hover:-translate-y-0.5'
                   }`}
                 >
                   {init.label || 'None'}
                 </button>
               ))}
             </div>
          </div>

          <div className="md:col-span-8 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 transition-all animate-fade-in [animation-delay:200ms] group relative overflow-hidden min-h-[300px]">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <h3 className="text-xs uppercase font-black text-text-secondary tracking-widest mb-5 bg-surface inline-block px-4 py-1.5 rounded-full border border-border relative z-10 shadow-sm">2. Combines into Syllable</h3>
             <div className="relative z-10">
               {validFinals.length > 0 ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                   {validFinals.map((fn) => {
                     const syl = selectedInitial + fn
                     return (
                       <button
                         key={fn}
                         onClick={() => setSelectedSyllable(syl)}
                         className={`p-4 rounded-2xl text-lg font-bold transition-all border text-center ${
                           selectedSyllable === syl
                             ? 'bg-blue-500/20 border-blue-500 text-blue-500 shadow-md shadow-blue-500/20 scale-105'
                             : 'bg-surface/80 backdrop-blur-xl border-border/50 text-text-primary hover:border-blue-500/50 hover:bg-surface hover:-translate-y-0.5'
                         }`}
                       >
                         {syl}
                       </button>
                     )
                   })}
                 </div>
               ) : (
                 <div className="flex items-center justify-center h-40 text-text-secondary font-medium">
                   Select an initial above to see syllable options.
                 </div>
               )}
             </div>
          </div>

          <div className="md:col-span-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all animate-fade-in [animation-delay:300ms] group relative overflow-hidden flex flex-col justify-start">
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <h3 className="text-xs uppercase font-black text-text-secondary tracking-widest mb-5 bg-surface inline-block px-4 py-1.5 rounded-full border border-border relative z-10 shadow-sm">3. Play Tones</h3>
             <div className="relative z-10 flex-1 flex flex-col">
               {selectedSyllable ? (
                 <div className="space-y-3 mt-2 flex-1">
                   <p className="text-center text-xl font-medium mb-6 bg-surface/50 py-3 rounded-2xl border border-border/50 shadow-sm">
                     Syllable: <span className="text-emerald-500 font-black ml-2 text-2xl">{selectedSyllable}</span>
                   </p>
                   {[1, 2, 3, 4].map((tone) => {
                     const tonedText = getToneSyllable(selectedSyllable, tone)
                     const isActive = isSpeaking && activeTonedSyllable === tonedText
                     return (
                       <button
                         key={tone}
                         onClick={() => speakSyllable(selectedSyllable, tone)}
                         className={`w-full p-4 border rounded-2xl flex items-center justify-between transition-all hover:scale-105 active:scale-95 ${
                           isActive
                             ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 animate-pulse shadow-md shadow-emerald-500/20'
                             : 'bg-surface/80 backdrop-blur-xl border-border/50 text-text-primary hover:border-emerald-500/50 hover:bg-emerald-500/5'
                         }`}
                       >
                         <div className="flex flex-col items-start gap-1">
                           <span className="text-3xl font-black text-text-primary leading-none">{tonedText}</span>
                           <span className="text-xs text-text-secondary font-bold uppercase tracking-wider">Tone {tone}</span>
                         </div>
                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-surface border border-border text-text-secondary'}`}>
                           {isActive ? <SpeakerWaveIcon className="w-6 h-6" /> : <SpeakerIcon className="w-6 h-6" />}
                         </div>
                       </button>
                     )
                   })}
                 </div>
               ) : (
                 <div className="h-full flex items-center justify-center text-center text-text-secondary font-medium py-12">
                   Select a syllable on the left to play tones.
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PinyinChartPage
