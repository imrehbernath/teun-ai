'use client'

import { Clock, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import ScoreChart from './ScoreChart'
import { useTranslations, useLocale } from 'next-intl'

export default function WebsiteCard({ website, onClick, onDelete }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-500'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('dates.today')
    if (diffDays === 1) return t('dates.yesterday')
    if (diffDays < 7) return t('dates.daysAgo', { days: diffDays })
    return date.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'short' })
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

  const toSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleClick = () => {
    const slug = toSlug(website.id)
    window.location.href = `/dashboard/website/${slug}`
  }

  return (
    <div 
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer group relative"
      onClick={handleClick}
    >
      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all z-10 bg-white/80 shadow-sm border border-slate-100"
          title={t('websiteList.deleteWebsite')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4 pr-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#1E1E3F] to-[#2D2D5F] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
            {getInitials(website.name)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-[#1E1E3F] transition-colors">
              {website.name}
            </h3>
            <p className="text-sm text-slate-500">
              {website.website || website.category || 'Website'}
            </p>
          </div>
        </div>
        
        {/* Score Badge */}
        <div className="text-right">
          <div className={`text-3xl font-bold ${getScoreColor(website.currentScore)}`}>
            {website.currentScore}
          </div>
          {website.scoreChange !== 0 && (
            <div className={`flex items-center justify-end gap-1 text-xs mt-1 ${
              website.scoreChange > 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {website.scoreChange > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{website.scoreChange > 0 ? '+' : ''}{website.scoreChange} {t('websiteCard.points')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Score History Chart */}
      {website.scoreHistory && website.scoreHistory.length > 1 && (
        <div className="mb-4 h-16 bg-slate-50 rounded-xl p-2">
          <ScoreChart data={website.scoreHistory} />
        </div>
      )}

      {/* Platform Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
          website.platforms.perplexity 
            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
            : 'bg-slate-100 text-slate-400 border border-slate-200'
        }`}>
          Perplexity
        </span>
        <span className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
          website.platforms.chatgpt 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-slate-100 text-slate-400 border border-slate-200'
        }`}>
          ChatGPT
        </span>
        <span className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
          website.platforms.google 
            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
            : 'bg-slate-100 text-slate-400 border border-slate-200'
        }`}>
          AI Modus
        </span>
        <span className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
          website.platforms.googleOverview 
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
            : 'bg-slate-100 text-slate-400 border border-slate-200'
        }`}>
          AI Overviews
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-100">
        <span className="text-slate-500 flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {t('websiteCard.lastScan')}: {formatDate(website.lastScan)}
        </span>
        <span className="text-slate-600 font-medium">
          {website.scanCount} scan{website.scanCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
