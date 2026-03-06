/**
 * ModelsTable Component
 * 
 * Displays a table of all installed Ollama models with relevant information.
 * Provides controls to stop models (free RAM) or delete them.
 * 
 * Props:
 *   - models: Array of model objects with name, size, vram, etc.
 *   - onDelete: Callback function when a model is deleted
 * 
 * Features:
 *   - Sortable model list with name, size, VRAM info
 *   - Stop button to unload model from VRAM
 *   - Delete button with confirmation dialog
 *   - Real-time countdown timer for model expiration
 *   - VRAM requirement display with info tooltip
 */

import React, { useState, useEffect } from 'react'

function ModelsTable({ models, onDelete }) {
  const [deletingModel, setDeletingModel] = useState(null)
  const [timeoutSeconds, setTimeoutSeconds] = useState({})

  if (models.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
        <svg className="h-12 w-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 21l-4.35-4.35m0 0A7.5 7.5 0 103.305 3.305a7.5 7.5 0 0010.345 10.345z" />
        </svg>
        <p className="text-slate-600">No models found. Add one to get started!</p>
      </div>
    )
  }

  const formatSize = (bytes) => {
    if (!bytes) return '—'
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Update countdown timers dynamically based on expires_at
  useEffect(() => {
    const loadedModels = models.filter(m => m.loaded && m.expires_at)
    if (loadedModels.length === 0) {
      setTimeoutSeconds({})
      return
    }

    const interval = setInterval(() => {
      const updated = {}
      const now = new Date().getTime()
      
      loadedModels.forEach(model => {
        if (model.expires_at) {
          const expiryTime = new Date(model.expires_at).getTime()
          const secondsRemaining = Math.max(0, Math.floor((expiryTime - now) / 1000))
          updated[model.id] = secondsRemaining
        }
      })
      
      setTimeoutSeconds(updated)
    }, 1000)

    return () => clearInterval(interval)
  }, [models])

  // Initialize timeout for loaded models on mount/update
  useEffect(() => {
    const initial = {}
    const now = new Date().getTime()
    
    models.forEach(model => {
      if (model.loaded && model.expires_at && !timeoutSeconds[model.id]) {
        const expiryTime = new Date(model.expires_at).getTime()
        const secondsRemaining = Math.max(0, Math.floor((expiryTime - now) / 1000))
        initial[model.id] = secondsRemaining
      }
    })
    
    if (Object.keys(initial).length > 0) {
      setTimeoutSeconds(prev => ({ ...prev, ...initial }))
    }
  }, [models])

  const formatTimeout = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const getTimeoutPercent = (secondsRemaining, model) => {
    if (!model || !model.expires_at) return 0
    
    try {
      const expiryTime = new Date(model.expires_at).getTime()
      const now = new Date().getTime()
      const totalTimeout = 5 * 60 * 1000 // 5 minutes in milliseconds
      const elapsedTime = totalTimeout - (expiryTime - now)
      
      return Math.max(0, Math.min(100, (elapsedTime / totalTimeout) * 100))
    } catch {
      return 0
    }
  }

  const formatLastQuery = (expiresAt) => {
    if (!expiresAt) return 'N/A'
    try {
      const expiryTime = new Date(expiresAt).getTime()
      const now = new Date().getTime()
      const lastQueryTime = expiryTime - (5 * 60 * 1000) // 5 minutes ago from expiry
      const timeSinceLastQuery = Math.floor((now - lastQueryTime) / 1000) // in seconds

      if (timeSinceLastQuery < 0) return 'Just now'
      if (timeSinceLastQuery < 60) return `${timeSinceLastQuery}s ago`
      if (timeSinceLastQuery < 3600) {
        const mins = Math.floor(timeSinceLastQuery / 60)
        return `${mins}m ago`
      }
      const hours = Math.floor(timeSinceLastQuery / 3600)
      return `${hours}h ago`
    } catch {
      return 'N/A'
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-shep-text-primary">Model</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-shep-text-primary">Size</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-shep-text-primary">VRAM</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-shep-text-primary">Status</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-shep-text-primary">Modified</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-shep-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {models.map((model) => (
            <tr key={model.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-medium text-shep-text-primary">{model.name}</span>
                  <span className="text-sm text-slate-500">{model.tag}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-shep-text-muted">
                {formatSize(model.size)}
              </td>
              <td className="px-6 py-4 text-shep-text-muted">
                {formatSize(model.size_vram)}
                <div className="info-icon ml-2 inline-block">
                  <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="info-tooltip">
                    VRAM: Video memory when model is loaded
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 w-64">
                {model.loaded ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <svg className="w-12 h-12" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="4"
                          strokeDasharray={`${2 * Math.PI * 45}`}
                          strokeDashoffset={`${2 * Math.PI * 45 * (1 - getTimeoutPercent(timeoutSeconds[model.id] || 0, model) / 100)}`}
                          strokeLinecap="round"
                          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px', transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-shep-indigo-600">
                        {formatTimeout(timeoutSeconds[model.id] || 0)}
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-green-700">Loaded</p>
                      <p className="text-xs text-slate-500">Auto-unload in {formatTimeout(timeoutSeconds[model.id] || 0)}</p>
                      <p className="text-xs text-slate-400">Last query: {formatLastQuery(model.expires_at)}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400 text-sm font-medium">Not running</span>
                )}
              </td>
              <td className="px-6 py-4 text-shep-text-muted">
                {formatDate(model.modified_at)}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setDeletingModel(model.id)
                      onDelete(model.id)
                      setTimeout(() => setDeletingModel(null), 1000)
                    }}
                    disabled={deletingModel === model.id}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-red-600"
                    title="Delete this model"
                  >
                    {deletingModel === model.id ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ModelsTable
