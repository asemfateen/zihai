import { useState } from 'react'
import { fetchWithTimeout } from '../api'
import Spinner from './Spinner'
import { Link } from 'react-router-dom'
import { PlayIcon } from './Icons'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'

export default function TextAnalyzer({ cardStyle = true }) {
  const [text, setText] = useState('')
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)
  const [error, setError] = useState(null)
  const { speak, isSpeaking } = useSpeechSynthesis()

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithTimeout('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to analyze text')
      setTokens(data.tokens || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getHskColor = (level) => {
    if (!level) return 'text-text-secondary border-border/50'
    const colors = {
      1: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5',
      2: 'text-blue-500 border-blue-500/30 bg-blue-500/5',
      3: 'text-indigo-500 border-indigo-500/30 bg-indigo-500/5',
      4: 'text-purple-500 border-purple-500/30 bg-purple-500/5',
      5: 'text-pink-500 border-pink-500/30 bg-pink-500/5',
      6: 'text-rose-500 border-rose-500/30 bg-rose-500/5'
    }
    return colors[level] || 'text-amber-500 border-amber-500/30 bg-amber-500/5'
  }

  const containerClass = cardStyle 
    ? "bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in mb-8"
    : "w-full"

  return (
    <div className="w-full">
      <div className={containerClass}>
        <h3 className="text-xl font-bold text-text-primary mb-3">Reading Mode (Text Analyzer)</h3>
        <p className="text-sm text-text-secondary mb-4 font-medium">Paste Chinese text below to break it down into words, show pinyin, and get English definitions.</p>
        
        <textarea
          className="w-full h-32 bg-surface/50 border border-border rounded-2xl p-4 text-text-primary focus:outline-none focus:border-primary transition-colors resize-none mb-4 font-sans text-sm sm:text-base"
          placeholder="Paste Chinese text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>
        
        <div className="flex justify-between items-center">
          <button
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="bg-primary text-text-primary px-5 py-2.5 rounded-2xl font-bold transition-all hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer text-sm sm:text-base"
          >
            {loading && <Spinner className="w-4 h-4 text-text-primary animate-spin" />}
            Analyze Text
          </button>
          {error && <span className="text-rose-500 font-medium text-xs sm:text-sm">{error}</span>}
        </div>
      </div>

      {tokens.length > 0 && (
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in [animation-delay:100ms] mb-8">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-bold text-text-primary">Analysis Result</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEnglish(!showEnglish)}
                className={`px-3 py-1.5 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer border ${
                  showEnglish 
                    ? 'bg-primary border-primary text-white shadow-sm' 
                    : 'bg-surface border-border/50 text-text-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                }`}
              >
                {showEnglish ? 'Hide English' : 'Show English'}
              </button>
              <button
                onClick={() => speak(text)}
                disabled={isSpeaking}
                className="p-2 rounded-xl bg-surface hover:bg-primary/20 text-primary transition-colors cursor-pointer border border-border/50 hover:border-primary/30"
                title="Play full text audio"
              >
              {isSpeaking ? <Spinner className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
            </button>
            </div>
          </div>
          
          <div className="leading-[3.5rem] md:leading-[4rem] text-justify">
            {tokens.map((token, idx) => {
              if (!token.isChinese) {
                return <span key={idx} className="text-2xl text-text-secondary mx-0.5">{token.text}</span>
              }
              
              return (
                <div key={idx} className="group relative inline-flex flex-col items-center mx-1 align-bottom cursor-pointer hover:scale-110 transition-transform">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-10 w-48 p-3 bg-surface border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none scale-95 group-hover:scale-100">
                    <div className="font-bold text-lg mb-1 text-text-primary">{token.text}</div>
                    <div className="text-primary font-medium text-sm mb-1">{token.pinyin}</div>
                    <div className="text-xs text-text-secondary line-clamp-3">{token.definition || 'No definition found'}</div>
                    {token.hsk_level > 0 && (
                      <div className="mt-2 text-[10px] uppercase font-bold tracking-widest bg-surface-hover inline-block px-2 py-0.5 rounded text-text-secondary">
                        HSK {token.hsk_level}
                      </div>
                    )}
                  </div>
                  
                  {/* Pinyin Ruby */}
                  <span className="text-[11px] md:text-xs text-text-secondary whitespace-nowrap opacity-80 group-hover:opacity-100 group-hover:text-primary transition-colors font-medium mb-1">
                    {token.pinyin || ''}
                  </span>
                  
                  {/* Chinese Text */}
                  <Link
                    to={token.id ? `/word/${token.id}` : '#'}
                    className={`text-2xl md:text-3xl font-medium border-b-2 transition-colors px-0.5 rounded-sm ${getHskColor(token.hsk_level)}`}
                    onClick={(e) => !token.id && e.preventDefault()}
                  >
                    {token.text}
                  </Link>
                  
                  {/* Inline English Definition */}
                  {showEnglish && token.definition && (
                    <span className="text-[10px] md:text-xs text-text-secondary mt-1 leading-tight text-center max-w-[80px] break-words line-clamp-2">
                      {token.definition.split('/').filter(Boolean).slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
