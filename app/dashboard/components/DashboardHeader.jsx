'use client'

import Link from 'next/link'
import { RefreshCw, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function DashboardHeader({ stats, onRefresh }) {
  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-500'
  }

  const getChangeIndicator = (change) => {
    if (change > 0) return { icon: TrendingUp, color: 'text-green-600', prefix: '+' }
    if (change < 0) return { icon: TrendingDown, color: 'text-red-500', prefix: '' }
    return { icon: Minus, color: 'text-slate-400', prefix: '' }
  }

  const changeInfo = getChangeIndicator(stats.scoreChange)
  const ChangeIcon = changeInfo.icon

  return (
    <div className="mb-8">
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mijn Scans</h1>
          <p className="text-slate-500 mt-1">
            Volg de AI-zichtbaarheid van al je websites en bekijk hoe je scoort over tijd.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Ververs</span>
          </button>
          <Link
            href="/tools/ai-visibility"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-medium hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nieuwe Scan
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sites */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Totaal Sites</p>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-bold text-slate-900">{stats.totalSites}</p>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
              +{stats.totalSites} deze maand
            </span>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Gemiddelde Score</p>
          <div className="flex items-end justify-between">
            <p className={`text-4xl font-bold ${getScoreColor(stats.avgScore)}`}>{stats.avgScore}</p>
            <div className={`flex items-center gap-1 text-xs ${changeInfo.color} bg-slate-50 px-2 py-1 rounded-full font-medium`}>
              <ChangeIcon className="w-3 h-3" />
              {changeInfo.prefix}{Math.abs(stats.scoreChange)} vs. vorige maand
            </div>
          </div>
        </div>

        {/* Total Scans */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Totaal Scans</p>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-bold text-slate-900">{stats.totalScans}</p>
            <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-full font-medium">
              {stats.scansThisMonth} deze maand
            </span>
          </div>
        </div>

        {/* Best Performer */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Beste Performer</p>
          <div className="flex items-end justify-between gap-2">
            <p className="text-xl font-bold text-slate-900 truncate flex-1">
              {stats.bestPerformer || '-'}
            </p>
            {stats.bestScore > 0 && (
              <span className={`text-lg font-bold ${getScoreColor(stats.bestScore)}`}>
                Score: {stats.bestScore}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
