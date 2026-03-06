// src/components/DebugModelCard.jsx
import React from 'react';

const DebugModelCard = ({ model }) => {
  console.log('Model data:', model); // This will help us see what's actually being passed
  
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{model.name}</h3>
      <p className="text-gray-600 text-sm mb-3">{model.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {model.tags.map((tag, index) => (
          <span 
            key={index} 
            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="font-medium">Size:</span> 
          <span className="ml-1">{model.size.parameters || 'Unknown'}</span>
        </div>
        <div>
          <span className="font-medium">Pulls:</span> 
          <span className="ml-1">{model.pulls?.toLocaleString() || 0}</span>
        </div>
        {model.size.contextWindow && (
          <div>
            <span className="font-medium">Context:</span> 
            <span className="ml-1">{model.size.contextWindow}</span>
          </div>
        )}
        {model.size.memory && (
          <div>
            <span className="font-medium">Memory:</span> 
            <span className="ml-1">{model.size.memory}</span>
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <h4 className="text-sm font-medium mb-1">Variants:</h4>
        <div className="flex flex-wrap gap-1">
          {model.variants.map((variant, index) => (
            <span 
              key={index} 
              className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
            >
              {variant}
            </span>
          ))}
        </div>
      </div>
      
      <button className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors">
        Pull
      </button>
    </div>
  );
};

export default DebugModelCard;