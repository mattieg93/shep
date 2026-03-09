/**
 * SettingsPanel Component
 * 
 * Allows users to configure Ollama settings via GUI instead of terminal.
 * Manages ~/.zshrc environment variables: OLLAMA_MODELS path and OLLAMA_KEEP_ALIVE timeout.
 * 
 * Features:
 *   - Display default model location (~/.ollama/models)
 *   - Set custom model storage path
 *   - Configure model unload timeout (memory management)
 *   - Smart warnings for custom paths with setup instructions
 *   - Reset to default button
 *   - Success/error feedback
 */

import React, { useState, useEffect } from 'react'
import axios from 'axios'

const DEFAULT_MODELS_PATH = '~/.ollama/models'

function SettingsPanel() {
  const [ollama_models, setOllama_models] = useState('')
  const [ollama_keep_alive, setOllama_keep_alive] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Check if current path is non-default
  const isCustomPath = ollama_models && ollama_models !== DEFAULT_MODELS_PATH && ollama_models.trim() !== ''

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await axios.get('/api/settings')
        setOllama_models(response.data.ollama_models || '')
        setOllama_keep_alive(response.data.ollama_keep_alive || '')
        setError(response.data.error)
      } catch (err) {
        setError(`Failed to load settings: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await axios.post('/api/settings', null, {
        params: {
          // Send values as-is: empty string resets to default, non-empty updates
          ollama_models: ollama_models,
          ollama_keep_alive: ollama_keep_alive,
        }
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(`Failed to save settings: ${err.response?.data?.detail || err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = () => {
    setOllama_models('')
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block">
          <svg className="w-6 h-6 animate-spin text-shep-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-slate-600 mt-2">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-shep-text-primary mb-4">Settings</h3>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            Settings saved successfully!
          </div>
        )}
      </div>

      {/* Model Path Setting */}
      <div>
        <label htmlFor="models-path" className="block text-sm font-medium text-shep-text-muted mb-2">
          Model Storage Path
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Where Ollama stores downloaded models (OLLAMA_MODELS)
        </p>
        <p className="text-xs text-slate-400 mb-3 bg-shep-surface-light p-2 rounded">
          Default: <code className="font-mono">{DEFAULT_MODELS_PATH}</code>
        </p>
        <input
          id="models-path"
          type="text"
          value={ollama_models}
          onChange={(e) => setOllama_models(e.target.value)}
          placeholder={DEFAULT_MODELS_PATH}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shep-cyan-400 focus:border-transparent text-sm font-mono"
        />

        {/* Actions for custom paths */}
        {isCustomPath && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleResetToDefault}
              className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors"
            >
              Reset to Default
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(ollama_models || DEFAULT_MODELS_PATH);
              }}
              className="flex-1 px-3 py-1.5 bg-slate-200 text-shep-text-muted rounded text-xs font-medium hover:bg-slate-300 transition-colors"
            >
              Copy Path to Clipboard
            </button>
          </div>
        )}

        {/* Default path */}
        {!isCustomPath && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleResetToDefault}
              className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors"
            >
              Reset to Default
            </button>
            <button
              onClick={() => window.open(`file://${DEFAULT_MODELS_PATH.replace('~', '/Users/' + (window.navigator ? 'user' : 'unknown'))}`, '_blank')}
              className="flex-1 px-3 py-1.5 bg-slate-200 text-shep-text-muted rounded text-xs font-medium hover:bg-slate-300 transition-colors"
            >
              Open Directory
            </button>
          </div>
        )}

        {/* Warning box for custom paths */}
        {isCustomPath && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
              <div className="text-sm text-amber-900 flex-1">
                <p className="font-semibold mb-2">Custom Path Detected</p>
                <p className="mb-3 text-amber-800">
                  To use this custom location, you must restart Ollama with the <code className="bg-white px-1 rounded text-xs font-mono">OLLAMA_MODELS</code> environment variable set.
                </p>

                <p className="text-xs text-amber-700 mb-2">
                  <strong>If using a virtual environment or container:</strong> Run this command in your terminal before starting Ollama:
                </p>
                <div className="bg-white border border-amber-200 rounded p-2 mb-3 font-mono text-xs overflow-x-auto text-slate-800">
                  sudo OLLAMA_MODELS={ollama_models} ollama serve
                </div>

                <p className="text-xs text-amber-700">
                  <strong>Standard installation:</strong> Just set the environment variable and restart your Ollama daemon. Close this app and any existing Ollama process first.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keep Alive Setting */}
      <div>
        <label htmlFor="keep-alive" className="block text-sm font-medium text-shep-text-muted mb-2">
          Model Timeout Duration
        </label>
        <p className="text-xs text-slate-500 mb-2">
          How long before idle models are unloaded from VRAM (OLLAMA_KEEP_ALIVE)
        </p>
        <input
          id="keep-alive"
          type="text"
          value={ollama_keep_alive}
          onChange={(e) => setOllama_keep_alive(e.target.value)}
          placeholder="5m"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shep-cyan-400 focus:border-transparent text-sm font-mono"
        />
        <p className="text-xs text-slate-400 mt-1">
          Valid formats: 30s, 2m, 1h (seconds, minutes, hours)
        </p>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 bg-shep-indigo-600 text-white rounded-lg hover:bg-shep-indigo-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </>
          )}
        </button>
        <p className="text-xs text-slate-500 mt-3 text-center">
          Changes require terminal restart to take effect
        </p>
      </div>
    </div>
  )
}

export default SettingsPanel
