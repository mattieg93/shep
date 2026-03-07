export default function StopDaemonConfirmationModal({ modelsUsage, onConfirm, onCancel }) {
  const totalVRAM = Object.values(modelsUsage)
    .filter(m => m.loaded && m.vram)
    .reduce((sum, m) => sum + m.vram, 0);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Stop Daemon</h3>
      </div>
      <p className="text-slate-600 mb-6">Stopping the daemon will terminate all currently loaded models and free up {formatSize(totalVRAM)}:</p>
      <div className="mb-6">
        <div className="text-sm text-shep-text-muted">
          {Object.values(modelsUsage)
            .filter(m => m.loaded)
            .map((model, index) => (
              <div key={index} className="mb-1">
                <span className="font-medium">{model.name}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({model.queryCount || 0} queries, {formatSize(model.vram)})
                </span>
              </div>
            ))}
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-200 text-shep-text-primary rounded-lg hover:bg-slate-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Stop Daemon
        </button>
      </div>
    </div>
  );
}