// File statistics
export interface FileStats {
  filename: string;
  stats: DataStats;
}

// Data statistics
export interface DataStats {
  total_rows: number;
  keyword_count: number;
  unique_keywords: number;
  brands: string[];
  min_values: Record<string, number>;
  max_values: Record<string, number>;
}

// Upload response
export interface UploadResponse {
  file_stats: FileStats[];
  merged_stats: DataStats;
}

// Filter ranges
export interface FilterRanges {
  position_range?: [number, number];
  search_volume_range?: [number, number];
  keyword_difficulty_range?: [number, number];
  cpc_range?: [number, number];
  keyword_frequency_range?: [number, number]; // 新增关键词重复次数范围
}

// Filter response
export interface FilterResponse {
  filtered_stats: DataStats;
  keyword_counts: Record<string, number>;
}

// Brand overlap data
export interface BrandOverlapResponse {
  overlap_matrix: Record<string, Record<string, number>>;
  brand_stats: Record<string, BrandStats>;
}

// Brand statistics
export interface BrandStats {
  total_keywords: number;
  unique_keywords: number;
}

// Filter range values
export interface FilterRangeValues {
  position: [number, number];
  search_volume: [number, number];
  keyword_difficulty: [number, number];
  cpc: [number, number];
  keyword_frequency: [number, number]; // 新增关键词重复次数范围
}

// API error
export interface ApiError {
  detail: string;
}