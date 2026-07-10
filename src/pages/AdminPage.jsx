import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API_BASE, { fetchWithTimeout } from '../api'
import { SearchIcon, FlashcardIcon, HeartIcon } from '../components/Icons'
import { Crown, Users } from 'lucide-react'

function UsersManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingUser, setEditingUser] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/admin/users`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch users')
      setUsers(await res.json())
    } catch (err) {
      console.error(err)
      setError('Could not load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user completely?')) return
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to delete')
      setUsers(users.filter(u => u.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingUser)
      })
      if (!res.ok) throw new Error('Failed to update')
      setEditingUser(null)
      fetchUsers()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="text-center p-8"><span className="skeleton inline-block w-full h-64 rounded-3xl" /></div>

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-500/10 text-red-400 rounded-xl">{error}</div>}
      
      {editingUser ? (
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-xl animate-fade-in">
          <h2 className="text-xl font-bold mb-4 text-text-primary">Edit User: {editingUser.email}</h2>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Display Name</label>
              <input type="text" value={editingUser.display_name || ''} onChange={e => setEditingUser({...editingUser, display_name: e.target.value})} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">XP</label>
                <input type="number" value={editingUser.xp} onChange={e => setEditingUser({...editingUser, xp: parseInt(e.target.value) || 0})} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Streak</label>
                <input type="number" value={editingUser.streak} onChange={e => setEditingUser({...editingUser, streak: parseInt(e.target.value) || 0})} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isAdmin" checked={editingUser.is_admin === 1} onChange={e => setEditingUser({...editingUser, is_admin: e.target.checked ? 1 : 0})} />
              <label htmlFor="isAdmin" className="text-sm text-text-primary font-bold">Admin Privileges</label>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover">Save</button>
              <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2 bg-surface text-text-secondary rounded-xl font-bold hover:bg-border">Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50 text-text-secondary text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">ID</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">XP</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-surface/30 transition-colors">
                    <td className="p-4 text-text-secondary text-sm">#{u.id}</td>
                    <td className="p-4 text-text-primary font-medium">{u.email}</td>
                    <td className="p-4 text-blue-400 font-bold">{u.xp}</td>
                    <td className="p-4">
                      {u.is_admin === 1 ? <span className="px-2 py-1 bg-amber-500/20 text-amber-500 rounded text-xs font-bold">ADMIN</span> : <span className="px-2 py-1 bg-surface text-text-secondary rounded text-xs font-bold">USER</span>}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => setEditingUser(u)} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(u.id)} className="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-colors">Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ContentManager() {
  const [activeSubTab, setActiveSubTab] = useState('stories')
  const [stories, setStories] = useState([])
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingStory, setEditingStory] = useState(null)
  const [editingChar, setEditingChar] = useState(null)

  const fetchContent = useCallback(async () => {
    setLoading(true)
    try {
      if (activeSubTab === 'stories') {
        const res = await fetchWithTimeout(`${API_BASE}/api/admin/stories`, { credentials: 'include' })
        setStories(await res.json())
      } else {
        const res = await fetchWithTimeout(`${API_BASE}/api/admin/characters`, { credentials: 'include' })
        setCharacters(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [activeSubTab])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  const handleSaveStory = async (e) => {
    e.preventDefault()
    const method = editingStory.id ? 'PUT' : 'POST'
    const url = editingStory.id ? `${API_BASE}/api/admin/stories/${editingStory.id}` : `${API_BASE}/api/admin/stories`
    try {
      await fetchWithTimeout(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingStory)
      })
      setEditingStory(null)
      fetchContent()
    } catch (err) {
      alert('Failed to save story')
    }
  }

  const handleDeleteStory = async (id) => {
    if(!confirm('Delete this story?')) return
    try {
      await fetchWithTimeout(`${API_BASE}/api/admin/stories/${id}`, { method: 'DELETE', credentials: 'include' })
      setStories(stories.filter(s => s.id !== id))
    } catch (err) {
      alert('Failed to delete')
    }
  }

  const handleSaveChar = async (e) => {
    e.preventDefault()
    try {
      await fetchWithTimeout(`${API_BASE}/api/admin/characters/${editingChar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingChar)
      })
      setEditingChar(null)
      fetchContent()
    } catch (err) {
      alert('Failed to save character')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-border/50 pb-4">
        <button onClick={() => setActiveSubTab('stories')} className={`font-bold ${activeSubTab === 'stories' ? 'text-primary' : 'text-text-secondary'}`}>Reading Stories</button>
        <button onClick={() => setActiveSubTab('characters')} className={`font-bold ${activeSubTab === 'characters' ? 'text-primary' : 'text-text-secondary'}`}>Dictionary (Characters)</button>
      </div>

      {activeSubTab === 'stories' && (
        <div className="space-y-4">
          {!editingStory ? (
            <>
              <button onClick={() => setEditingStory({ title: '', content: '', translation: '', hsk_level: 1 })} className="px-4 py-2 bg-primary text-white rounded-xl font-bold">Add New Story</button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stories.map(s => (
                  <div key={s.id} className="bg-card border border-border/50 rounded-xl p-4">
                    <h3 className="font-bold text-lg">{s.title} <span className="text-sm bg-primary/20 text-primary px-2 rounded ml-2">HSK {s.hsk_level}</span></h3>
                    <p className="text-text-secondary text-sm line-clamp-2 mt-2">{s.content}</p>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setEditingStory(s)} className="text-blue-400 text-sm font-bold">Edit</button>
                      <button onClick={() => handleDeleteStory(s.id)} className="text-red-400 text-sm font-bold">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveStory} className="bg-card p-6 rounded-2xl border border-border/50 space-y-4">
              <h2 className="text-xl font-bold">{editingStory.id ? 'Edit Story' : 'New Story'}</h2>
              <input type="text" placeholder="Title" value={editingStory.title} onChange={e => setEditingStory({...editingStory, title: e.target.value})} className="w-full bg-surface border border-border p-3 rounded-lg" required />
              <input type="number" placeholder="HSK Level" value={editingStory.hsk_level} onChange={e => setEditingStory({...editingStory, hsk_level: parseInt(e.target.value)})} className="w-full bg-surface border border-border p-3 rounded-lg" required />
              <textarea placeholder="Chinese Content" value={editingStory.content} onChange={e => setEditingStory({...editingStory, content: e.target.value})} className="w-full bg-surface border border-border p-3 rounded-lg h-32" required />
              <textarea placeholder="English Translation" value={editingStory.translation} onChange={e => setEditingStory({...editingStory, translation: e.target.value})} className="w-full bg-surface border border-border p-3 rounded-lg h-32" required />
              <div className="flex gap-4">
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Save</button>
                <button type="button" onClick={() => setEditingStory(null)} className="px-6 py-2 bg-surface text-text-secondary rounded-xl font-bold">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeSubTab === 'characters' && (
        <div className="space-y-4">
          {!editingChar ? (
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-surface/50"><tr><th className="p-3">Char</th><th className="p-3">Pinyin</th><th className="p-3">Meaning</th><th className="p-3">Actions</th></tr></thead>
                <tbody className="divide-y divide-border/50">
                  {characters.map(c => (
                    <tr key={c.id}>
                      <td className="p-3 font-bold text-xl">{c.char}</td>
                      <td className="p-3">{c.pinyin}</td>
                      <td className="p-3 text-text-secondary line-clamp-1">{c.meaning}</td>
                      <td className="p-3"><button onClick={() => setEditingChar(c)} className="text-primary font-bold">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <form onSubmit={handleSaveChar} className="bg-card p-6 rounded-2xl border border-border/50 space-y-4">
              <h2 className="text-xl font-bold">Edit Character: {editingChar.char}</h2>
              <input type="text" placeholder="Pinyin" value={editingChar.pinyin} onChange={e => setEditingChar({...editingChar, pinyin: e.target.value})} className="w-full bg-surface border border-border p-3 rounded-lg" required />
              <textarea placeholder="Meaning" value={editingChar.meaning} onChange={e => setEditingChar({...editingChar, meaning: e.target.value})} className="w-full bg-surface border border-border p-3 rounded-lg h-32" required />
              <input type="number" placeholder="HSK Level" value={editingChar.hsk_level} onChange={e => setEditingChar({...editingChar, hsk_level: parseInt(e.target.value)})} className="w-full bg-surface border border-border p-3 rounded-lg" required />
              <div className="flex gap-4">
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Save</button>
                <button type="button" onClick={() => setEditingChar(null)} className="px-6 py-2 bg-surface text-text-secondary rounded-xl font-bold">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function SystemManager() {
  const [settings, setSettings] = useState({})
  const [announcement, setAnnouncement] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/admin/settings`, { credentials: 'include' })
      const data = await res.json()
      setSettings(data)
      setAnnouncement(data.announcement || '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await fetchWithTimeout(`${API_BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ announcement })
      })
      alert('Announcement broadcasted successfully!')
    } catch (err) {
      alert('Failed to save settings')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-black text-text-primary mb-2">Broadcast System Announcement</h2>
        <p className="text-sm text-text-secondary mb-6">This message will appear at the top of the screen for all active users.</p>
        
        <form onSubmit={handleSave} className="space-y-4">
          <textarea 
            value={announcement} 
            onChange={e => setAnnouncement(e.target.value)} 
            placeholder="Type your global announcement here... (Leave empty to remove announcement)"
            className="w-full bg-surface border border-border p-4 rounded-xl h-32 text-text-primary"
          />
          <button type="submit" className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
            Broadcast to All Users
          </button>
        </form>
      </div>
    </div>
  )
}

function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/admin/dashboard`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch admin stats')
      setStats(await res.json())
    } catch (err) {
      console.error(err)
      setError('Could not load dashboard statistics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats()
    }
  }, [fetchStats, activeTab])

  return (
    <div className="min-h-screen bg-transparent relative z-10 pb-20">
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-text-primary">Admin Headquarters</h1>
              <p className="text-text-secondary">Welcome back, Commander {user?.display_name || user?.email}</p>
            </div>
          </div>
          
          <div className="flex bg-surface/50 p-1 rounded-2xl border border-border/50">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('users')} 
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Users
            </button>
            <button 
              onClick={() => setActiveTab('content')} 
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'content' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Content
            </button>
            <button 
              onClick={() => setActiveTab('system')} 
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'system' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              System
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <>
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Total Users */}
              <div className="col-span-2 md:col-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group animate-fade-in relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-text-secondary">Total Users</h2>
                </div>
                <p className="text-5xl font-black text-text-primary relative z-10">
                  {loading ? <span className="skeleton inline-block w-20 h-12 rounded-xl" /> : stats?.totalUsers ?? 0}
                </p>
              </div>

              {/* Total Flashcards */}
              <div className="col-span-2 md:col-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group animate-fade-in [animation-delay:100ms] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <FlashcardIcon className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-text-secondary">Flashcards Tracked</h2>
                </div>
                <p className="text-5xl font-black text-text-primary relative z-10">
                  {loading ? <span className="skeleton inline-block w-20 h-12 rounded-xl" /> : stats?.totalFlashcards ?? 0}
                </p>
              </div>

              {/* Total Searches */}
              <div className="col-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group animate-fade-in [animation-delay:200ms] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <SearchIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-text-secondary">Searches</h2>
                </div>
                <p className="text-4xl font-black text-text-primary relative z-10">
                  {loading ? <span className="skeleton inline-block w-16 h-10 rounded-xl" /> : stats?.totalSearches ?? 0}
                </p>
              </div>

              {/* Total Favorites */}
              <div className="col-span-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group animate-fade-in [animation-delay:300ms] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                    <HeartIcon filled className="w-5 h-5 text-red-500" />
                  </div>
                  <h2 className="text-base font-bold text-text-secondary">Favorites</h2>
                </div>
                <p className="text-4xl font-black text-text-primary relative z-10">
                  {loading ? <span className="skeleton inline-block w-16 h-10 rounded-xl" /> : stats?.totalFavorites ?? 0}
                </p>
              </div>

            </div>
          </>
        ) : activeTab === 'users' ? (
          <UsersManager />
        ) : activeTab === 'content' ? (
          <ContentManager />
        ) : activeTab === 'system' ? (
          <SystemManager />
        ) : null}
      </div>
    </div>
  )
}

export default AdminPage
