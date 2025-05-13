// frontend/src/api/backlink-api.ts
import axios from 'axios';
import {
  BacklinkUploadResponse,
  BacklinkFilterRanges,
  BacklinkFilterResponse,
  BrandDomainOverlapResponse,
  BacklinkFilterRangeValues,
  DomainFilterResponse,
} from '../types';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Upload files
export const uploadBacklinkFiles = async (files: File[]): Promise<BacklinkUploadResponse> => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await api.post<BacklinkUploadResponse>('/backlink/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// Apply filters
export const applyBacklinkFilters = async (filterRanges: BacklinkFilterRanges): Promise<BacklinkFilterResponse> => {
  const response = await api.post<BacklinkFilterResponse>('/backlink/filter', filterRanges);
  return response.data;
};

// Get brand overlap data
export const getBacklinkBrandOverlap = async (): Promise<BrandDomainOverlapResponse> => {
  const response = await api.get<BrandDomainOverlapResponse>('/backlink/brand-overlap');
  return response.data;
};

// Get filter ranges
export const getBacklinkFilterRanges = async (): Promise<BacklinkFilterRangeValues> => {
  const response = await api.get<BacklinkFilterRangeValues>('/backlink/filter-ranges');
  return response.data;
};

// Export filtered data
export const exportBacklinkData = (): string => {
  return `${API_BASE_URL}/backlink/export`;
};

// Export unique domains data
export const exportUniqueBacklinkData = (): string => {
  return `${API_BASE_URL}/backlink/export-unique`;
};

// Filter by domain
export const filterByDomain = async (domain: string): Promise<DomainFilterResponse> => {
  const response = await api.post<DomainFilterResponse>('/backlink/domain-filter', { domain });
  return response.data;
};

// Check API health
export const checkBacklinkHealth = async (): Promise<{ status: string; service: string }> => {
  const response = await api.get<{ status: string; service: string }>('/health');
  return response.data;
};