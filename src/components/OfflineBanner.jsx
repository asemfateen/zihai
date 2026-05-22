import { useState, useEffect } from 'react'

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-card border-t border-border px-4 py-3 text-center text-sm text-text-secondary">
      <span className="text-text-primary font-medium">You are offline</span>
      <span className="ml-2">Previously viewed words are still available.</span>
    </div>
  )
}

export default OfflineBanner
