// src/components/ModelList.jsx
import React from 'react';
import { useOllamaModels } from '../hooks/useOllamaModels';
import ModelCard from './ModelCard';

const ModelList = () => {
  const { models, loading, error } = useOllamaModels();

  if (loading) {
    return <div className="text-center py-8">Loading models...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Ollama Models</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>
    </div>
  );
};

export default ModelList;