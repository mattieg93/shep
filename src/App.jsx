/**
 * Shep - Ollama Model Manager
 *
 * Main React application component. Polls daemon status and models every 5 seconds,
 * handles daemon start/stop, and coordinates between all child components.
 *
 * Architecture:
 * - Backend API: http://localhost:8000 (FastAPI, proxied by Vite)
 * - Frontend:    http://localhost:5173 (Vite + React)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import DaemonStatus from './components/DaemonStatus';
import ModelsTable from './components/ModelsTable';
import SearchModal from './components/SearchModal';
import SettingsPanel from './components/SettingsPanel';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import StopDaemonConfirmationModal from './components/StopDaemonConfirmationModal';

const App = () => {
  const [daemonStatus, setDaemonStatus] = useState(null);
  const [models, setModels] = useState([]);
  const [error, setError] = useState(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [isDaemonStarting, setIsDaemonStarting] = useState(false);
  const intervalRef = useRef(null);

  const fetchModels = useCallback(async () => {
    try {
      const response = await axios.get('/api/models');
      const data = response.data;
      setDaemonStatus(data.daemon);
      setModels(data.models || []);
      setError(data.error || null);
    } catch (err) {
      setError('Failed to connect to backend. Is it running?');
    }
  }, []);

  useEffect(() => {
    fetchModels();
    intervalRef.current = setInterval(fetchModels, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchModels]);

  const handleStartDaemon = async () => {
    try {
      setError(null);
      setIsDaemonStarting(true);
      await axios.post('/api/daemon/start');
      await fetchModels();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start daemon');
    } finally {
      setIsDaemonStarting(false);
    }
  };

  const handleStopDaemon = async () => {
    try {
      setError(null);
      await axios.post('/api/daemon/stop');
      await fetchModels();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to stop daemon');
    }
  };

  const handleStopDaemonWithConfirm = () => {
    setShowStopConfirm(true);
  };

  const handleConfirmStop = async () => {
    setShowStopConfirm(false);
    await handleStopDaemon();
  };

  const handleDeleteModel = (modelId) => {
    setModelToDelete(modelId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return;
    try {
      setIsDeleting(true);
      await axios.delete(`/api/models/${encodeURIComponent(modelToDelete)}`);
      setShowDeleteConfirm(false);
      setModelToDelete(null);
      await fetchModels();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete model');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setModelToDelete(null);
  };

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await fetchModels();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleModelAdded = () => {
    fetchModels();
  };

  // Build modelsUsage shape expected by StopDaemonConfirmationModal
  const modelsUsage = models.reduce((acc, m) => {
    acc[m.id] = { name: m.name, loaded: m.loaded, vram: m.size_vram || 0 };
    return acc;
  }, {});

  return (
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

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Daemon Status */}
      <div className="mb-8">
        <DaemonStatus
          status={daemonStatus}
          onStart={handleStartDaemon}
          onStop={handleStopDaemonWithConfirm}
        />
      </div>

      {/* Settings Panel (inline toggle) */}
      {showSettings && (
        <div className="mb-8 bg-white rounded-lg border border-slate-200">
          <SettingsPanel />
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-shep-text-primary">Models</h2>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={isManualRefreshing}
            className="px-4 py-2 bg-shep-indigo-600 text-white rounded-lg hover:bg-shep-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setShowSearchModal(true)}
            className="px-4 py-2 bg-shep-indigo-600 text-white rounded-lg hover:bg-shep-indigo-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Model
          </button>
        </div>
      </div>

      {/* Models Table */}
      <div className="mb-8">
        <ModelsTable
          models={models}
          onDelete={handleDeleteModel}
        />
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal
          installedModels={models.map(m => m.name)}
          onModelAdded={handleModelAdded}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && modelToDelete && (
        <DeleteConfirmationModal
          modelId={modelToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Daemon Starting Modal */}
      {isDaemonStarting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-5 h-5 animate-spin text-shep-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <h3 className="text-lg font-semibold text-shep-text-primary">Starting Ollama Daemon</h3>
            </div>
            <p className="text-slate-600 text-sm">
              The daemon is starting up. This can take up to <span className="font-medium">30 seconds</span> on first launch or after a restart.
            </p>
          </div>
        </div>
      )}

      {/* Stop Daemon Confirm Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <StopDaemonConfirmationModal
            modelsUsage={modelsUsage}
            onConfirm={handleConfirmStop}
            onCancel={() => setShowStopConfirm(false)}
          />
        </div>
      )}
    </div>
  );
};

export default App;
