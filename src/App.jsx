/**
 * Shep - Ollama Model Manager
 * 
 * Main React application component that orchestrates the entire Ollama management interface.
 * Manages daemon status, model list polling, and coordination between UI components.
 * 
 * Core responsibilities:
 * - Poll daemon status and model list every 5 seconds
 * - Handle daemon start/stop operations
 * - Display models, settings, and search modals
 * - Manage error states and loading states
 * - Coordinate between all child components
 * 
 * Architecture:
 * - Backend API: http://localhost:8000 (FastAPI)
 * - Frontend: http://localhost:5173 (Vite + React)
 */

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ModelsTable from './components/ModelsTable'
import DaemonStatus from './components/DaemonStatus'
import SearchModal from './components/SearchModal'
import SettingsPanel from './components/SettingsPanel'
import DeleteConfirmationModal from './components/DeleteConfirmationModal'
import './index.css'

function App() {
  const [daemonStatus, setDaemonStatus] = useState(null)
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [pollInterval, setPollInterval] = useState(null)
  const [isStartingDaemon, setIsStartingDaemon] = useState(false)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [modelToDelete, setModelToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check daemon status once on mount
  const checkDaemonStatus = async () => {
    try {
      const response = await axios.get('/api/daemon/status')
      setDaemonStatus(response.data)
      return response.data.running
    } catch (err) {
      setDaemonStatus({ running: false, status: 'stopped' })
      return false
    }
  }

  // Fetch models only if daemon is running
  const fetchModels = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/models')
      setDaemonStatus(response.data.daemon)
      setModels(response.data.models)
      setError(response.data.error || null)
    } catch (err) {
      setError('Failed to fetch models')
      setModels([])
    } finally {
      setLoading(false)
    }
  }

  // On mount: check daemon status
  useEffect(() => {
    checkDaemonStatus()
  }, [])

  // When daemon status changes, start/stop polling
  useEffect(() => {
    if (daemonStatus?.running) {
      // Fetch models immediately
      fetchModels()
      // Then poll every 5 seconds
      const interval = setInterval(fetchModels, 5000)
      setPollInterval(interval)
      return () => clearInterval(interval)
    } else {
      // Daemon is stopped - don't poll
      setModels([])
      setLoading(false)
      if (pollInterval) {
        clearInterval(pollInterval)
        setPollInterval(null)
      }
    }
  }, [daemonStatus?.running])

  const handleStartDaemon = async () => {
    try {
      setIsStartingDaemon(true)
      setError(null)
      await axios.post('/api/daemon/start')
      // Check status after starting
      await new Promise(resolve => setTimeout(resolve, 2000))
      const isRunning = await checkDaemonStatus()
      if (isRunning) {
        await fetchModels()
      }
      setIsStartingDaemon(false)
    } catch (err) {
      setError(`Failed to start daemon: ${err.response?.data?.detail || err.message}`)
      setIsStartingDaemon(false)
    }
  }

  const handleStopDaemon = async () => {
    try {
      await axios.post('/api/daemon/stop')
      await new Promise(resolve => setTimeout(resolve, 1000))
      await checkDaemonStatus()
    } catch (err) {
      setError(`Failed to stop daemon: ${err.response?.data?.detail || err.message}`)
    }
  }

  const handleDeleteModel = (modelId) => {
    setModelToDelete(modelId)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return

    try {
      setIsDeleting(true)
      await axios.delete(`/api/models/${modelToDelete}`)
      fetchModels()
      setShowDeleteConfirm(false)
      setModelToDelete(null)
    } catch (err) {
      setError(`Failed to delete model: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setModelToDelete(null)
  }

  const handleModelAdded = () => {
    setShowSearchModal(false)
    setTimeout(fetchModels, 1000)
  }

  const handleRefresh = async () => {
    if (daemonStatus?.running) {
      setIsManualRefreshing(true)
      await fetchModels()
      setIsManualRefreshing(false)
    }
  }

  const handleStopDaemonWithConfirm = async () => {
    const firstConfirm = window.confirm(
      'Stop Ollama daemon and clear all models from RAM?\n\nThis will free up memory but you won\'t be able to use models until you start the daemon again.'
    )
    if (!firstConfirm) return

    const secondConfirm = window.confirm(
      'Are you sure? This action will immediately stop all model processing.'
    )
    if (!secondConfirm) return

    await handleStopDaemon()
  }

  if (!daemonStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-shep-surface-light to-shep-surface-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="h-8 w-8 border-4 border-shep-cyan-100 border-t-shep-cyan-400 rounded-full" />
          </div>
          <p className="text-slate-600">Checking daemon status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-shep-surface-light to-shep-surface-white ${isStartingDaemon ? 'opacity-50' : ''} transition-opacity duration-200`}>
      {/* Daemon Startup Overlay */}
      {isStartingDaemon && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm text-center">
            <div className="inline-block animate-spin mb-6">
              <div className="h-12 w-12 border-4 border-shep-cyan-100 border-t-shep-cyan-400 rounded-full" />
            </div>
            <h2 className="text-xl font-semibold text-shep-text-primary mb-2">Starting Ollama Daemon</h2>
            <p className="text-slate-600 mb-4">This may take up to 30 seconds...</p>
            <div className="text-sm text-slate-500 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Attempting launchctl, then fallback to direct start
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src="/assets/branding/shep-icon.png" alt="Shep" width="48" height="48" />
              <h1 className="text-4xl font-bold text-shep-text-primary">Shep</h1>
            </div>
            <p className="text-slate-600">Manage your local Ollama models with ease</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-slate-200 text-shep-text-muted rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Daemon Status and Controls */}
        <DaemonStatus
          status={daemonStatus}
          onStart={handleStartDaemon}
          onStop={handleStopDaemonWithConfirm}
        />

        {/* Models Section */}
        {daemonStatus?.running ? (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-shep-text-primary">Models</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={isManualRefreshing}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isManualRefreshing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="px-4 py-2 bg-shep-indigo-600 text-white rounded-lg hover:bg-shep-indigo-700 transition-colors font-medium"
                >
                  + Add Model
                </button>
              </div>
            </div>

            {loading && models.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">
                  <div className="h-8 w-8 border-4 border-shep-cyan-100 border-t-shep-cyan-400 rounded-full" />
                </div>
                <p className="mt-4 text-slate-600">Loading models...</p>
              </div>
            ) : (
              <ModelsTable
                models={models}
                onDelete={handleDeleteModel}
              />
            )}
          </div>
        ) : (
          <div className="mt-8 text-center py-16 bg-white rounded-lg border border-slate-200">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-shep-cyan-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-shep-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-shep-text-primary mb-2">Daemon is Not Running</h3>
            <p className="text-slate-600 mb-6">Start the Ollama daemon above to view and manage your models.</p>
            <button
              onClick={handleStartDaemon}
              className="px-6 py-3 bg-shep-indigo-600 text-white rounded-lg hover:bg-shep-indigo-700 transition-colors font-medium"
            >
              Start Daemon
            </button>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal
          installedModels={models.map(m => m.name)}
          onClose={() => setShowSearchModal(false)}
          onModelAdded={handleModelAdded}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-shep-text-primary">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SettingsPanel />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && modelToDelete && (
        <DeleteConfirmationModal
          modelId={modelToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}

export default App
