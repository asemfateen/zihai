import { Component } from 'react'
import { Link } from 'react-router-dom'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // Send to backend via fetch so we can see it in terminal
    import('../api').then(({ default: API_BASE }) => {
      fetch(`${API_BASE}/api/log-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.toString(), stack: errorInfo.componentStack })
      }).catch(() => {})
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="bg-surface/80 backdrop-blur-xl border border-border/50 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-text-primary mb-3">Something went wrong</h1>
            <p className="text-text-secondary mb-8">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <p className="text-red-500 text-xs text-left whitespace-pre-wrap overflow-auto max-h-32 mb-4 bg-black/10 p-2 rounded">
              {this.state.error?.toString()}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                Try again
              </button>
              <Link
                to="/"
                className="inline-block px-6 py-3 bg-surface/80 backdrop-blur-xl border border-border/50 text-text-primary rounded-lg hover:border-primary transition-colors font-medium"
              >
                Go back home
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
