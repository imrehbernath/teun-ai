'use client'

export default function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
          {/* Spinning ring */}
          <div className="absolute inset-0 border-4 border-[#1E1E3F] border-t-transparent rounded-full animate-spin"></div>
          {/* Inner dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-[#1E1E3F] rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="text-slate-600 font-medium">Dashboard laden...</p>
        <p className="text-slate-400 text-sm mt-1">Even geduld alsjeblieft</p>
      </div>
    </div>
  )
}
