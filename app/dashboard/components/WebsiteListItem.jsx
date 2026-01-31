'use client'

import { TrendingUp, TrendingDown, ChevronRight, Trash2 } from 'lucide-react'

export default function WebsiteListItem({ website, onClick, onDelete }) {
  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-500'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(website)
    }
  }

  return (
    <div 
      className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0 group-hover:bg-[#1E1E3F] group-hover:text-white transition-colors">
          {getInitials(website.name)}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate group-hover:text-[#1E1E3F] transition-colors">
            {website.name}
          </p>
          <p className="text-xs text-slate-500 truncate">
            {website.website || website.category || 'Website'}
          </p>
        </div>
      </div>

      {/* Center: Score */}
      <div className="flex items-center gap-4 px-4">
        <div className="text-right">
          <span className={`text-2xl font-bold ${getScoreColor(website.currentScore)}`}>
            {website.currentScore}
          </span>
          <span className="text-slate-400 text-sm ml-1">score</span>
        </div>
        
        {website.scoreChange !== 0 && (
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            website.scoreChange > 0 
              ? 'text-green-700 bg-green-50' 
              : 'text-red-600 bg-red-50'
          }`}>
            {website.scoreChange > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{website.scoreChange > 0 ? '+' : ''}{website.scoreChange}</span>
          </div>
        )}
      </div>

      {/* Right: Date + Buttons */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500 hidden sm:block">
          {formatDate(website.lastScan)}
        </span>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-[#1E1E3F] hover:text-white transition-all font-medium group-hover:bg-[#1E1E3F] group-hover:text-white">
          Bekijk
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all bg-white shadow-sm border border-slate-100"
          title="Verwijder website"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
