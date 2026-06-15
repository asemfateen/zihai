import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useWordData } from './useWordData'
import * as api from '../api'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchWithTimeout: vi.fn(),
    default: 'http://localhost:3002' // Mock API_BASE
  }
})

describe('useWordData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading: true, word: null, and notFound: false', async () => {
    // We defer the promise resolution so the hook stays in loading state for the initial render check
    let resolvePromise
    api.fetchWithTimeout.mockImplementation(() => {
      return new Promise((resolve) => {
        resolvePromise = resolve
      })
    })

    const { result } = renderHook(() => useWordData('test_id'))

    expect(result.current.loading).toBe(true)
    expect(result.current.word).toBe(null)
    expect(result.current.notFound).toBe(false)
    expect(api.fetchWithTimeout).toHaveBeenCalledTimes(1)

    // Resolve to avoid hanging tests and wait for state updates
    resolvePromise({ ok: true, json: () => Promise.resolve({ id: 'test_id' }) })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('should fetch word data and update state successfully', async () => {
    const mockWord = { id: 'test_id', text: '你好', pinyin: 'nǐ hǎo' }

    api.fetchWithTimeout.mockResolvedValueOnce({
      ok: true,
      json: async () => mockWord
    })

    const { result } = renderHook(() => useWordData('test_id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.word).toEqual(mockWord)
    expect(result.current.notFound).toBe(false)
    expect(api.fetchWithTimeout).toHaveBeenCalledWith(
      'http://localhost:3002/api/word/test_id',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('should handle 404 / not found error', async () => {
    api.fetchWithTimeout.mockResolvedValueOnce({
      ok: false
    })

    const { result } = renderHook(() => useWordData('missing_id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.word).toBe(null)
    expect(result.current.notFound).toBe(true)
  })

  it('should handle generic fetch errors', async () => {
    api.fetchWithTimeout.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useWordData('error_id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.word).toBe(null)
    expect(result.current.notFound).toBe(true)
  })

  it('should cancel fetch when unmounted', async () => {
    // We want to simulate the hook unmounting before the fetch completes
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

    // Create a promise that doesn't resolve immediately
    let resolveFetch
    api.fetchWithTimeout.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve
      })
    })

    const { unmount } = renderHook(() => useWordData('test_id'))

    // Trigger unmount
    unmount()

    // Assert that abort was called on the controller
    expect(abortSpy).toHaveBeenCalled()

    // Even if it resolves later, state shouldn't update (though react testing lib might warn if we tried to update after unmount, but our hook has `cancelled` flag)
    resolveFetch({ ok: true, json: () => Promise.resolve({ id: 'test_id' }) })

    // Restore spy
    abortSpy.mockRestore()
  })
})
