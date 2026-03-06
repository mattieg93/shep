// src/lib/ollama-api.ts
export interface OllamaModel {
  name: string;
  size: {
    parameters?: string;
    memory?: string;
    contextWindow?: string;
  };
  variants: string[];
  description: string;
  tags: string[];
  pulls?: number;
  updated?: string;
}

export interface OllamaLibraryResponse {
  models: OllamaModel[];
}

// Parse raw API data into structured model objects
export function parseOllamaModels(rawData: any[]): OllamaModel[] {
  return rawData.map(item => ({
    name: item.name || '',
    size: {
      parameters: extractParameterSize(item.name, item.tags),
      memory: extractMemorySize(item.tags),
      contextWindow: extractContextWindow(item.tags)
    },
    variants: extractVariants(item.name, item.tags),
    description: item.description || '',
    tags: item.tags || [],
    pulls: item.pulls,
    updated: item.updated
  }));
}

// Extract parameter size from model name or tags
function extractParameterSize(name: string, tags: string[]): string | undefined {
  // Look for common parameter indicators in tags
  const paramTags = tags.filter(tag => 
    tag.match(/(\d+(?:\.\d+)?[b|B|m|M])/) || 
    ['8b', '70b', '405b', '1.5b', '7b', '14b', '32b', '72b', '110b', '123b'].includes(tag)
  );
  
  // Return first parameter size found
  return paramTags[0] || undefined;
}

// Extract memory usage from tags
function extractMemorySize(tags: string[]): string | undefined {
  const memoryTags = tags.filter(tag => 
    tag.match(/\d+(?:\.\d+)?[m|M]/) && !tag.includes('b') && !tag.includes('B')
  );
  
  return memoryTags[0] || undefined;
}

// Extract context window from tags
function extractContextWindow(tags: string[]): string | undefined {
  const contextTags = tags.filter(tag => 
    tag.includes('k') || tag.includes('K') || tag.includes('tokens') || tag.includes('context')
  );
  
  return contextTags[0] || undefined;
}

// Extract model variants from tags
function extractVariants(name: string, tags: string[]): string[] {
  // Common variants that appear in the data
  const variantIndicators = ['8b', '70b', '405b', '1.5b', '7b', '14b', '32b', '72b', '110b', 
                             '1b', '3b', '13b', '34b', '27b', '35b', '123b', '24b', '9b', '27b',
                             '3.8b', '1.8b', '1.7b', '300m', '2.7b', '135m', '360m'];
  
  return tags.filter(tag => variantIndicators.includes(tag));
}

// Get model by name
export function getModelByName(models: OllamaModel[], name: string): OllamaModel | undefined {
  return models.find(model => model.name === name);
}

// Filter models by tag
export function filterModelsByTag(models: OllamaModel[], tag: string): OllamaModel[] {
  return models.filter(model => model.tags.includes(tag));
}

// Sort models by parameter size
export function sortModelsBySize(models: OllamaModel[]): OllamaModel[] {
  return [...models].sort((a, b) => {
    const aSize = parseSize(a.size.parameters);
    const bSize = parseSize(b.size.parameters);
    return bSize - aSize;
  });
}

// Parse size string to number for sorting
function parseSize(sizeStr: string | undefined): number {
  if (!sizeStr) return 0;
  
  // Remove non-numeric characters except decimal point
  const numericPart = sizeStr.replace(/[^\d.]/g, '');
  const multiplier = sizeStr.toLowerCase().includes('b') ? 1000000000 : 
                    sizeStr.toLowerCase().includes('m') ? 1000000 : 1;
  
  return parseFloat(numericPart) * multiplier;
}