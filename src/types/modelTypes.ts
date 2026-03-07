// src/types/modelTypes.ts
export interface Model {
  id: string;
  name: string;
  size_vram: number;
  status: string;
  description?: string;
}

export interface DaemonStatus {
  running: boolean;
  status: string;
  uptime?: string;
}

export interface UsageStats {
  loaded: boolean;
  vram: number;
  lastQuery: string;
  queryCount?: number;
}