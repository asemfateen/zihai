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
  const filteredParts = cleanedParts.filter(part => {
    if (!part) return false
    const lower = part.toLowerCase()
    if (lower.startsWith('see also') || lower.startsWith('cl:')) return false
    return true
  })

  // Fall back to original parts or original string if everything got filtered
  if (filteredParts.length === 0) {
    const anyCleaned = cleanedParts.filter(p => p.length > 0)
    if (anyCleaned.length > 0) {
      return anyCleaned.join('; ')
    }
    return def
  }

  return filteredParts.join('; ')
}
