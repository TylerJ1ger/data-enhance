import axios from 'axios';
import {
  SEOUploadResponse,
  SEOCategory,
} from '../types/seo';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Upload HTML file for SEO analysis
export const uploadSEOFile = async (file: File): Promise<SEOUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<SEOUploadResponse>('/seo/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// Get all SEO categories
export const getSEOCategories = async (): Promise<{ categories: SEOCategory[] }> => {
  const response = await api.get<{ categories: SEOCategory[] }>('/seo/categories');
  return response.data;
};

// Check API health
export const checkHealth = async (): Promise<{ status: string; service: string }> => {
  const response = await api.get<{ status: string; service: string }>('/health');
  return response.data;
};