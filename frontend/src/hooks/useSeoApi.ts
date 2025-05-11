import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as seoApi from '../api/seo-api';
import {
  SEOUploadResponse,
  SEOCategory,
  SEOIssue
} from '../types/seo';

export const useSeoApi = () => {
  // State for API data
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  
  // State for response data
  const [analysisResults, setAnalysisResults] = useState<SEOUploadResponse | null>(null);
  const [categories, setCategories] = useState<SEOCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredIssues, setFilteredIssues] = useState<{
    issues: SEOIssue[];
    warnings: SEOIssue[];
    opportunities: SEOIssue[];
  }>({
    issues: [],
    warnings: [],
    opportunities: []
  });

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Update filtered issues when category changes
  useEffect(() => {
    if (!analysisResults) return;
    
    if (!selectedCategory) {
      setFilteredIssues(analysisResults.issues);
      return;
    }
    
    const filtered = {
      issues: analysisResults.issues.issues.filter(issue => issue.category === selectedCategory),
      warnings: analysisResults.issues.warnings.filter(issue => issue.category === selectedCategory),
      opportunities: analysisResults.issues.opportunities.filter(issue => issue.category === selectedCategory)
    };
    
    setFilteredIssues(filtered);
  }, [selectedCategory, analysisResults]);

  // Upload HTML file
  const uploadSEOFile = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const data = await seoApi.uploadSEOFile(file);
      setAnalysisResults(data);
      setFilteredIssues(data.issues);
      
      const totalIssues = data.issues_count.issues + 
                         data.issues_count.warnings + 
                         data.issues_count.opportunities;
      
      toast.success(`分析完成! 发现 ${totalIssues} 个SEO相关问题`);
      
      return data;
    } catch (error) {
      console.error('Error uploading HTML file:', error);
      toast.error('上传HTML文件失败，请重试');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const data = await seoApi.getSEOCategories();
      setCategories(data.categories);
      return data.categories;
    } catch (error) {
      console.error('Error fetching SEO categories:', error);
      // No need to show toast for this
      return [];
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Reset data
  const resetData = useCallback(() => {
    setAnalysisResults(null);
    setSelectedCategory(null);
    setFilteredIssues({
      issues: [],
      warnings: [],
      opportunities: []
    });
  }, []);

  return {
    // State
    isUploading,
    isLoadingCategories,
    analysisResults,
    categories,
    selectedCategory,
    filteredIssues,
    
    // Actions
    uploadSEOFile,
    fetchCategories,
    setSelectedCategory,
    resetData,
  };
};