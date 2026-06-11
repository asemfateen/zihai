function Spinner({ size = 40, className = '' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
      }}
      className={`rounded-full border-3 border-border/50 border-t-primary animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export default Spinner
