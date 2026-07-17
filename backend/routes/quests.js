import express from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Initialize user_quests table in Postgres on startup
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_quests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        quest_type VARCHAR(50) NOT NULL,
        progress INTEGER DEFAULT 0,
        target INTEGER NOT NULL,
        gems_reward INTEGER NOT NULL,
        claimed INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Failed to initialize user_quests table:', err);
  }
})();

// Helper to increment quest progress
export async function incrementQuestProgress(userId, type, value) {
  try {
    // Ensure quests for today are initialized first
    await initializeQuestsForToday(userId);
    
    await db.query(`
      UPDATE user_quests 
      SET progress = LEAST(target, progress + $1), updated_at = NOW() 
      WHERE user_id = $2 AND quest_type = $3 AND claimed = 0
    `, [value, userId, type]);
  } catch (err) {
    console.error('Failed to increment quest progress:', err);
  }
}

async function initializeQuestsForToday(userId) {
  const todayRow = await db.get(`
    SELECT COUNT(*)::integer as count FROM user_quests 
    WHERE user_id = $1 AND updated_at::date = CURRENT_DATE
  `, [userId]);

  const count = todayRow?.count || 0;
  if (count === 0) {
    // Delete any old quests to avoid clutter
    await db.query(`DELETE FROM user_quests WHERE user_id = $1`, [userId]);
    // Insert new daily quests
    await db.query(`
      INSERT INTO user_quests (user_id, quest_type, progress, target, gems_reward, claimed) 
      VALUES 
        ($1, 'flashcards', 0, 20, 20, 0),
        ($1, 'match', 0, 1, 10, 0),
        ($1, 'analyze', 0, 1, 10, 0)
    `, [userId]);
  }
}

router.get('/quests', requireAuth, async (req, res) => {
  try {
    await initializeQuestsForToday(req.user.id);
    const quests = await db.all(`
      SELECT id, quest_type, progress, target, gems_reward, claimed 
      FROM user_quests 
      WHERE user_id = $1 
      ORDER BY id ASC
    `, [req.user.id]);
    res.json(quests);
  } catch (err) {
    console.error('Error fetching quests:', err);
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

router.post('/quests/claim', requireAuth, async (req, res) => {
  const { questId } = req.body;
  if (!questId) return res.status(400).json({ error: 'questId required' });

  try {
    const quest = await db.get(`
      SELECT * FROM user_quests WHERE id = $1 AND user_id = $2
    `, [questId, req.user.id]);

    if (!quest) return res.status(404).json({ error: 'Quest not found' });
    if (quest.claimed === 1) return res.status(400).json({ error: 'Quest already claimed' });
    if (quest.progress < quest.target) return res.status(400).json({ error: 'Quest not completed yet' });

    db.transaction(() => {
      // 1. Award gems
      db.run('UPDATE users SET gems = COALESCE(gems, 0) + ? WHERE id = ?', [quest.gems_reward, req.user.id]);

      // 2. Mark quest as claimed
      db.run('UPDATE user_quests SET claimed = ? WHERE id = ?', [1, questId]);
    });

    const user = await db.get('SELECT gems FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, gems: user.gems });
  } catch (err) {
    console.error('Error claiming quest:', err);
    res.status(500).json({ error: 'Failed to claim quest' });
  }
});

router.post('/quests/progress', requireAuth, async (req, res) => {
  const { type, value } = req.body;
  if (!type || value === undefined) return res.status(400).json({ error: 'type and value required' });

  try {
    await incrementQuestProgress(req.user.id, type, parseInt(value, 10) || 1);
    const quest = await db.get(`
      SELECT * FROM user_quests WHERE user_id = $1 AND quest_type = $2
    `, [req.user.id, type]);
    res.json({ success: true, quest });
  } catch (err) {
    console.error('Error updating progress:', err);
    res.status(500).json({ error: 'Failed to update quest progress' });
  }
});

export default router;
