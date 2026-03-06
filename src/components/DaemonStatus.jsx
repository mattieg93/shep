/**
 * DaemonStatus Component
 * 
 * Displays the status of the Ollama daemon (the background server process).
 * Allows users to start or stop the daemon directly from the UI.
 * 
 * Props:
 *   - status: Object containing daemon status (running, status)
 *   - onStart: Callback function when "Start Daemon" button is clicked
 *   - onStop: Callback function when "Stop All & Clear RAM" button is clicked
 * 
 * Features:
 *   - Real-time daemon status with visual indicator (green/amber dot)
 *   - Start/stop controls
 *   - Info tooltip explaining daemon vs. models
 *   - Keep-alive timeout configuration info
 */

import React from 'react'

function DaemonStatus({ status, onStart, onStop }) {
  if (!status) return null

  const isRunning = status.running

  return (
    <div className={`p-6 rounded-lg border-2 ${ isRunning
        ? 'bg-green-50 border-green-200'
        : 'bg-amber-50 border-amber-200'
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`h-4 w-4 rounded-full animate-pulse ${
            isRunning ? 'bg-green-600' : 'bg-amber-600'
          }`} />
          <div>
            <h3 className="font-semibold text-shep-text-primary">Ollama Daemon</h3>
            <p className={`text-sm ${
              isRunning ? 'text-green-600' : 'text-amber-600'
            }`}>
              Status: <span className="font-medium">
                {isRunning ? 'Running' : 'Stopped'}
              </span>
            </p>
          </div>
          <div className="info-icon ml-2">
            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="info-tooltip">
              The daemon is the Ollama server process. Models run within this process.
              <br /><br />
              <strong>Model unload timeout (default: 5 min):</strong>
              <br />
              To shorten the timeout, restart Ollama with:
              <br />
              <code style={{fontSize: '11px', background: '#f3f4f6', color: '#1f2937', padding: '4px 6px', borderRadius: '3px', display: 'block', marginTop: '4px'}}>OLLAMA_KEEP_ALIVE=2m ollama serve</code>
              <br />
              Valid formats: 30s, 1m, 2m, 10m, 1h
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {!isRunning && (
            <button
              onClick={onStart}
              className="px-4 py-2 bg-shep-indigo-600 text-white rounded-lg hover:bg-shep-indigo-700 transition-colors font-medium text-sm"
            >
              Start Daemon
            </button>
          )}
          {isRunning && (
            <button
              onClick={onStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              Stop All & Clear RAM
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default DaemonStatus
