/**
 * DeleteConfirmationModal Component
 * 
 * Custom modal for confirming model deletion instead of using browser's native window.confirm()
 * Matches Shep's design aesthetic with brand colors and smooth interactions.
 * 
 * Props:
 *   - modelId (string): Name of the model to delete
 *   - onConfirm (function): Callback when user confirms deletion
 *   - onCancel (function): Callback when user cancels or closes modal
 *   - isDeleting (boolean): Loading state during deletion operation
 */

import React from 'react'

function DeleteConfirmationModal({ modelId, onConfirm, onCancel, isDeleting = false }) {
  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full mx-4 animate-in">
        {/* Header */}
        <div className="border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-shep-text-primary">Delete Model</h2>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            {/* Warning Icon */}
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Warning Message */}
            <div className="flex-1">
              <p className="text-slate-700 text-sm">
                Are you sure you want to delete <span className="font-semibold text-shep-text-primary">{modelId}</span>?
              </p>
              <p className="text-slate-500 text-xs mt-2">
                This action cannot be undone. The model will be permanently removed from your system.
              </p>
            </div>
          </div>

          {/* Warning Box with destructive consequence */}
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 font-medium">
              This will free up disk space but cannot be recovered.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-200 p-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-200 text-shep-text-primary rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmationModal
