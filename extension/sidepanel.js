const API_URL = 'http://localhost:3002/api';
let cards = [];
let currentIndex = 0;
let token = null;

const statusDiv = document.getElementById('status');
const deckView = document.getElementById('deck-view');
const characterDiv = document.getElementById('character');
const pinyinDiv = document.getElementById('pinyin');
const definitionDiv = document.getElementById('definition');
const hskBadge = document.getElementById('hsk-badge');
const backView = document.getElementById('back-view');
const revealBtn = document.getElementById('reveal-btn');
const gradeButtons = document.getElementById('grade-buttons');
const progressFill = document.getElementById('progress-fill');

document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get('token');
  token = data.token;

  if (!token) {
    statusDiv.innerHTML = '<p class="error" style="color: #ef4444; line-height: 1.4;">Please connect your Zihai account via the extension popup to start studying flashcards.</p>';
    return;
  }

  await loadDueCards();
});

async function loadDueCards() {
  statusDiv.textContent = 'Loading due flashcards...';
  deckView.style.display = 'none';

  try {
    const res = await fetch(`${API_URL}/flashcards/due`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error('Failed to load flashcards. Please login again.');
    }

    cards = await res.json();
    if (cards.length === 0) {
      statusDiv.innerHTML = '<p class="success" style="color: #10b981; font-weight: bold; font-size: 1.25rem;">🎉 All caught up!</p><p style="color:#a3a3a3; font-size: 0.9rem; margin-top:8px;">No cards due for review right now. Check back later.</p>';
      progressFill.style.width = '100%';
    } else {
      statusDiv.style.display = 'none';
      deckView.style.display = 'flex';
      currentIndex = 0;
      showCard();
    }
  } catch (err) {
    statusDiv.textContent = err.message;
    statusDiv.className = 'error';
  }
}

function showCard() {
  if (currentIndex >= cards.length) {
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<p class="success" style="color: #10b981; font-weight: bold; font-size: 1.25rem;">🎉 Session complete!</p><p style="color:#a3a3a3; font-size: 0.9rem; margin-top:8px;">You have finished all reviews for this session.</p>';
    deckView.style.display = 'none';
    progressFill.style.width = '100%';
    return;
  }

  const card = cards[currentIndex];
  characterDiv.textContent = card.character || card.simplified;
  pinyinDiv.textContent = card.pinyin || '';
  
  // Format definition
  if (card.definitions && card.definitions.length > 0) {
    definitionDiv.textContent = card.definitions.join(', ');
  } else {
    definitionDiv.textContent = card.english_definition || card.definition || 'No definition available';
  }

  if (card.hsk_level > 0) {
    hskBadge.textContent = `HSK ${card.hsk_level}`;
    hskBadge.style.display = 'inline-block';
  } else {
    hskBadge.style.display = 'none';
  }

  // Reset view state
  backView.style.display = 'none';
  revealBtn.style.display = 'block';
  gradeButtons.style.display = 'none';

  // Update progress
  const progressPercent = (currentIndex / cards.length) * 100;
  progressFill.style.width = `${progressPercent}%`;
}

revealBtn.onclick = () => {
  backView.style.display = 'block';
  revealBtn.style.display = 'none';
  gradeButtons.style.display = 'flex';
};

// Bind grade buttons
document.querySelectorAll('.grade-btn').forEach(btn => {
  btn.onclick = async (e) => {
    const grade = parseInt(e.currentTarget.getAttribute('data-grade'));
    const card = cards[currentIndex];

    // Disable buttons
    document.querySelectorAll('.grade-btn').forEach(b => b.disabled = true);

    try {
      const res = await fetch(`${API_URL}/flashcards/${card.id}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quality: grade })
      });

      if (!res.ok) throw new Error('API Error');

      // Quality 1 = Again (Re-shuffled or re-queued at the end)
      if (grade === 1) {
        // Move current card to the end of the queue
        const currentCard = cards.splice(currentIndex, 1)[0];
        cards.push(currentCard);
        // Do not increment currentIndex since we just spliced one out
      } else {
        // Incremented to next card
        currentIndex++;
      }
    } catch (err) {
      console.error('Failed to submit result:', err);
      // fallback to just advancing
      currentIndex++;
    }

    // Enable buttons and show next
    document.querySelectorAll('.grade-btn').forEach(b => b.disabled = false);
    showCard();
  };
});
