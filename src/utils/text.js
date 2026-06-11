/**
 * Cleans CC-CEDICT definitions by stripping parenthetical notes, bracketed pronunciations/characters,
 * and filtering out reference noise (like "see also", "CL:...").
 *
 * @param {string} def The raw definition string
 * @returns {string} The cleaned definition string
 */
export function cleanDefinition(def) {
  if (!def) return ''

  // Split by semicolon to handle separate definition parts
  const parts = def.split(';')

  const cleanedParts = parts.map(part => {
    let temp = part
    // Remove bracketed text, e.g., [ling2]
    temp = temp.replace(/\[[^\]]*\]/g, '')
    // Remove parentheses, e.g., (informal...)
    temp = temp.replace(/\([^)]*\)/g, '')
    // Remove curly braces, e.g., {etc}
    temp = temp.replace(/\{[^}]*\}/g, '')

    // Condense multiple spaces and trim
    return temp.replace(/\s+/g, ' ').trim()
  })

  // Filter out empty parts or reference-only metadata
  const noisePatterns = [
    'see also',
    'cl:',
    'trad. form',
    'simplified form',
    'variant of',
    'erroneously for',
    'erroneous variant',
    'abbr. for'
  ]

  const filteredParts = cleanedParts.filter(part => {
    if (!part) return false
    const lower = part.toLowerCase()
    return !noisePatterns.some(pattern => lower.includes(pattern))
  })

  // Deduplicate parts
  const uniqueParts = []
  const baseParts = filteredParts.length > 0 ? filteredParts : cleanedParts.filter(p => p.length > 0)
  for (const part of baseParts) {
    if (!uniqueParts.includes(part)) {
      uniqueParts.push(part)
    }
  }

  if (uniqueParts.length === 0) {
    return def
  }

  return uniqueParts.join('; ')
}
