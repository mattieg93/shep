// src/hooks/useOllamaModels.js
import { useState, useEffect } from 'react';

export function useOllamaModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        // Call your backend API endpoint
        const response = await fetch('http://localhost:8000/api/models');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Parse models using the structure from your backend
        const parsedModels = data.models.map(model => ({
          name: model.name,
          size: {
            parameters: model.tag, // Using tag as parameter size since that's what's in backend
            memory: undefined, // Not provided by backend
            contextWindow: undefined // Not provided by backend
          },
          variants: [model.tag], // Using tag as variant
          description: `Model from Ollama library`, // Default description
          tags: [model.tag], // Using tag as a tag
          pulls: 0, // Not provided by backend
          updated: model.modified_at,
          loaded: model.loaded,
          id: model.id
        }));
        
        setModels(parsedModels);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setError('Failed to fetch models from backend');
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  return { models, loading, error };
}