import { Component } from 'react'
import { Link } from 'react-router-dom'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error)
    console.error('Component stack:', info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background relative z-10 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-text-primary mb-4">Something went wrong</h1>
            <p className="text-text-secondary text-lg mb-8">An unexpected error occurred. Please try refreshing the page.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                Try again
              </button>
              <Link
                to="/"
                className="inline-block px-6 py-3 bg-surface border border-border/50 text-text-primary rounded-lg hover:border-primary transition-colors font-medium"
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
