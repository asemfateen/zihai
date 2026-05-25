const API_BASE = import.meta.env.VITE_API_URL || ''
export default API_BASE

let _csrfToken = ''

function getCsrfToken() {
  if (_csrfToken) return _csrfToken
  const match = document.cookie.match(/(?:^|;\s*)xsrf-token=([^;]*)/)
  if (match) {
    _csrfToken = decodeURIComponent(match[1])
    return _csrfToken
  }
  return ''
}

function extractCsrfFromResponse(res) {
  const token = res.headers.get('x-csrf-token')
  if (token) _csrfToken = token
}

const DEFAULT_TIMEOUT = 15000
const MAX_RETRIES = 2

export async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const headers = { ...options.headers }
  const method = (options.method || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = getCsrfToken()
    if (csrf) {
      headers['x-csrf-token'] = csrf
    }
  }
  const opts = { ...options, headers }
  const externalSignal = opts.signal

  let lastError
  let controller

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    let onAbort = null
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort()
      } else {
        onAbort = () => controller.abort()
        externalSignal.addEventListener('abort', onAbort, { once: true })
      }
    }

    try {
      const res = await fetch(url, { ...opts, signal: controller.signal })
      clearTimeout(timeoutId)
      if (onAbort) externalSignal.removeEventListener('abort', onAbort)
      extractCsrfFromResponse(res)

      if (res.status >= 400 && res.status < 500) {
        return res
      }

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }

      return res
    } catch (err) {
      clearTimeout(timeoutId)
      if (onAbort) externalSignal.removeEventListener('abort', onAbort)
      lastError = err
      if (err.name === 'AbortError') {
        if (externalSignal?.aborted) throw err
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
        throw err
      }
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      throw err
    }
  }
  throw lastError
}
