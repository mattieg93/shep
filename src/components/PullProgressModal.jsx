/**
 * PullProgressModal Component
 * 
 * Displays real-time download progress when pulling (installing) an Ollama model.
 * Streams progress updates from the backend and shows current status, ETA, and speed.
 * Handles download cancellation and error states.
 * 
 * Props:
 *   - modelName: Name of the model being pulled
 *   - visible: Boolean to show/hide the modal
 *   - onClose: Callback when modal should close
 * 
 * Features:
 *   - Real-time progress bar (0-100%)
 *   - Download speed and ETA display
 *   - Cancel download functionality
 *   - Error handling with clear error messages
 *   - Completion feedback
 */

import React, { useState, useEffect, useRef } from 'react'

function PullProgressModal({ modelName, onClose, onComplete }) {
  const [status, setStatus] = useState('Connecting...')
  const [progress, setProgress] = useState(0)
  const [currentSize, setCurrentSize] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Refs so the async stream handler and cancel button share the same values
  const controllerRef = useRef(null)
  const isCancelledRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    isCancelledRef.current = false
    setError(null)
    setCompleted(false)

    const startPull = async () => {
      try {
        const response = await fetch(`/api/models/pull?model_name=${encodeURIComponent(modelName)}`, {
          method: 'POST',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let streamError = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (!isCancelledRef.current && !streamError) {
              setError(null)
              setStatus('Download complete')
              setProgress(100)
              setCompleted(true)
            }
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const data = JSON.parse(line)

              if (data.error) {
                streamError = data.error
                setError(data.error)
                setStatus('Error')
              }

              if (data.status) {
                setStatus(data.status)
              }

              if (data.digest && data.total && data.completed) {
                const pct = Math.round((data.completed / data.total) * 100)
                setProgress(pct)
                setCurrentSize(data.completed)
                setTotalSize(data.total)
              }

              if (data.status === 'success' || data.status === 'pull complete') {
                setError(null)
                setStatus('Download complete')
                setProgress(100)
                setCompleted(true)
              }
            } catch (e) {
              // Ignore JSON parse errors for non-JSON lines
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // Only show cancelled state if the user explicitly triggered it
          if (isCancelledRef.current) {
            setStatus('Cancelled')
            setError('Download was cancelled')
            setCompleted(false)
          }
        } else {
          setError(`Failed to download: ${err.message}`)
          setStatus('Error')
          setCompleted(false)
        }
      }
    }

    startPull()

    return () => {
      // Effect cleanup on unmount — abort silently, do NOT mark as cancelled
      controller.abort()
    }
  }, [modelName])

  const handleCancelClick = () => {
    setShowCancelConfirm(true)
  }

  const handleConfirmCancel = async () => {
    setShowCancelConfirm(false)
    isCancelledRef.current = true
    controllerRef.current?.abort()
    try {
      await fetch(`/api/models/cancel-pull?model_name=${encodeURIComponent(modelName)}`, {
        method: 'POST',
      })
    } catch {
      // Silently fail
    }
  }

  const handleClose = () => {
    if (completed) {
      onComplete()
    } else {
      onClose()
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
  }

  const isLoading = !completed && !error && progress < 100

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-shep-text-primary">Downloading</h2>
            <p className="text-sm text-slate-600 mt-1">{modelName}</p>
          </div>

          {/* Status Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {isLoading && (
                <svg className="w-4 h-4 animate-spin text-shep-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {completed && (
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
              {error && (
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              )}
              <span className={`text-sm font-medium ${
                error ? 'text-red-600' : completed ? 'text-green-600' : 'text-shep-text-muted'
              }`}>
                {status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    error ? 'bg-red-500' : completed ? 'bg-green-500' : 'bg-shep-indigo-600'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-right mt-1">
                <span className="text-xs font-medium text-slate-600">{progress}%</span>
              </div>
            </div>

            {/* Size Info */}
            {totalSize > 0 && (
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Progress:</span>
                  <span>{formatBytes(currentSize)} / {formatBytes(totalSize)}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !completed && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!completed && !error && (
              <>
                <button
                  onClick={handleCancelClick}
                  className="flex-1 px-4 py-2 border border-slate-300 text-shep-text-muted rounded-lg hover:bg-shep-surface-light transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled
                  className="flex-1 px-4 py-2 bg-slate-300 text-white rounded-lg font-medium text-sm cursor-not-allowed opacity-50"
                >
                  Downloading...
                </button>
              </>
            )}
            {completed && (
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                Done
              </button>
            )}
            {error && !completed && (
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-shep-text-primary">Cancel Download?</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6">
              Are you sure you want to cancel downloading <span className="font-medium">{modelName}</span>? The partial download will be discarded.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-shep-text-muted rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Keep Downloading
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PullProgressModal
