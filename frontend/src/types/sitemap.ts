// Sitemap file statistics
export interface SitemapFileStats {
    filename: string;
    type: string;
    url_count: number;
    is_sitemap_index: boolean;
  }
  
  // Sitemap upload response
  export interface SitemapUploadResponse {
    file_stats: SitemapFileStats[];
    total_urls: number;
    top_level_domains: string[];
    url_structure: Record<string, number>;
  }
  
  // Sitemap filter request
  export interface SitemapFilterRequest {
    domain?: string;
    path?: string;
    depth?: number;
  }
  
  // Sitemap filter response
  export interface SitemapFilterResponse {
    filtered_urls: string[];
    total_filtered: number;
    url_hierarchy: any;
  }
  
  // Base node for tree visualization
  export interface TreeNode {
    name: string;
    path?: string;
    children?: TreeNode[];
    value?: number;
    isLeaf?: boolean;
  }
  
  // Graph node for graph visualization
  export interface GraphNode {
    id: number;
    name: string;
    category: number;
    symbolSize: number;
  }
  
  // Graph link for graph visualization
  export interface GraphLink {
    source: number;
    target: number;
  }
  
  // Visualization data for tree format
  export interface TreeVisualizationData {
    name: string;
    children: TreeNode[];
  }
  
  // Visualization data for graph format
  export interface GraphVisualizationData {
    nodes: GraphNode[];
    links: GraphLink[];
  }
  
  // Combined type for sitemap visualization data
  export type SitemapVisualizationData = TreeVisualizationData | GraphVisualizationData | { error: string };
  
  // URL pattern
  export interface UrlPattern {
    pattern: string;
    count: number;
    examples: string[];
  }
  
  // URL analysis results
  export interface SitemapAnalysisResponse {
    total_urls: number;
    domains: Record<string, number>;
    top_path_segments: Record<string, [string, number][]>;
    path_segment_counts: Record<string, number>;
    parameters: [string, number][];
    url_patterns?: UrlPattern[];
    visualization_data?: TreeVisualizationData;
    error?: string;
  }