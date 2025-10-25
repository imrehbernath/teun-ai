'use client'

/**
 * Live ChatGPT Scanner Modal
 * The WOW Factor Component! ✨
 */

import { useState, useEffect, useRef } from 'react'
import { X, Loader2, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react'

export default function LiveScanModal({ onClose, onComplete }) {
  const [isConnecting, setIsConnecting] = useState(true)
  const [progress, setProgress] = useState(0)
  const [currentQuery, setCurrentQuery] = useState(null)
  const [queries, setQueries] = useState([])
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('connecting') // connecting, scanning, complete, error
  const [liveResponse, setLiveResponse] = useState('')
  const [stats, setStats] = useState({ total: 0, scanned: 0, found: 0 })
  
  const eventSourceRef = useRef(null)
  const resultsEndRef = useRef(null)
  
  useEffect(() => {
    startLiveScan()
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])
  
  useEffect(() => {
    // Auto-scroll to latest result
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [results])
  
  function startLiveScan() {
    const eventSource = new EventSource('/api/chatgpt/live-scan')
    eventSourceRef.current = eventSource
    
    eventSource.onopen = () => {
      console.log('SSE connection opened')
      setIsConnecting(false)
      setStatus('scanning')
    }
    
    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data)
        handleUpdate(update)
      } catch (error) {
        console.error('Failed to parse update:', error)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      setStatus('error')
      eventSource.close()
    }
  }
  
  function handleUpdate(update) {
    const { type, data } = update
    
    switch (type) {
      case 'scan_start':
        setQueries(data.queries)
        setStats({ ...stats, total: data.total })
        break
        
      case 'browser_starting':
        setStatus('starting_browser')
        break
        
      case 'browser_started':
        setStatus('scanning')
        break
        
      case 'query_progress':
        setProgress((data.current / data.total) * 100)
        setStats(prev => ({ ...prev, scanned: data.current }))
        break
        
      case 'query_start':
        setCurrentQuery({
          query: data.query,
          status: 'typing',
          startTime: Date.now()
        })
        break
        
      case 'query_typing':
        setCurrentQuery(prev => ({
          ...prev,
          status: 'typing',
          progress: data.progress
        }))
        break
        
      case 'query_submitted':
        setCurrentQuery(prev => ({
          ...prev,
          status: 'waiting'
        }))
        break
        
      case 'query_waiting':
        setCurrentQuery(prev => ({
          ...prev,
          status: 'waiting',
          elapsed: data.elapsed
        }))
        break
        
      case 'response_received':
        setLiveResponse(data.preview)
        break
        
      case 'query_complete':
        setResults(prev => [...prev, {
          query: data.query,
          found: data.found,
          position: data.position,
          snippet: data.snippet,
          timestamp: Date.now()
        }])
        
        if (data.found) {
          setStats(prev => ({ ...prev, found: prev.found + 1 }))
        }
        
        setCurrentQuery(null)
        setLiveResponse('')
        break
        
      case 'waiting':
        setCurrentQuery(prev => ({
          ...prev,
          status: 'cooldown',
          cooldown: data.seconds
        }))
        break
        
      case 'complete':
        setStatus('complete')
        setProgress(100)
        if (onComplete) {
          onComplete(results)
        }
        break
        
      case 'error':
      case 'critical_error':
        setStatus('error')
        console.error('Scan error:', data.message)
        break
    }
  }
  
  const progressPercentage = Math.round(progress)
  const foundPercentage = stats.scanned > 0 
    ? Math.round((stats.found / stats.scanned) * 100) 
    : 0
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="relative px-8 py-6 bg-gradient-to-r from-purple-600 to-indigo-600">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              {status === 'complete' ? (
                <CheckCircle2 className="w-7 h-7 text-white" />
              ) : status === 'error' ? (
                <XCircle className="w-7 h-7 text-white" />
              ) : (
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                {status === 'complete' ? '✅ Scan Compleet!' :
                 status === 'error' ? '❌ Error' :
                 status === 'starting_browser' ? '🚀 Browser Starten...' :
                 '🤖 Live ChatGPT Scan'}
              </h2>
              <p className="text-purple-100 text-sm">
                {status === 'complete' 
                  ? `${stats.found} van ${stats.total} queries gevonden`
                  : `${stats.scanned} van ${stats.total} queries gescand`}
              </p>
            </div>
            
            {/* Live badge */}
            {status === 'scanning' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-bold">LIVE</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="px-8 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Progress
            </span>
            <span className="text-sm font-bold text-purple-600">
              {progressPercentage}%
            </span>
          </div>
          
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse" />
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-gray-600">
                Totaal: <span className="font-bold text-gray-900">{stats.total}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-gray-600">
                Gevonden: <span className="font-bold text-green-600">{stats.found}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-gray-600">
                Visibility: <span className="font-bold text-purple-600">{foundPercentage}%</span>
              </span>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* Current Query */}
          {currentQuery && (
            <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 shadow-sm animate-in slide-in-from-top duration-300">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  {currentQuery.status === 'typing' ? (
                    <Zap className="w-5 h-5 text-white" />
                  ) : currentQuery.status === 'cooldown' ? (
                    <Clock className="w-5 h-5 text-white" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-purple-600 mb-1">
                    {currentQuery.status === 'typing' ? '⌨️ Typing query...' :
                     currentQuery.status === 'waiting' ? '⏳ Waiting for response...' :
                     currentQuery.status === 'cooldown' ? '😴 Cooling down...' :
                     'Processing...'}
                  </p>
                  
                  <p className="text-lg font-bold text-purple-900 mb-2 break-words">
                    "{currentQuery.query}"
                  </p>
                  
                  {currentQuery.status === 'waiting' && currentQuery.elapsed && (
                    <p className="text-sm text-purple-600">
                      Elapsed: {currentQuery.elapsed}s
                    </p>
                  )}
                  
                  {currentQuery.status === 'cooldown' && currentQuery.cooldown && (
                    <p className="text-sm text-purple-600">
                      Next query in {currentQuery.cooldown}s...
                    </p>
                  )}
                  
                  {/* Live response preview */}
                  {liveResponse && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs font-semibold text-purple-600 mb-1">
                        Response Preview:
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {liveResponse}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Completed Queries
              </h3>
              
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 animate-in slide-in-from-bottom ${
                    result.found
                      ? 'bg-green-50 border-green-200 hover:border-green-300'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      result.found ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      {result.found ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <XCircle className="w-5 h-5 text-white" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 mb-1 break-words">
                        {result.query}
                      </p>
                      
                      {result.found ? (
                        <>
                          <p className="text-sm text-green-700 font-semibold mb-2">
                            ✅ Found at position #{result.position}
                          </p>
                          
                          {result.snippet && (
                            <div className="p-3 bg-white rounded-lg border border-green-200">
                              <p className="text-xs font-semibold text-green-600 mb-1">
                                Snippet:
                              </p>
                              <p className="text-sm text-gray-700">
                                {result.snippet}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-600">
                          Not found in response
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <div ref={resultsEndRef} />
            </div>
          )}
          
          {/* Empty state */}
          {results.length === 0 && !currentQuery && status === 'scanning' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">
                Initializing scan...
              </p>
            </div>
          )}
          
          {/* Complete state */}
          {status === 'complete' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Scan Complete!
              </h3>
              <p className="text-gray-600 mb-6">
                Found {stats.found} out of {stats.total} queries ({foundPercentage}% visibility)
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                View Full Report
              </button>
            </div>
          )}
          
          {/* Error state */}
          {status === 'error' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Scan Failed
              </h3>
              <p className="text-gray-600 mb-6">
                Something went wrong. Please try again.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}