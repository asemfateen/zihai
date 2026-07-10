import { useState } from 'react'
import { fetchWithTimeout } from '../api'
import Spinner from '../components/Spinner'
import { Link } from 'react-router-dom'
import { PlayIcon } from '../components/Icons'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'

function AnalyzerPage() {
  const [text, setText] = useState('')
  const [tokens, setTokens] = useState([])
  const [translation, setTranslation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { speak, isSpeaking } = useSpeechSynthesis()

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setTranslation('')
    try {
      const res = await fetchWithTimeout('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to analyze text')
      setTokens(data.tokens || [])
      setTranslation(data.translation || '')
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

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">Reading Mode</h1>
          <p className="text-lg text-text-secondary font-medium">Paste Chinese text below. We will break it down into words, add pinyin, and highlight difficulty levels.</p>
        </header>

        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in [animation-delay:100ms] mb-8">
          <textarea
            className="w-full h-32 bg-surface/50 border border-border rounded-2xl p-4 text-text-primary focus:outline-none focus:border-primary transition-colors resize-none mb-4 font-sans"
            placeholder="Paste Chinese text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          ></textarea>
          
          <div className="flex justify-between items-center">
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="bg-primary text-text-primary px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Spinner className="w-5 h-5 text-text-primary animate-spin" />}
              Analyze Text
            </button>
            {error && <span className="text-rose-500 font-medium text-sm">{error}</span>}
          </div>
        </div>

        {tokens.length > 0 && (
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in [animation-delay:200ms]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Analysis Result</h2>
              <button
                onClick={() => speak(text)}
                disabled={isSpeaking}
                className="p-2 rounded-xl bg-surface hover:bg-primary/20 text-primary transition-colors"
                title="Play full text audio"
              >
                {isSpeaking ? <Spinner className="w-5 h-5 animate-spin" /> : <PlayIcon className="w-5 h-5" />}
              </button>
            </div>
            
            {translation && (
              <div className="mb-6 p-5 bg-primary/5 border border-primary/20 rounded-2xl animate-fade-in">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2 select-none">
                  <span>📝</span> English Translation
                </h3>
                <p className="text-base sm:text-lg font-bold text-text-primary leading-relaxed">
                  {translation}
                </p>
              </div>
            )}
            
            <div className="leading-[3.5rem] md:leading-[4rem] text-justify">
              {tokens.map((token, idx) => {
                if (!token.isChinese) {
                  return <span key={idx} className="text-2xl text-text-secondary mx-0.5">{token.text}</span>
                }
                
                return (
                  <div key={idx} className="group relative inline-flex flex-col items-center mx-1 align-bottom cursor-pointer hover:scale-110 transition-transform">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-10 w-48 p-3 bg-surface border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none scale-95 group-hover:scale-100">
                      <div className="font-bold text-lg mb-1">{token.text}</div>
                      <div className="text-primary font-medium text-sm mb-1">{token.pinyin}</div>
                      <div className="text-xs text-text-secondary line-clamp-3">{token.definition || 'No definition found'}</div>
                      {token.hsk_level > 0 && (
                        <div className="mt-2 text-[10px] uppercase font-bold tracking-widest bg-surface-hover inline-block px-2 py-0.5 rounded text-text-secondary">
                          HSK {token.hsk_level}
                        </div>
                      )}
                    </div>
                    
                    {/* Pinyin Ruby */}
                    <span className="text-[11px] md:text-xs text-text-secondary absolute -top-5 md:-top-6 whitespace-nowrap opacity-80 group-hover:opacity-100 group-hover:text-primary transition-colors font-medium">
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
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyzerPage
