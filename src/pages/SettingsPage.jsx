import { useState } from 'react'
import API_BASE, { fetchWithTimeout } from '../api'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'

export default function SettingsPage() {
  const { user } = useAuth()
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  
  if (!user) return null

  const handleImport = async () => {
    if (!importText.trim()) return
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/flashcards/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok) {
        setImportResult({ type: 'success', msg: data.message })
        setImportText('')
      } else {
        setImportResult({ type: 'error', msg: data.error })
      }
    } catch (err) {
      setImportResult({ type: 'error', msg: 'Failed to import' })
    } finally {
      setImporting(false)
    }
  }

  const handleExport = () => {
    window.location.href = `${API_BASE}/api/flashcards/export`
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setImportText(event.target.result)
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10 text-text-primary pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8">Data Settings</h1>

        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 mb-8 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-emerald-500">📥</span> Import Flashcards
          </h2>
          <p className="text-text-secondary text-sm mb-4">
            Paste a list of words or upload a CSV/TXT file from Pleco or Anki. We will extract the Chinese characters and add them to your Flashcards.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-bold text-text-secondary mb-2 cursor-pointer border-2 border-dashed border-border/50 rounded-2xl p-4 text-center hover:bg-surface/50 transition-colors">
              <input type="file" accept=".txt,.csv" className="hidden" onChange={handleFileUpload} />
              Click here to upload a file (.txt, .csv)
            </label>
            <textarea
              className="w-full h-32 bg-surface border border-border/50 rounded-2xl p-4 focus:border-primary focus:outline-none resize-none font-mono text-sm mt-2"
              placeholder="Or paste text here..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleImport}
              disabled={importing || !importText.trim()}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {importing && <Spinner className="w-4 h-4 text-white animate-spin" />}
              Import Data
            </button>
            {importResult && (
              <span className={`text-sm font-bold ${importResult.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {importResult.msg}
              </span>
            )}
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-blue-500">📤</span> Export Flashcards
          </h2>
          <p className="text-text-secondary text-sm mb-6">
            Download your flashcards as a CSV file. This file can be easily imported into Anki or Excel.
          </p>
          <button
            onClick={handleExport}
            className="px-6 py-2.5 bg-surface border border-border/50 text-text-primary rounded-xl font-bold hover:bg-primary/5 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            Export to CSV
          </button>
        </div>

      </div>
    </div>
  )
}
