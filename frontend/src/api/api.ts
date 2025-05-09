import axios from 'axios';
import {
  UploadResponse,
  FilterRanges,
  FilterResponse,
  BrandOverlapResponse,
  FilterRangeValues,
  KeywordFilterResponse,
} from '../types';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Upload files
export const uploadFiles = async (files: File[]): Promise<UploadResponse> => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await api.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// Apply filters
export const applyFilters = async (filterRanges: FilterRanges): Promise<FilterResponse> => {
  const response = await api.post<FilterResponse>('/filter', filterRanges);
  return response.data;
};

// Get brand overlap data
export const getBrandOverlap = async (): Promise<BrandOverlapResponse> => {
  const response = await api.get<BrandOverlapResponse>('/brand-overlap');
  return response.data;
};

// Get filter ranges
export const getFilterRanges = async (): Promise<FilterRangeValues> => {
  const response = await api.get<FilterRangeValues>('/filter-ranges');
  return response.data;
};

// Export filtered data
export const exportData = (): string => {
  return `${API_BASE_URL}/export`;
};

// Export unique keywords data
export const exportUniqueData = (): string => {
  return `${API_BASE_URL}/export-unique`;
};

// Filter by keyword
export const filterByKeyword = async (keyword: string): Promise<KeywordFilterResponse> => {
  const response = await api.post<KeywordFilterResponse>('/keyword-filter', { keyword });
  return response.data;
};

// Check API health
export const checkHealth = async (): Promise<{ status: string; service: string }> => {
  const response = await api.get<{ status: string; service: string }>('/health');
  return response.data;
};