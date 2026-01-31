'use client'

export default function ScoreChart({ data }) {
  if (!data || data.length < 2) return null

  // Take last 6 data points max
  const chartData = data.slice(-6)
  const scores = chartData.map(d => d.score)
  const maxScore = Math.max(...scores, 100)
  const minScore = Math.min(...scores, 0)
  const range = maxScore - minScore || 1

  // Calculate SVG path
  const width = 200
  const height = 48
  const padding = 4
  
  const points = chartData.map((d, i) => {
    const x = padding + (i / (chartData.length - 1)) * (width - padding * 2)
    const y = height - padding - ((d.score - minScore) / range) * (height - padding * 2)
    return { x, y, score: d.score }
  })

  // Create smooth curve path
  const pathD = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`
    const prev = points[i - 1]
    const cpX = (prev.x + point.x) / 2
    return `${acc} Q ${cpX} ${prev.y} ${point.x} ${point.y}`
  }, '')

  // Gradient fill path
  const fillD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  // Get color based on trend
  const lastScore = points[points.length - 1].score
  const firstScore = points[0].score
  const isPositive = lastScore >= firstScore
  
  const strokeColor = isPositive ? '#10b981' : '#ef4444'
  const fillColor = isPositive ? 'url(#greenGradient)' : 'url(#redGradient)'

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Fill area */}
      <path 
        d={fillD} 
        fill={fillColor}
      />
      
      {/* Line */}
      <path 
        d={pathD} 
        fill="none" 
        stroke={strokeColor} 
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End point dot */}
      <circle 
        cx={points[points.length - 1].x} 
        cy={points[points.length - 1].y} 
        r="3" 
        fill={strokeColor}
      />
    </svg>
  )
}
