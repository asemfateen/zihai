import { describe, it, expect } from 'vitest'
import { cleanDefinition } from './text'

describe('cleanDefinition', () => {
  it('returns empty string for falsy inputs', () => {
    expect(cleanDefinition('')).toBe('')
    expect(cleanDefinition(null)).toBe('')
    expect(cleanDefinition(undefined)).toBe('')
  })

  it('strips bracketed text', () => {
    expect(cleanDefinition('apple [ping2 guo3]')).toBe('apple')
  })

  it('strips parenthetical text', () => {
    expect(cleanDefinition('to eat (informal)')).toBe('to eat')
  })

  it('condenses multiple spaces and trims', () => {
    expect(cleanDefinition('  too   many    spaces  ')).toBe('too many spaces')
  })
})
