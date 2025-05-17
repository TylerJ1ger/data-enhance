// frontend-new/src/hooks/useCrossAnalysisTable.ts
import { useState, useMemo, useRef, useEffect } from 'react';

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

// 域名提取函数
export const extractRootDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // 处理IP地址的情况
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return hostname;
    }
    
    // 提取域名部分
    const hostParts = hostname.split('.');
    
    // 如果只有两部分(如example.com)，直接返回
    if (hostParts.length <= 2) {
      return hostname;
    }
    
    // 常见的顶级域名
    const commonTLDs = [
      'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co', 'ai', 'app',
      'dev', 'me', 'info', 'biz', 'tv', 'us', 'uk', 'cn', 'jp', 'de', 'fr'
    ];
    
    // 检查是否有多级顶级域名，如co.uk, com.au等
    const lastPart = hostParts[hostParts.length - 1];
    const secondLastPart = hostParts[hostParts.length - 2];
    
    // 处理常见的二级顶级域名
    if (
      (secondLastPart === 'co' || secondLastPart === 'com' || secondLastPart === 'org' || secondLastPart === 'gov') && 
      lastPart.length === 2 // 国家代码通常是2个字符
    ) {
      // 如果是形如 example.co.uk 的情况，我们想要返回 example.co.uk
      if (hostParts.length <= 3) {
        return hostname;
      }
      // 否则,形如 subdomain.example.co.uk，我们想要返回 example.co.uk
      return `${hostParts[hostParts.length - 3]}.${secondLastPart}.${lastPart}`;
    }
    
    // 其他情况，返回主域名和TLD，如subdomain.example.com返回example.com
    if (commonTLDs.includes(lastPart)) {
      return `${hostParts[hostParts.length - 2]}.${lastPart}`;
    }
    
    // 对于不常见的TLD，可能是多段式的，如example.something.ai
    // 在没有更复杂的规则的情况下，默认返回最后两段
    return `${hostParts[hostParts.length - 2]}.${lastPart}`;
    
  } catch (e) {
    // 如果URL解析失败，尝试从字符串中提取类似域名的部分
    const domainMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    if (domainMatch && domainMatch[1]) {
      return domainMatch[1].toLowerCase();
    }
    return url.toLowerCase();
  }
};

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
  
  // 表格列宽管理相关
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    page_ascore: 100,
    source_title: 200,
    source_url: 200,
    target_url: 200,
    anchor: 150,
    nofollow: 100,
    domain: 150
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartPosition = useRef<number>(0);
  const initialWidth = useRef<number>(0);

  // 筛选结果
  const filteredResults = useMemo(() => {
    if (!results) return [];
    
    return results.filter(result => {
      const searchLower = searchTerm.toLowerCase();
      return (
        result.source_url.toLowerCase().includes(searchLower) ||
        result.target_url.toLowerCase().includes(searchLower) ||
        (result.source_title && result.source_title.toLowerCase().includes(searchLower)) ||
        (result.anchor && result.anchor.toLowerCase().includes(searchLower))
      );
    });
  }, [results, searchTerm]);

  // 排序后的结果
  const sortedResults = useMemo(() => {
    if (!filteredResults) return [];
    
    return [...filteredResults].sort((a, b) => {
      const valueA = a[sortColumn];
      const valueB = b[sortColumn];
      
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      } else {
        const strA = String(valueA || '').toLowerCase();
        const strB = String(valueB || '').toLowerCase();
        return sortDirection === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      }
    });
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

  // 为对比视图处理数据
  const comparisonData = useMemo<ComparisonData>(() => {
    // 从结果中提取所有唯一的目标域名
    const targetDomains = new Set<string>();
    
    // 解析每个结果的目标域名
    results.forEach(result => {
      const targetDomain = extractRootDomain(result.target_url);
      targetDomains.add(targetDomain);
    });
    
    // 创建源域名到结果的映射
    const sourceToTargets = new Map<string, Map<string, CrossAnalysisResult>>();
    
    // 处理每个结果，填充映射
    results.forEach(result => {
      const sourceDomain = extractRootDomain(result.source_url);
      const targetDomain = extractRootDomain(result.target_url);
      
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
    
    // 排序域名
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

  // 列宽调整函数
  const startColumnResizing = (
    e: React.MouseEvent<HTMLDivElement>,
    columnName: string
  ) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件传播，避免触发其他点击事件
    
    setIsResizing(true);
    setResizingColumn(columnName);
    resizeStartPosition.current = e.clientX;
    initialWidth.current = columnWidths[columnName] || 100;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isResizing && resizingColumn) {
        moveEvent.preventDefault(); // 防止选中文本
        const delta = moveEvent.clientX - resizeStartPosition.current;
        const newWidth = Math.max(60, initialWidth.current + delta); // 最小宽度60px
        
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth
        }));
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // 确保移除之前添加的事件监听器，防止多次绑定
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // 添加新的事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
    
    // 列宽调整
    columnWidths,
    isResizing,
    resizingColumn,
    startColumnResizing,
    
    // 工具函数
    getCellValue
  };
}