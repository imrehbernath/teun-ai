'use client'

export default function ScoreChart({ data }) {
  if (!data || data.length < 2) return null

  // Sort by date and take last 10 points
  const sortedData = [...data]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-10)

  const scores = sortedData.map(d => d.score)
  const minScore = Math.min(...scores, 0)
  const maxScore = Math.max(...scores, 100)
  const range = maxScore - minScore || 1

  const lastScore = scores[scores.length - 1]

  // Determine color based on score
  const getColor = (score) => {
    if (score >= 70) return '#22c55e' // green
    if (score >= 40) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  const color = getColor(lastScore)

  // SVG viewBox dimensions
  const width = 100
  const height = 50

  // Calculate points in viewBox coordinates
  const points = sortedData.map((d, i) => ({
    x: (i / (sortedData.length - 1)) * width,
    y: height - ((d.score - minScore) / range) * height
  }))

  const lastPoint = points[points.length - 1]

  // Create path string
  const pathD = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  // Area path for gradient fill
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`

  // Calculate percentage position for CSS dot
  const dotLeftPercent = (lastPoint.x / width) * 100
  const dotTopPercent = (lastPoint.y / height) * 100

  return (
    <div className="relative w-full h-full">
      {/* SVG for line and area - stretches to fill */}
      <svg 
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Gradient fill under line */}
        <defs>
          <linearGradient id={`gradient-${lastScore}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={areaD}
          fill={`url(#gradient-${lastScore})`}
        />

        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Dot positioned with CSS - stays perfectly round */}
      <div 
        className="absolute w-3 h-3 rounded-full border-2 bg-white shadow-sm"
        style={{
          left: `${dotLeftPercent}%`,
          top: `${dotTopPercent}%`,
          transform: 'translate(-50%, -50%)',
          borderColor: color,
        }}
      >
        {/* Inner dot */}
        <div 
          className="absolute inset-1 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  )
}
