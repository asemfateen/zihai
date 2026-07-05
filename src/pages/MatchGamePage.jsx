import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API_BASE, { fetchWithTimeout } from '../api'
import { useAuth } from '../context/AuthContext'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import confetti from 'canvas-confetti'

export default function MatchGamePage() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [flippedIndices, setFlippedIndices] = useState([])
  const [matchedPairs, setMatchedPairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [moves, setMoves] = useState(0)

  const { speak } = useSpeechSynthesis()

  const startNewGame = async () => {
    setLoading(true)
    setGameOver(false)
    setMatchedPairs([])
    setFlippedIndices([])
    setScore(0)
    setMoves(0)

    try {
      // We will reuse the quiz generator endpoint to get 8 random words
      const res = await fetchWithTimeout(`${API_BASE}/api/quiz/generate?hsk=1`, { credentials: 'include' })
      if (res.ok) {
        const words = await res.json()
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
      }
    } catch (err) {
      console.error('Failed to load game:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) startNewGame()
  }, [user])

  const handleCardClick = (index) => {
    // Prevent clicking if already matched, already flipped, or if 2 cards are currently animating
    if (matchedPairs.includes(cards[index].wordId)) return
    if (flippedIndices.includes(index)) return
    if (flippedIndices.length === 2) return

    const newFlipped = [...flippedIndices, index]
    setFlippedIndices(newFlipped)

    if (cards[index].type === 'hanzi') {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 text-text-primary flex items-center justify-center">
        <Navbar />
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
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-fade-in">
          <h1 className="text-5xl font-black mb-4">You Won!</h1>
          <p className="text-2xl text-text-secondary mb-4">Score: <span className="text-primary font-bold">{score}</span></p>
          <p className="text-lg text-text-secondary mb-12">Moves: <span className="font-bold">{moves}</span></p>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={startNewGame}
              className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 transition-all text-lg"
            >
              Play Again
            </button>
            <Link 
              to="/"
              className="px-8 py-4 bg-surface text-text-primary border border-border/50 rounded-2xl font-bold hover:-translate-y-1 hover:shadow-xl transition-all text-lg"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary pb-20">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center mb-8 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
           <div>
             <span className="text-text-secondary text-sm font-bold uppercase tracking-wider">Moves</span>
             <div className="text-2xl font-black">{moves}</div>
           </div>
           <div className="text-center">
             <h1 className="text-2xl font-black tracking-tight text-primary">Memory Match</h1>
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
              <div 
                key={card.id}
                onClick={() => handleCardClick(index)}
                className={`relative w-full aspect-square cursor-pointer transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''} ${isMatched ? 'opacity-50 scale-95' : 'hover:-translate-y-1 hover:shadow-lg'}`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Back of Card */}
                <div 
                  className="absolute inset-0 backface-hidden bg-primary/10 border-2 border-primary/20 rounded-2xl flex items-center justify-center text-primary/30"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                   <span className="text-4xl font-black">?</span>
                </div>
                
                {/* Front of Card */}
                <div 
                  className={`absolute inset-0 backface-hidden border-2 rounded-2xl flex flex-col items-center justify-center p-2 text-center rotate-y-180 ${isMatched ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-card/90 backdrop-blur-xl border-border/50'}`}
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
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
