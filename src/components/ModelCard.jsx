// src/components/ModelCard.jsx
import React from 'react';

const ModelCard = ({ model }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
        {model.loaded && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Loaded
          </span>
        )}
      </div>
      
      <div className="mt-2">
        <p className="text-sm text-gray-500">Tag: {model.size.parameters}</p>
        <p className="text-sm text-gray-500">Updated: {model.updated || 'Unknown'}</p>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {model.tags[0] || 'latest'}
        </span>
        <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Pull
        </button>
      </div>
    </div>
  );
};

export default ModelCard;