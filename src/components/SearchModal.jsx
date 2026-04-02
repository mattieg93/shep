import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PullProgressModal from './PullProgressModal';

function SearchModal({ installedModels = [], onClose, onModelAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pullingModel, setPullingModel] = useState(null);
  const [error, setError] = useState(null);
  const [libraryModels, setLibraryModels] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Cache for storing search results to prevent reset issues
  const [cachedResults, setCachedResults] = useState(new Map());

  // Variant selection state
  const [variantData, setVariantData] = useState(new Map());       // modelName -> string[]
  const [loadingVariants, setLoadingVariants] = useState(new Set()); // modelName (loading)
  const [selectedVariants, setSelectedVariants] = useState(new Map()); // modelName -> tag
  const [revealedVariants, setRevealedVariants] = useState(new Set()); // models where Pull was clicked

  const fetchVariants = async (modelName) => {
    if (variantData.has(modelName) || loadingVariants.has(modelName)) return;

    setLoadingVariants(prev => new Set(prev).add(modelName));
    try {
      const response = await axios.get(`/api/library/models/${encodeURIComponent(modelName)}/tags`);
      const tags = response.data.tags || [];
      setVariantData(prev => new Map(prev).set(modelName, tags));
      if (tags.length > 0) {
        setSelectedVariants(prev => new Map(prev).set(modelName, tags[0]));
      }
    } catch {
      setVariantData(prev => new Map(prev).set(modelName, []));
    } finally {
      setLoadingVariants(prev => { const s = new Set(prev); s.delete(modelName); return s; });
    }
  };

  const popularModels = [
    { name: 'llama2', desc: 'Meta Llama 2 Chat - 7B and 13B variants', url: 'https://ollama.com/library/llama2' },
    { name: 'mistral', desc: 'Mistral 7B - Fast and efficient', url: 'https://ollama.com/library/mistral' },
    { name: 'neural-chat', desc: 'Intel Neural Chat 7B', url: 'https://ollama.com/library/neural-chat' },
    { name: 'starling-lm', desc: 'Starling LM - High-quality chat', url: 'https://ollama.com/library/starling-lm' },
    { name: 'orca-mini', desc: 'Orca Mini - Multimodal model', url: 'https://ollama.com/library/orca-mini' },
    { name: 'phi', desc: 'Microsoft Phi - Small but powerful', url: 'https://ollama.com/library/phi' },
    { name: 'gemma', desc: 'Google Gemma - Efficient and fast', url: 'https://ollama.com/library/gemma' },
    { name: 'dolphin-mixtral', desc: 'Dolphin Mixtral - High quality', url: 'https://ollama.com/library/dolphin-mixtral' },
    { name: 'zephyr', desc: 'Zephyr - Fine-tuned chat model', url: 'https://ollama.com/library/zephyr' },
    { name: 'openchat', desc: 'OpenChat - Fast inference', url: 'https://ollama.com/library/openchat' },
  ];

  // Load library models on mount
  useEffect(() => {
    const loadLibraryModels = async () => {
      try {
        setSearching(true);
        setError(null);
        
        const response = await axios.get('/api/library/models');
        const models = response.data.models || popularModels;
        
        setLibraryModels(models);
        setSearchResults(models);
        setIsInitialLoad(false);
      } catch (err) {
        // Fallback to hardcoded popular models if API fails
        setLibraryModels(popularModels);
        setSearchResults(popularModels);
        setIsInitialLoad(false);
      } finally {
        setSearching(false);
      }
    };

    loadLibraryModels();
  }, []);

  // Handle search with proper state management

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      // Reset to all available models when search is cleared
      const installedNames = new Set(installedModels);
      const available = libraryModels.filter(m => 
        !installedNames.has(m.name) && 
        m.name // Ensure name exists
      );
      setSearchResults(available);
      return;
    }

    // Check cache first
    if (cachedResults.has(query)) {
      setSearchResults(cachedResults.get(query));
      return;
    }

    try {
      setSearching(true);
      setError(null);
      
      const installedNames = new Set(installedModels);
      const filtered = libraryModels.filter(m => {
        // Ensure required properties exist
        const name = m.name || '';
        const desc = m.desc || '';
        
        return (
          !installedNames.has(name) && 
          (name.toLowerCase().includes(query.toLowerCase()) || 
          desc.toLowerCase().includes(query.toLowerCase()))
        );
      });
      
      // Cache results to prevent reset issues
      setCachedResults(prev => new Map(prev.set(query, filtered)));
      setSearchResults(filtered);
    } catch (err) {
      setError('Failed to search models. Please try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [libraryModels, installedModels, cachedResults]);

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialLoad && searchQuery !== undefined) {
        handleSearch(searchQuery);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, isInitialLoad, handleSearch]);

  const handlePullModel = (modelName) => {
    setPullingModel(modelName);
  };

  const handlePullComplete = () => {
    setPullingModel(null);
    onModelAdded();
  };

  const handlePullClose = () => {
    setPullingModel(null);
  };

  // Prevent background refresh issues by using stable references
  const stableLibraryModels = libraryModels;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-shep-text-primary">Add Model</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
          
          {/* Search Form */}
          <form onSubmit={(e) => e.preventDefault()} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models... (e.g., llama, mistral, gemma)"
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shep-cyan-400 focus:border-transparent"
                disabled={searching || isInitialLoad}
              />
              <button
                type="button"
                onClick={() => handleSearch(searchQuery)}
                disabled={searching || isInitialLoad}
                className="px-6 py-3 bg-shep-indigo-600 text-white rounded-lg hover:bg-shep-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {searching ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </form>

          {/* Results */}
          {searchResults.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 mb-4">
                {searchQuery ? `${searchResults.length} models found` : `${searchResults.length} popular models available`}
              </p>
              {searchResults.map((model) => {
                const tags = variantData.get(model.name);
                const isLoadingTags = loadingVariants.has(model.name);
                const isRevealed = revealedVariants.has(model.name);
                const hasVariants = tags && tags.length > 0;
                const selectedTag = selectedVariants.get(model.name);

                const handlePullClick = () => {
                  if (!isRevealed) {
                    // First click: reveal variant selector (and fetch if needed)
                    setRevealedVariants(prev => new Set(prev).add(model.name));
                    fetchVariants(model.name);
                    return;
                  }
                  // Second+ click (or first click if no variants): pull with selected tag
                  if (hasVariants && selectedTag) {
                    handlePullModel(`${model.name}:${selectedTag}`);
                  } else if (!isLoadingTags) {
                    handlePullModel(model.name);
                  }
                };

                return (
                <div
                  key={model.name}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <a
                      href={model.url || `https://ollama.com/library/${model.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-shep-cyan-600 hover:text-shep-cyan-700 hover:underline"
                    >
                      {model.name}
                    </a>
                    <div className="flex items-center gap-2 mt-1">
                      {model.desc && <p className="text-sm text-slate-600">{model.desc}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {/* Variant dropdown — visible after first Pull click */}
                    {isRevealed && (
                      isLoadingTags ? (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Loading…
                        </span>
                      ) : hasVariants ? (
                        <select
                          value={selectedTag || ''}
                          onChange={(e) => setSelectedVariants(prev => new Map(prev).set(model.name, e.target.value))}
                          className="px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shep-cyan-400 focus:border-transparent bg-white"
                        >
                          {tags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      ) : null
                    )}
                    <button
                      onClick={handlePullClick}
                      disabled={isRevealed && isLoadingTags}
                      className="px-4 py-2 bg-shep-indigo-600 text-white rounded-lg hover:bg-shep-indigo-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Pull
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-slate-500">
                {searchQuery ? 'No results found. Try a different search.' : 'No more models available'}
              </p>
              <p className="text-slate-400 text-sm mt-2">
                Visit{' '}
                <a
                  href="https://ollama.com/library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-shep-cyan-600 hover:underline"
                >
                  ollama.com/library
                </a>
                {' '}for all available models
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pull Progress Modal */}
      {pullingModel && (
        <PullProgressModal
          modelName={pullingModel}
          onClose={handlePullClose}
          onComplete={handlePullComplete}
        />
      )}
    </div>
  );
}

export default SearchModal;