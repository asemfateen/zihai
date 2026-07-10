import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Middleware to ensure user is admin
async function requireAdmin(req, res, next) {
  try {
    const user = await db.get('SELECT is_admin FROM users WHERE id = $1', [req.user.id])
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' })
    }
    next()
  } catch (err) {
    console.error('Admin verification error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

router.use(requireAuth)
router.use(requireAdmin)

router.get('/dashboard', async (req, res) => {
  try {
    const usersRow = await db.get('SELECT COUNT(*)::integer as count FROM users')
    const searchesRow = await db.get('SELECT COUNT(*)::integer as count FROM search_history')
    const flashcardsRow = await db.get('SELECT COUNT(*)::integer as count FROM flashcard_progress')
    const favoritesRow = await db.get('SELECT COUNT(*)::integer as count FROM favorites')

    res.json({
      totalUsers: usersRow?.count || 0,
      totalSearches: searchesRow?.count || 0,
      totalFlashcards: flashcardsRow?.count || 0,
      totalFavorites: favoritesRow?.count || 0
    })
  } catch (err) {
    console.error('Admin dashboard error:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

// === User Management ===

router.get('/users', async (req, res) => {
  try {
    const users = await db.all(`
      SELECT u.id, u.email, u.display_name, u.created_at, u.is_admin,
             u.xp, u.streak_days as streak
      FROM users u
      ORDER BY u.created_at DESC
    `)
    res.json(users)
  } catch (err) {
    console.error('Failed to get users:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.put('/users/:id', async (req, res) => {
  const id = req.params.id
  const { display_name, email, is_admin, xp, streak } = req.body

  try {
    const updateQuery = []
    const params = []
    let idx = 1

    if (display_name !== undefined) {
      updateQuery.push(`display_name = $${idx++}`)
      params.push(display_name)
    }
    if (email !== undefined) {
      updateQuery.push(`email = $${idx++}`)
      params.push(email)
    }
    if (is_admin !== undefined) {
      updateQuery.push(`is_admin = $${idx++}`)
      params.push(is_admin ? 1 : 0)
    }

    if (updateQuery.length > 0) {
      params.push(id)
      await db.run(`UPDATE users SET ${updateQuery.join(', ')} WHERE id = $${idx}`, params)
    }

    // Update users progress stats directly on users table
    if (xp !== undefined || streak !== undefined) {
      const current = await db.get('SELECT xp, streak_days FROM users WHERE id = $1', [id]) || { xp: 0, streak_days: 0 }
      const newXp = xp !== undefined ? xp : current.xp
      const newStreak = streak !== undefined ? streak : current.streak_days
      await db.run('UPDATE users SET xp = $1, streak_days = $2 WHERE id = $3', [newXp, newStreak, id])
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Update user error:', err)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

router.delete('/users/:id', async (req, res) => {
  const id = req.params.id
  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' })
  }
  
  try {
    // Delete user (cascade deletes foreign keys automatically in Postgres)
    await db.run('DELETE FROM users WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// === Content Management ===

// --- Stories ---
router.get('/stories', async (req, res) => {
  try {
    const stories = await db.all('SELECT * FROM reading_stories ORDER BY id DESC')
    res.json(stories)
  } catch (err) {
    console.error('Failed to get stories:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.post('/stories', async (req, res) => {
  const { title, content, hsk_level } = req.body
  try {
    const info = await db.run(
      'INSERT INTO reading_stories (title, content, hsk_level) VALUES ($1, $2, $3) RETURNING id',
      [title, content, hsk_level || 1]
    )
    res.json({ success: true, id: info.lastInsertRowid })
  } catch (err) {
    console.error('Failed to create story:', err)
    res.status(500).json({ error: 'Failed to create story' })
  }
})

router.put('/stories/:id', async (req, res) => {
  const { title, content, hsk_level } = req.body
  try {
    await db.run(
      'UPDATE reading_stories SET title = $1, content = $2, hsk_level = $3 WHERE id = $4',
      [title, content, hsk_level, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to update story:', err)
    res.status(500).json({ error: 'Failed to update story' })
  }
})

router.delete('/stories/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM reading_stories WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete story:', err)
    res.status(500).json({ error: 'Failed to delete story' })
  }
})

// --- Characters ---
router.get('/characters', async (req, res) => {
  try {
    const chars = await db.all('SELECT * FROM characters ORDER BY id DESC LIMIT 100')
    res.json(chars)
  } catch (err) {
    console.error('Failed to get characters:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.put('/characters/:id', async (req, res) => {
  const { char, pinyin, meaning, hsk_level } = req.body
  try {
    await db.run(
      'UPDATE characters SET simplified = $1, pinyin = $2, definition = $3, hsk_level = $4 WHERE id = $5',
      [char, pinyin, meaning, hsk_level, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to update character:', err)
    res.status(500).json({ error: 'Failed to update character' })
  }
})

// === System & Analytics ===

router.get('/settings', async (req, res) => {
  try {
    const settings = await db.all('SELECT * FROM app_settings')
    const settingsMap = settings.reduce((acc, row) => {
      acc[row.key] = row.value
      return acc
    }, {})
    res.json(settingsMap)
  } catch (err) {
    console.error('Failed to get settings:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

router.put('/settings', async (req, res) => {
  const { announcement } = req.body
  try {
    if (announcement !== undefined) {
      await db.run(
        'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['announcement', announcement]
      )
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to update settings:', err)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

export default router
