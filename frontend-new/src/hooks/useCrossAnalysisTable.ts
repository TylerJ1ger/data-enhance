// frontend-new/src/hooks/useCrossAnalysisTable.ts
import { useState, useMemo } from 'react';
import { getDomainFromUrl, sortItems, filterByText } from '@/lib/utils';

interface CrossAnalysisResult {
  page_ascore: number;
  source_title: string;
  source_url: string;
  target_url: string;
  anchor: string;
  nofollow: boolean;
}

interface Domain {
  domain: string;
  ascore: number;
}

type SortColumn = keyof CrossAnalysisResult;
type SortDirection = 'asc' | 'desc';
type DisplayMode = 'flat' | 'compare';
type CellDisplayType = 'target_url' | 'source_title' | 'source_url' | 'anchor' | 'nofollow';
type CompareSort = 'ascore' | 'domain';

interface UseCrossAnalysisTableProps {
  results: CrossAnalysisResult[];
  domainData?: Domain[];
}

interface ComparisonData {
  domains: {
    domain: string;
    ascore: number;
    targets: (CrossAnalysisResult | null)[];
  }[];
  targetDomains: string[];
}

export function useCrossAnalysisTable({ results, domainData = [] }: UseCrossAnalysisTableProps) {
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 其他状态
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('page_ascore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('flat');
  const [cellDisplayType, setCellDisplayType] = useState<CellDisplayType>('target_url');
  const [compareSort, setCompareSort] = useState<CompareSort>('ascore');
  const [compareSortDirection, setCompareSortDirection] = useState<SortDirection>('desc');
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 筛选结果 - 使用优化后的filterByText函数
  const filteredResults = useMemo(() => {
    if (!results) return [];
    
    return filterByText(
      results,
      searchTerm,
      ['source_url', 'target_url', 'source_title', 'anchor']
    );
  }, [results, searchTerm]);

  // 排序后的结果 - 使用优化后的sortItems函数
  const sortedResults = useMemo(() => {
    if (!filteredResults.length) return [];
    
    return sortItems(filteredResults, sortColumn, sortDirection);
  }, [filteredResults, sortColumn, sortDirection]);

  // 计算分页数据
  const paginatedResults = useMemo(() => {
    if (itemsPerPage === -1) {
      return sortedResults;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedResults.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedResults, currentPage, itemsPerPage]);

  // 计算总页数
  const pageCount = useMemo(() => {
    if (itemsPerPage === -1) return 1;
    return Math.max(1, Math.ceil(sortedResults.length / itemsPerPage));
  }, [sortedResults.length, itemsPerPage]);

  // 为对比视图处理数据 - 使用getDomainFromUrl替代原extractRootDomain
  const comparisonData = useMemo<ComparisonData>(() => {
    // 从结果中提取所有唯一的目标域名
    const targetDomains = new Set<string>();
    
    // 解析每个结果的目标域名
    results.forEach(result => {
      const targetDomain = getDomainFromUrl(result.target_url, true); // 使用优化后的函数，提取根域名
      targetDomains.add(targetDomain);
    });
    
    // 创建源域名到结果的映射
    const sourceToTargets = new Map<string, Map<string, CrossAnalysisResult>>();
    
    // 处理每个结果，填充映射
    results.forEach(result => {
      const sourceDomain = getDomainFromUrl(result.source_url, true); // 使用优化后的函数
      const targetDomain = getDomainFromUrl(result.target_url, true); // 使用优化后的函数
      
      if (!sourceToTargets.has(sourceDomain)) {
        sourceToTargets.set(sourceDomain, new Map());
      }
      
      const targetsMap = sourceToTargets.get(sourceDomain)!;
      
      // 如果这个目标域名还没有结果，或者新结果的权重更高，则更新
      if (!targetsMap.has(targetDomain) || 
          result.page_ascore > targetsMap.get(targetDomain)!.page_ascore) {
        targetsMap.set(targetDomain, result);
      }
    });
    
    // 定义域名数据集
    let domainsWithScores: {domain: string, ascore: number}[] = [];
    
    // 如果提供了域名数据，使用它
    if (domainData && domainData.length > 0) {
      domainsWithScores = domainData;
    } else {
      // 否则，从结果中提取域名和尝试找到权重
      Array.from(sourceToTargets.keys()).forEach(domain => {
        // 尝试找到这个域名的示例结果，获取权重
        const exampleResult = Array.from(sourceToTargets.get(domain)!.values())[0];
        domainsWithScores.push({
          domain,
          ascore: exampleResult ? exampleResult.page_ascore : 0
        });
      });
    }
    
    // 排序域名 - 可以使用sortItems但这里保留原有逻辑保持简单
    const sortedDomains = [...domainsWithScores].sort((a, b) => {
      if (compareSort === 'ascore') {
        return compareSortDirection === 'asc' 
          ? a.ascore - b.ascore 
          : b.ascore - a.ascore;
      } else {
        return compareSortDirection === 'asc'
          ? a.domain.localeCompare(b.domain)
          : b.domain.localeCompare(a.domain);
      }
    });
    
    // 排序目标域名
    const sortedTargetDomains = Array.from(targetDomains).sort();
    
    // 构建最终的表格数据
    return {
      domains: sortedDomains.map(({domain, ascore}) => ({
        domain,
        ascore,
        targets: sortedTargetDomains.map(targetDomain => {
          if (!sourceToTargets.has(domain)) return null;
          return sourceToTargets.get(domain)!.get(targetDomain) || null;
        })
      })),
      targetDomains: sortedTargetDomains
    };
  }, [results, domainData, compareSort, compareSortDirection]);

  // 分页对比视图数据
  const paginatedComparisonData = useMemo(() => {
    if (!comparisonData || !comparisonData.domains) return comparisonData;
    
    if (itemsPerPage === -1) return comparisonData;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedDomains = comparisonData.domains.slice(startIndex, startIndex + itemsPerPage);
    
    return {
      ...comparisonData,
      domains: paginatedDomains
    };
  }, [comparisonData, currentPage, itemsPerPage]);

  // 处理分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理排序逻辑
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // 处理对比视图排序
  const handleCompareSort = (column: CompareSort) => {
    if (compareSort === column) {
      setCompareSortDirection(compareSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCompareSort(column);
      setCompareSortDirection('desc');
    }
  };

  // 处理每页显示数量变化
  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // 重置到第一页
  };

  // 获取要显示的单元格值
  const getCellValue = (result: CrossAnalysisResult | null, type: CellDisplayType) => {
    if (!result) return "None";
    
    switch(type) {
      case 'target_url':
        return result.target_url;
      case 'source_title':
        return result.source_title || "无标题";
      case 'source_url':
        return result.source_url;
      case 'anchor':
        return result.anchor || "无锚文本";
      case 'nofollow':
        return result.nofollow ? "是" : "否";
      default:
        return result.target_url;
    }
  };

  // 获取排序图标
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // 获取对比视图排序图标
  const getCompareSortIcon = (column: CompareSort) => {
    if (compareSort !== column) return null;
    return compareSortDirection === 'asc' ? '↑' : '↓';
  };

  return {
    // 分页相关
    currentPage,
    setCurrentPage,
    itemsPerPage,
    pageCount,
    handlePageChange,
    handleItemsPerPageChange,
    
    // 排序和筛选
    searchTerm,
    setSearchTerm,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    handleSort,
    getSortIcon,
    
    // 显示模式
    displayMode,
    setDisplayMode,
    cellDisplayType,
    setCellDisplayType,
    
    // 对比视图
    compareSort,
    setCompareSort,
    compareSortDirection,
    setCompareSortDirection,
    handleCompareSort,
    getCompareSortIcon,
    
    // 数据
    filteredResults,
    sortedResults,
    paginatedResults,
    comparisonData,
    paginatedComparisonData,
    
    // UI状态
    filterExpanded,
    setFilterExpanded,
    isFullscreen,
    setIsFullscreen,
    
    // 工具函数
    getCellValue
  };
}