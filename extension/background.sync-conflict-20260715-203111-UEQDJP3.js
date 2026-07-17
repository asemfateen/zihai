const API_URL = 'http://localhost:3002/api'

async function getToken() {
  const data = await chrome.storage.local.get('token')
  return data.token
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    (async () => {
      try {
        const token = await getToken()
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`${API_URL}/analyze`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ text: request.text })
        })
        const data = await res.json()
        sendResponse({ success: true, tokens: data.tokens || [] })
      } catch (err) {
        sendResponse({ success: false, error: err.message })
      }
    })();
    return true; // Keep channel open
  }

  if (request.action === 'addFlashcard') {
    (async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error("Please log in via the Zihai extension popup.")
        
        const res = await fetch(`${API_URL}/flashcards/${request.wordId}/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to add')
        }
        sendResponse({ success: true })
      } catch (err) {
        sendResponse({ success: false, error: err.message })
      }
    })();
    return true; // Keep channel open
  }
})
