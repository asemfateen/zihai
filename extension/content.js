let tooltipHost = null;
let shadowRoot = null;
let tooltip = null;

// Listen for messages from background script (e.g. context menu feedback)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showSuccess') {
    showToast(request.message, 'success');
  } else if (request.action === 'showError') {
    showToast(request.message, 'error');
  }
});

function showToast(message, type) {
  ensureShadowDOM();
  
  const toast = document.createElement('div');
  toast.className = `zihai-toast ${type}`;
  toast.textContent = message;
  
  // Custom toast styling inside shadow DOM if not already in content.css
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.color = '#fff';
  toast.style.fontWeight = 'bold';
  toast.style.fontSize = '14px';
  toast.style.zIndex = '10000';
  toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3)';
  toast.style.transition = 'opacity 0.3s, transform 0.3s';
  toast.style.transform = 'translateY(-20px)';
  toast.style.opacity = '0';
  
  if (type === 'success') {
    toast.style.background = '#10b981';
  } else {
    toast.style.background = '#ef4444';
  }
  
  shadowRoot.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function ensureShadowDOM() {
  if (!tooltipHost) {
    tooltipHost = document.createElement('div');
    tooltipHost.id = 'zihai-tooltip-host';
    document.body.appendChild(tooltipHost);
    
    shadowRoot = tooltipHost.attachShadow({ mode: 'open' });
    
    // Inject the content.css stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content.css');
    shadowRoot.appendChild(link);
    
    tooltip = document.createElement('div');
    tooltip.className = 'zihai-tooltip';
    shadowRoot.appendChild(tooltip);
  }
}

document.addEventListener('mouseup', async (e) => {
  // Ignore clicks inside our tooltip
  if (tooltipHost && tooltipHost.contains(e.target)) return;
  if (tooltip && tooltip.contains(e.target)) return;
  
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  // If no text selected or too long, hide tooltip
  if (!text || text.length > 50) {
    hideTooltip();
    return;
  }
  
  // Only trigger if text contains Chinese characters
  if (!/[\u4e00-\u9fa5]/.test(text)) {
    hideTooltip();
    return;
  }
  
  // Create and show loading tooltip
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  showTooltip(rect, null, true);
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'analyze', text });
    if (response.success && response.tokens && response.tokens.length > 0) {
      const chineseTokens = response.tokens.filter(t => t.isChinese);
      if (chineseTokens.length > 0) {
        showTooltip(rect, chineseTokens, false);
      } else {
        hideTooltip();
      }
    } else {
      hideTooltip();
    }
  } catch (err) {
    console.error('Zihai Extension Error:', err);
    hideTooltip();
  }
});

document.addEventListener('mousedown', (e) => {
  if (tooltipHost && e.target !== tooltipHost && !tooltipHost.contains(e.target)) {
    // If click is outside the shadow root host, hide it
    if (e.composedPath && !e.composedPath().includes(tooltipHost)) {
      hideTooltip();
    }
  }
});

function hideTooltip() {
  if (tooltipHost) {
    tooltipHost.remove();
    tooltipHost = null;
    shadowRoot = null;
    tooltip = null;
  }
}

async function showTooltip(rect, tokens, loading) {
  ensureShadowDOM();
  
  if (loading) {
    // Removed nested padding to fix double loading padding
    tooltip.innerHTML = '<div style="text-align:center;">Loading...</div>';
  } else {
    tooltip.innerHTML = '';
    
    // Fetch custom lists ONCE instead of spamming in loop
    let availableLists = [];
    try {
      const listResponse = await chrome.runtime.sendMessage({ action: 'getLists' });
      if (listResponse && listResponse.success && listResponse.lists) {
        availableLists = listResponse.lists;
      }
    } catch (err) {
      console.warn('Could not fetch flashcard lists:', err);
    }

    tokens.forEach(token => {
      const tokenDiv = document.createElement('div');
      tokenDiv.className = 'zihai-token';
      
      let html = `<div class="zihai-pinyin">${token.pinyin || ''}</div>`;
      html += `<div class="zihai-chars">${token.text}</div>`;
      if (token.definition) {
        html += `<div class="zihai-def">${token.definition}</div>`;
      }
      if (token.hsk_level > 0) {
        html += `<div class="zihai-hsk">HSK ${token.hsk_level}</div>`;
      }
      
      tokenDiv.innerHTML = html;
      
      if (token.id) {
        const actionContainer = document.createElement('div');
        actionContainer.style.display = 'flex';
        actionContainer.style.flexDirection = 'column';
        actionContainer.style.gap = '6px';
        actionContainer.style.marginTop = '8px';

        const btn = document.createElement('button');
        btn.className = 'zihai-add-btn';
        btn.textContent = '+ Add to Flashcards';

        const select = document.createElement('select');
        select.className = 'zihai-select-list';
        select.style.width = '100%';
        select.style.padding = '4px 8px';
        select.style.background = 'rgba(0,0,0,0.5)';
        select.style.color = '#fff';
        select.style.border = '1px solid rgba(255,255,255,0.2)';
        select.style.borderRadius = '6px';
        select.style.fontSize = '11px';
        select.style.outline = 'none';

        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = 'Main Flashcard Deck';
        select.appendChild(defaultOption);

        if (availableLists.length > 0) {
          availableLists.forEach(lst => {
            const opt = document.createElement('option');
            opt.value = lst.id;
            opt.textContent = lst.name;
            select.appendChild(opt);
          });
          actionContainer.appendChild(select);
        }

        btn.onclick = async () => {
          btn.disabled = true;
          select.disabled = true;
          btn.textContent = 'Adding...';
          
          const target = select.value;
          let res;
          if (target === 'default') {
            res = await chrome.runtime.sendMessage({ action: 'addFlashcard', wordId: token.id });
          } else {
            res = await chrome.runtime.sendMessage({ action: 'addToList', listId: target, wordId: token.id });
          }

          if (res.success) {
            btn.textContent = '✓ Added';
            btn.style.background = 'rgba(255,255,255,0.1)';
            select.remove();
          } else {
            btn.textContent = 'Error (Login via popup?)';
            btn.style.background = '#ef4444';
            btn.disabled = false;
            select.disabled = false;
          }
        };

        actionContainer.appendChild(btn);
        tokenDiv.appendChild(actionContainer);
      }
      
      tooltip.appendChild(tokenDiv);
    });
  }
  
  // Position tooltip
  const top = rect.bottom + window.scrollY + 10;
  let left = rect.left + window.scrollX;
  
  // Fix boundary clipping near right edge
  // Using tooltip offsetWidth (defaulting to 280px if not fully rendered yet)
  const tooltipWidth = tooltip.offsetWidth || 280;
  left = Math.min(left, window.innerWidth - tooltipWidth - 20);
  left = Math.max(10, left); // Don't overflow left edge either
  
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}
