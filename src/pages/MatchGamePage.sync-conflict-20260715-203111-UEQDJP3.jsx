import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import API_BASE, { fetchWithTimeout } from '../api'
import { useAuth } from '../context/AuthContext'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'

export default function MatchGamePage() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [flippedIndices, setFlippedIndices] = useState([])
  const [matchedPairs, setMatchedPairs] = useState([])
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [moves, setMoves] = useState(0)
  const [hskLevel, setHskLevel] = useState(null)
  const [error, setError] = useState(null)

  const { speak } = useSpeechSynthesis()

  const startNewGame = async (level = hskLevel) => {
    if (!level) return
    setHskLevel(level)
    setLoading(true)
    setGameOver(false)
    setMatchedPairs([])
    setFlippedIndices([])
    setScore(0)
    setMoves(0)
    setError(null)

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/quiz/generate?hsk=${level}`, { credentials: 'include' })
      if (res.ok) {
        const words = await res.json()
        if (!words || words.length === 0) {
          throw new Error('No words available for this HSK level. Try selecting a different level.')
        }
        const selectedWords = words.slice(0, 8)
        
        // Create 2 cards per word (one Hanzi, one English)
        let gameCards = []
        selectedWords.forEach(word => {
          gameCards.push({ id: `hanzi-${word.id}`, wordId: word.id, content: word.character, type: 'hanzi', pinyin: word.pinyin })
          gameCards.push({ id: `eng-${word.id}`, wordId: word.id, content: word.answer, type: 'english' })
        })

        // Shuffle
        gameCards.sort(() => Math.random() - 0.5)
        setCards(gameCards)
      } else {
        throw new Error('Server returned an error generating words')
      }
    } catch (err) {
      console.error('Failed to load game:', err)
      setError(err.message || 'Failed to initialize game')
    } finally {
      setLoading(false)
    }
  }

  // No autoplay on mount - user must select level first

  const handleCardClick = (index) => {
    // Prevent clicking if already matched, already flipped, or if 2 cards are currently animating
    if (matchedPairs.includes(cards[index].wordId)) return
    if (flippedIndices.includes(index)) return
    if (flippedIndices.length === 2) return

    const newFlipped = [...flippedIndices, index]
    setFlippedIndices(newFlipped)

    if (cards[index].type === 'hanzi') {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      speak(cards[index].content)
    }

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      const firstCard = cards[newFlipped[0]]
      const secondCard = cards[newFlipped[1]]

      if (firstCard.wordId === secondCard.wordId) {
        // Match found
        setTimeout(() => {
          setMatchedPairs(prev => [...prev, firstCard.wordId])
          setFlippedIndices([])
          setScore(s => s + 10)
          
          if (matchedPairs.length + 1 === cards.length / 2) {
            setGameOver(true)
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } })
          }
        }, 600)
      } else {
        // No match
        setTimeout(() => {
          setFlippedIndices([])
        }, 1000)
      }
    }
  }

  if (!user) return null

  if (error) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary flex items-center justify-center">
        <div className="bg-card/85 backdrop-blur-xl border border-border/50 rounded-3xl p-8 max-w-md text-center shadow-lg animate-fade-in mx-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Game Generation Failed</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => { setError(null); setHskLevel(null); }}
              className="px-6 py-2.5 bg-surface border border-border/50 text-text-primary rounded-xl font-bold hover:scale-105 transition-transform cursor-pointer"
            >
              Change Level
            </button>
            <button
              onClick={() => startNewGame(hskLevel)}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-transform cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (hskLevel === null) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 pb-20">
        <div className="max-w-2xl mx-auto px-4 pt-24 animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-text-primary mb-2">
              Memory Match
            </h1>
            <p className="text-text-secondary">
              Match Chinese characters with their English definitions
            </p>
          </div>

          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm">
            <div className="mb-8">
              <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 text-center">
                Select HSK Level
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <button
                    key={level}
                    onClick={() => startNewGame(level)}
                    className="py-4 rounded-2xl font-bold text-lg transition-all bg-surface text-text-secondary hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/30 border border-border/50 cursor-pointer"
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-24 h-24 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl mb-8"></div>
          <div className="text-xl font-bold">Shuffling Cards...</div>
        </div>
      </div>
    )
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary pb-20">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-fade-in">
          <h1 className="text-5xl font-black mb-4">You Won!</h1>
          <p className="text-2xl text-text-secondary mb-2">HSK Level: <span className="text-primary font-bold">{hskLevel}</span></p>
          <p className="text-xl text-text-secondary mb-4">Score: <span className="text-primary font-bold">{score}</span></p>
          <p className="text-lg text-text-secondary mb-12">Moves: <span className="font-bold">{moves}</span></p>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => startNewGame(hskLevel)}
              className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 transition-all text-lg cursor-pointer"
            >
              Play Again
            </button>
            <button 
              onClick={() => setHskLevel(null)}
              className="px-8 py-4 bg-surface text-text-primary border border-border/50 rounded-2xl font-bold hover:-translate-y-1 hover:shadow-xl transition-all text-lg cursor-pointer"
            >
              Change Level
            </button>
            <Link 
              to="/"
              className="px-8 py-4 bg-surface text-text-primary border border-border/50 rounded-2xl font-bold hover:-translate-y-1 hover:shadow-xl transition-all text-lg flex items-center"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center mb-8 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
           <div>
             <span className="text-text-secondary text-sm font-bold uppercase tracking-wider">Moves</span>
             <div className="text-2xl font-black">{moves}</div>
           </div>
           <div className="text-center">
             <h1 className="text-2xl font-black tracking-tight text-primary">Memory Match</h1>
             <button
               onClick={() => setHskLevel(null)}
               className="text-xs text-text-secondary hover:text-primary transition-colors font-bold mt-1 cursor-pointer"
             >
               Level: HSK {hskLevel} (Change)
             </button>
           </div>
           <div className="text-right">
             <span className="text-text-secondary text-sm font-bold uppercase tracking-wider">Score</span>
             <div className="text-2xl font-black text-primary">{score}</div>
           </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-4 gap-4 perspective-1000">
          {cards.map((card, index) => {
            const isFlipped = flippedIndices.includes(index) || matchedPairs.includes(card.wordId)
            const isMatched = matchedPairs.includes(card.wordId)

            return (
              <motion.div 
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
                animate={{ 
                  opacity: isMatched ? 0.5 : 1, 
                  scale: isMatched ? 0.95 : 1, 
                  rotateY: isFlipped ? 180 : 0 
                }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
                whileHover={!isFlipped && !isMatched ? { scale: 1.05, y: -5 } : {}}
                onClick={() => handleCardClick(index)}
                className={`relative w-full aspect-square cursor-pointer preserve-3d shadow-sm hover:shadow-lg rounded-2xl`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Back of Card */}
                <div 
                  className="absolute inset-0 bg-surface border-2 border-border/50 rounded-2xl flex items-center justify-center text-primary/30"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                   <span className="text-4xl font-black">?</span>
                </div>
                
                {/* Front of Card */}
                <div 
                  className={`absolute inset-0 border-2 rounded-2xl flex flex-col items-center justify-center p-2 text-center shadow-inner ${isMatched ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/20' : 'bg-card/90 backdrop-blur-xl border-border/50 shadow-primary/5'}`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {card.type === 'hanzi' ? (
                    <>
                      <div className="text-sm font-bold text-primary mb-1">{card.pinyin}</div>
                      <div className="text-4xl font-black">{card.content}</div>
                    </>
                  ) : (
                    <div className="text-base font-bold line-clamp-3">{card.content}</div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
