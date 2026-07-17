const API_URL = 'http://localhost:3002/api'

async function getToken() {
  const data = await chrome.storage.local.get('token')
  return data.token
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-flashcard",
    title: "Add '%s' to Zihai Flashcards",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "open-side-panel",
    title: "Open Zihai Side Panel",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "open-side-panel") {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (err) {
      console.error("Failed to open side panel:", err);
    }
  } else if (info.menuItemId === "add-flashcard") {
    const text = info.selectionText.trim();
    if (!text || text.length > 50) return;
    
    try {
      const token = await getToken();
      if (!token) {
        chrome.tabs.sendMessage(tab.id, { action: "showError", message: "Please log in via the Zihai extension popup." });
        return;
      }
      
      const analyzeRes = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });
      const data = await analyzeRes.json();
      
      if (!analyzeRes.ok || !data.tokens || data.tokens.length === 0) {
        chrome.tabs.sendMessage(tab.id, { action: "showError", message: "Could not analyze the text." });
        return;
      }
      
      const chineseToken = data.tokens.find(t => t.isChinese && t.id);
      if (!chineseToken) {
        chrome.tabs.sendMessage(tab.id, { action: "showError", message: "No valid Chinese character found." });
        return;
      }
      
      const addRes = await fetch(`${API_URL}/flashcards/${chineseToken.id}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (addRes.ok) {
        chrome.tabs.sendMessage(tab.id, { action: "showSuccess", message: `Added "${chineseToken.text}" to Flashcards!` });
      } else {
        const errData = await addRes.json();
        chrome.tabs.sendMessage(tab.id, { action: "showError", message: errData.error || "Failed to add to Flashcards." });
      }
    } catch (err) {
      console.error(err);
      chrome.tabs.sendMessage(tab.id, { action: "showError", message: "Network error occurred." });
    }
  }
});

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

  if (request.action === 'getLists') {
    (async () => {
      try {
        const cache = await chrome.storage.session.get('lists_cache');
        if (cache && cache.lists_cache) {
          sendResponse({ success: true, lists: cache.lists_cache });
          return;
        }

        const token = await getToken()
        if (!token) throw new Error("Please log in via the extension popup.")
        const res = await fetch(`${API_URL}/lists`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!res.ok) throw new Error('Failed to fetch lists')
        const data = await res.json()

        await chrome.storage.session.set({ lists_cache: data });

        sendResponse({ success: true, lists: data })
      } catch (err) {
        sendResponse({ success: false, error: err.message })
      }
    })();
    return true; // Keep channel open
  }

  if (request.action === 'addToList') {
    (async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error("Please log in via the extension popup.")
        const res = await fetch(`${API_URL}/lists/${request.listId}/words`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ wordId: request.wordId })
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to add word to list')
        }
        sendResponse({ success: true })
      } catch (err) {
        sendResponse({ success: false, error: err.message })
      }
    })();
    return true; // Keep channel open
  }
})
