let tooltip = null;

document.addEventListener('mouseup', async (e) => {
  // Ignore clicks inside our tooltip
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
      // Filter only Chinese tokens
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
  if (tooltip && !tooltip.contains(e.target)) {
    hideTooltip();
  }
});

function hideTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}

function showTooltip(rect, tokens, loading) {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'zihai-tooltip';
    document.body.appendChild(tooltip);
  }
  
  if (loading) {
    tooltip.innerHTML = '<div style="text-align:center; padding:10px;">Loading...</div>';
  } else {
    tooltip.innerHTML = '';
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
        const btn = document.createElement('button');
        btn.className = 'zihai-add-btn';
        btn.textContent = '+ Add to Flashcards';
        btn.onclick = async () => {
          btn.disabled = true;
          btn.textContent = 'Adding...';
          const res = await chrome.runtime.sendMessage({ action: 'addFlashcard', wordId: token.id });
          if (res.success) {
            btn.textContent = '✓ Added';
            btn.style.background = 'rgba(255,255,255,0.1)';
          } else {
            btn.textContent = 'Error (Login via popup?)';
            btn.style.background = '#ef4444';
          }
        };
        tokenDiv.appendChild(btn);
      }
      
      tooltip.appendChild(tokenDiv);
    });
  }
  
  // Position tooltip
  const top = rect.bottom + window.scrollY + 10;
  let left = rect.left + window.scrollX;
  
  // Keep on screen
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}
