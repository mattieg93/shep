// src/lib/types.ts
export interface ModelVariant {
  name: string;
  parameters: string;
  memory?: string;
  contextWindow?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  variants: ModelVariant[];
  tags: string[];
  pulls: number;
  updated: string;
  category: string;
}

export interface FilterOptions {
  searchQuery?: string;
  selectedTags?: string[];
  minParameters?: string;
  maxParameters?: string;
  sortBy?: 'name' | 'pulls' | 'size';
  sortOrder?: 'asc' | 'desc';
}