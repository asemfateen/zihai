import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'

function SearchResultCard({ result }) {
  const navigate = useNavigate()

  const handleClick = () => navigate(`/word/${result.id}`)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${result.character}, ${result.pinyin}: ${result.english_definition}`}
      className="flex items-center gap-4 sm:gap-5 p-4 bg-card border border-border rounded-xl hover:border-primary hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-[98%] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
    >
      <div className="flex-shrink-0 text-center">
        <div className="flex gap-0.5 justify-center">
          {result.character.split('').map((char, i) => (
            <span key={i} className="text-3xl sm:text-4xl font-bold text-text-primary">{char}</span>
          ))}
        </div>
        <div className="text-sm text-primary mt-1">{result.pinyin}</div>
        {result.hsk_level && (
          <span className="inline-block px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-semibold mt-1">
            HSK {result.hsk_level}
          </span>
        )}
      </div>
      <div className="flex-1 text-text-secondary text-base sm:text-lg">{result.english_definition || 'No definition available'}</div>
    </div>
  )
}

SearchResultCard.propTypes = {
  result: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    character: PropTypes.string.isRequired,
    pinyin: PropTypes.string.isRequired,
    english_definition: PropTypes.string,
    hsk_level: PropTypes.number,
  }).isRequired,
}

export default SearchResultCard
