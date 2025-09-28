//frontend-new/src/hooks/use-backlink-api.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as api from '@/lib/api/backlink-api';
import {
  BacklinkUploadResponse,
  BacklinkFilterRanges,
  BacklinkFilterResponse,
  BrandDomainOverlapResponse,
  BacklinkFilterRangeValues,
  FileStats,
  BacklinkDataStats,
  DomainFilterResponse,
} from '@/types';

// 定义域名数据接口
interface Domain {
  domain: string;
  ascore: number;
}

// 定义导出参数接口
interface ExportParams {
  displayMode: 'flat' | 'compare';
  searchTerm: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  comparisonData?: any;
  cellDisplayType?: string;
}

export function useBacklinkApi() {
  // 请求状态
  const [isUploading, setIsUploading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOverlap, setIsLoadingOverlap] = useState(false);
  const [isLoadingRanges, setIsLoadingRanges] = useState(false);
  const [isLoadingDomainFilter, setIsLoadingDomainFilter] = useState(false);

  // 数据状态
  const [fileStats, setFileStats] = useState<FileStats[]>([]);
  const [mergedStats, setMergedStats] = useState<BacklinkDataStats | null>(null);
  const [filteredStats, setFilteredStats] = useState<BacklinkDataStats | null>(null);
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({});
  const [brandOverlapData, setBrandOverlapData] = useState<BrandDomainOverlapResponse | null>(null);
  const [domainFilterResults, setDomainFilterResults] = useState<DomainFilterResponse | null>(null);
  const [filterRanges, setFilterRanges] = useState<BacklinkFilterRangeValues>({
    domain_ascore: [0, 100],
    backlinks: [0, 1000],
    domain_frequency: [1, 100],
  });

  // 外链列表状态
  const [isLoadingBacklinkList, setIsLoadingBacklinkList] = useState(false);
  const [backlinkListData, setBacklinkListData] = useState<{backlinks: any[], total_count: number}>({
    backlinks: [],
    total_count: 0
  });

  // 交叉分析状态
  const [isCrossAnalysisFirstRound, setIsCrossAnalysisFirstRound] = useState(false);
  const [isCrossAnalysisSecondRound, setIsCrossAnalysisSecondRound] = useState(false);
  const [crossAnalysisFirstRoundComplete, setCrossAnalysisFirstRoundComplete] = useState(false);
  const [crossAnalysisSecondRoundComplete, setCrossAnalysisSecondRoundComplete] = useState(false);
  const [crossAnalysisResults, setCrossAnalysisResults] = useState<any[]>([]);
  const [domainData, setDomainData] = useState<Domain[]>([]); // 新增：存储域名数据

  // 组件挂载时检查API健康状态
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await api.checkBacklinkHealth();
      } catch (error) {
        toast.error('无法连接到API。请检查后端服务器是否正在运行。');
      }
    };

    checkApiHealth();
  }, []);

  // 上传文件
  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const data = await api.uploadBacklinkFiles(files);
      setFileStats(data.file_stats);
      setMergedStats(data.merged_stats);
      setFilteredStats(data.merged_stats); // 初始时，过滤结果等于合并结果
      
      // 加载初始筛选范围
      await fetchFilterRanges();
      
      // 加载初始品牌重叠数据
      await fetchBrandOverlap();

      // 加载外链列表数据
      await fetchBacklinksList();

      toast.success(`成功处理 ${files.length} 个文件`);
      
      return data;
    } catch (error) {
      console.error('上传文件时出错:', error);
      toast.error('上传文件失败。请重试。');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 应用筛选条件
  const applyFilters = useCallback(async (filters: BacklinkFilterRanges) => {
    setIsFiltering(true);
    try {
      const data = await api.applyBacklinkFilters(filters);
      setFilteredStats(data.filtered_stats);
      setDomainCounts(data.domain_counts);
      
      // 筛选后更新品牌重叠数据
      await fetchBrandOverlap();

      // 筛选后更新外链列表
      await fetchBacklinksList();

      toast.success('筛选条件应用成功');

      return data;
    } catch (error) {
      console.error('应用筛选条件时出错:', error);
      toast.error('应用筛选条件失败。请重试。');
      throw error;
    } finally {
      setIsFiltering(false);
    }
  }, []);

  // 获取品牌重叠数据
  const fetchBrandOverlap = useCallback(async () => {
    setIsLoadingOverlap(true);
    try {
      const data = await api.getBacklinkBrandOverlap();
      setBrandOverlapData(data);
      return data;
    } catch (error) {
      console.error('获取品牌重叠数据时出错:', error);
      // 这是后台操作，不显示toast提示
      return null;
    } finally {
      setIsLoadingOverlap(false);
    }
  }, []);

  // 获取筛选范围
  const fetchFilterRanges = useCallback(async () => {
    setIsLoadingRanges(true);
    try {
      const data = await api.getBacklinkFilterRanges();
      setFilterRanges(data);
      return data;
    } catch (error) {
      console.error('获取筛选范围时出错:', error);
      // 这是后台操作，不显示toast提示
      return null;
    } finally {
      setIsLoadingRanges(false);
    }
  }, []);

  // 获取外链列表
  const fetchBacklinksList = useCallback(async () => {
    setIsLoadingBacklinkList(true);
    try {
      const data = await api.getBacklinksList();
      setBacklinkListData(data);
      return data;
    } catch (error) {
      console.error('获取外链列表时出错:', error);
      // 这是后台操作，不显示toast提示
      return null;
    } finally {
      setIsLoadingBacklinkList(false);
    }
  }, []);

  // 按域名筛选
  const filterByDomain = useCallback(async (domain: string) => {
    setIsLoadingDomainFilter(true);
    try {
      const data = await api.filterByDomain(domain);
      setDomainFilterResults(data);
      
      if (data.results.length === 0) {
        toast.info(`未找到匹配域名 "${domain}" 的数据`);
      } else {
        toast.success(`找到 ${data.results.length} 个品牌下的域名 "${domain}" 数据`);
      }
      
      return data;
    } catch (error) {
      console.error('按域名筛选时出错:', error);
      toast.error('筛选域名失败，请重试');
      return null;
    } finally {
      setIsLoadingDomainFilter(false);
    }
  }, []);

  // 获取导出URL
  const getExportUrl = useCallback(async () => {
    try {
      // 假设导出URL是异步获取的
      return await api.exportBacklinkData();
    } catch (error) {
      console.error('获取导出URL失败:', error);
      toast.error('获取导出URL失败，请重试');
      return '';
    }
  }, []);

  // 获取唯一数据导出URL
  const getExportUniqueUrl = useCallback(async () => {
    try {
      // 假设导出URL是异步获取的
      return await api.exportUniqueBacklinkData();
    } catch (error) {
      console.error('获取唯一数据导出URL失败:', error);
      toast.error('获取导出URL失败，请重试');
      return '';
    }
  }, []);

  // 重置所有数据
  const resetData = useCallback(() => {
    setFileStats([]);
    setMergedStats(null);
    setFilteredStats(null);
    setDomainCounts({});
    setBrandOverlapData(null);
    setDomainFilterResults(null);
    setBacklinkListData({ backlinks: [], total_count: 0 });
    setFilterRanges({
      domain_ascore: [0, 100],
      backlinks: [0, 1000],
      domain_frequency: [1, 100],
    });
  }, []);

  // 第一轮上传函数
  const uploadCrossAnalysisFirstRound = useCallback(async (files: File[]) => {
    setIsCrossAnalysisFirstRound(true);
    try {
      const data = await api.uploadCrossAnalysisFirstRound(files);
      setCrossAnalysisFirstRoundComplete(true);
      
      // 存储域名数据
      if (data.domains_data) {
        setDomainData(data.domains_data);
      }
      
      toast.success(`成功处理第一轮文件`);
      return data;
    } catch (error) {
      console.error('第一轮上传文件时出错:', error);
      toast.error('上传第一轮文件失败。请重试。');
      throw error;
    } finally {
      setIsCrossAnalysisFirstRound(false);
    }
  }, []);

  // 第二轮上传函数
  const uploadCrossAnalysisSecondRound = useCallback(async (files: File[]) => {
    setIsCrossAnalysisSecondRound(true);
    try {
      const data = await api.uploadCrossAnalysisSecondRound(files);
      setCrossAnalysisResults(data.results);
      
      // 如果第二轮也返回了域名数据，更新它
      if (data.domains_data) {
        setDomainData(data.domains_data);
      }
      
      setCrossAnalysisSecondRoundComplete(true);
      toast.success(`成功处理第二轮文件，发现 ${data.results.length} 条匹配记录`);
      return data;
    } catch (error) {
      console.error('第二轮上传文件时出错:', error);
      toast.error('上传第二轮文件失败。请重试。');
      throw error;
    } finally {
      setIsCrossAnalysisSecondRound(false);
    }
  }, []);

  // 导出交叉分析结果 - 更新版本
  const exportCrossAnalysisResults = useCallback(async (params: ExportParams) => {
    try {
      // 如果是对比视图且有比较数据，使用POST请求
      if (params.displayMode === 'compare' && params.comparisonData) {
        // 创建导出数据对象，注意参数名称与后端一致
        const exportData = {
          display_mode: params.displayMode,
          search_term: params.searchTerm,
          sort_column: params.sortColumn,
          sort_direction: params.sortDirection,
          cell_display_type: params.cellDisplayType,
          comparison_data: params.comparisonData
        };
        
        // 使用POST请求
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/backlink/cross-analysis/export-filtered`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(exportData)
        });
        
        if (!response.ok) {
          throw new Error(`导出失败: ${response.statusText}`);
        }
        
        // 获取blob数据
        const blob = await response.blob();
        
        // 创建下载链接
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'cross_analysis_comparison.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        // 返回一个空URL，因为我们已经处理了下载
        return '';
      } else {
        // 平铺视图使用GET请求
        // 构建查询参数，注意参数名称与后端一致
        const queryParams = new URLSearchParams();
        queryParams.append('display_mode', params.displayMode);
        queryParams.append('search_term', params.searchTerm);
        queryParams.append('sort_column', params.sortColumn);
        queryParams.append('sort_direction', params.sortDirection);
        
        if (params.cellDisplayType) {
          queryParams.append('cell_display_type', params.cellDisplayType);
        }
        
        // 返回完整URL，让调用者打开
        return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/backlink/cross-analysis/export?${queryParams.toString()}`;
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
      return '';
    }
  }, []);

  // 重置交叉分析状态
  const resetCrossAnalysis = useCallback(() => {
    setCrossAnalysisFirstRoundComplete(false);
    setCrossAnalysisSecondRoundComplete(false);
    setCrossAnalysisResults([]);
    setDomainData([]); // 重置域名数据
  }, []);

  return {
    // 状态
    isUploading,
    isFiltering,
    isLoadingOverlap,
    isLoadingRanges,
    isLoadingDomainFilter,
    isLoadingBacklinkList,
    fileStats,
    mergedStats,
    filteredStats,
    domainCounts,
    brandOverlapData,
    domainFilterResults,
    backlinkListData,
    filterRanges,
    
    // 操作
    uploadFiles,
    applyFilters,
    fetchBrandOverlap,
    fetchFilterRanges,
    filterByDomain,
    getExportUrl,
    getExportUniqueUrl,
    resetData,

    // 交叉分析相关
    isCrossAnalysisFirstRound,
    isCrossAnalysisSecondRound,
    crossAnalysisFirstRoundComplete,
    crossAnalysisSecondRoundComplete,
    crossAnalysisResults,
    domainData, // 暴露域名数据
    uploadCrossAnalysisFirstRound,
    uploadCrossAnalysisSecondRound,
    exportCrossAnalysisResults,
    resetCrossAnalysis,
  };
}