'use client'

import WebsiteCard from './WebsiteCard'
import WebsiteListItem from './WebsiteListItem'

export default function WebsiteList({ websites, filter, onFilterChange, onSelectWebsite, onDeleteWebsite }) {
  // Show first 4 as cards, rest as list items
  const cardWebsites = websites.slice(0, 4)
  const listWebsites = websites.slice(4)

  return (
    <div className="mb-8">
      {/* Section Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-bold text-slate-900">Je websites</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => onFilterChange('all')}
            className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${
              filter === 'all' 
                ? 'bg-[#1E1E3F] text-white shadow-md' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            Alle
          </button>
          <button 
            onClick={() => onFilterChange('best')}
            className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${
              filter === 'best' 
                ? 'bg-[#1E1E3F] text-white shadow-md' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            Beste eerst
          </button>
          <button 
            onClick={() => onFilterChange('recent')}
            className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${
              filter === 'recent' 
                ? 'bg-[#1E1E3F] text-white shadow-md' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            Recent
          </button>
        </div>
      </div>

      {/* Website Cards Grid (first 4) */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {cardWebsites.map((website) => (
          <WebsiteCard 
            key={website.id}
            website={website}
            onClick={() => onSelectWebsite(website)}
            onDelete={onDeleteWebsite}
          />
        ))}
      </div>

      {/* Additional Websites as List */}
      {listWebsites.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
          {listWebsites.map((website) => (
            <WebsiteListItem 
              key={website.id}
              website={website}
              onClick={() => onSelectWebsite(website)}
              onDelete={onDeleteWebsite}
            />
          ))}
        </div>
      )}

      {/* Empty state if no websites */}
      {websites.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Nog geen websites gescand</p>
        </div>
      )}
    </div>
  )
}
