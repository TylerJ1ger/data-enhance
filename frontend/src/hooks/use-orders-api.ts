//frontend/src/hooks/use-orders-api.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as ordersApi from '@/lib/api/orders-api';
import {
  VirtualDataGenerateResponse,
  OrderFilterRequest,
  OrderFilterResponse,
  OrderChartsResponse,
  OrderFilterRanges,
  OrderSummary,
  OrderStats,
} from '@/types/index';

export function useOrdersApi() {
  // 状态管理 - API 加载状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const [isLoadingRanges, setIsLoadingRanges] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // 状态管理 - 响应数据
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [filteredStats, setFilteredStats] = useState<OrderStats | null>(null);
  const [chartData, setChartData] = useState<OrderChartsResponse | null>(null);
  const [filterRanges, setFilterRanges] = useState<OrderFilterRanges | null>(null);
  const [summary, setSummary] = useState<OrderSummary | null>(null);

  // 在组件挂载时检查 API 健康状态
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await ordersApi.checkOrderApiHealth();
      } catch (error) {
        console.warn('订单API服务器连接检查失败:', error);
        // 注意：这里不显示toast，因为这是初始化检查
      }
    };

    checkApiHealth();
  }, []);

  // 生成虚拟订单数据
  const generateVirtualData = useCallback(async (count: number) => {
    setIsGenerating(true);
    try {
      const data = await ordersApi.generateVirtualOrders(count);
      
      if (data.success) {
        setOrderStats(data.stats);
        setFilteredStats(data.stats); // 初始时，过滤后数据 = 原始数据
        
        // 生成数据后，加载其他信息
        await Promise.all([
          fetchFilterRanges(),
          fetchChartData(),
          fetchSummary()
        ]);
        
        toast.success(data.message);
      } else {
        toast.error(data.message || '生成虚拟数据失败');
      }
      
      return data;
    } catch (error: any) {
      console.error('生成虚拟订单数据错误:', error);
      const errorMessage = error?.response?.data?.detail || '生成虚拟订单数据失败，请重试。';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // 应用筛选器
  const applyFilters = useCallback(async (filters: OrderFilterRequest) => {
    setIsFiltering(true);
    try {
      const data = await ordersApi.applyOrderFilters(filters);
      
      if (data.success) {
        setFilteredStats(data.filtered_stats);
        
        // 筛选后更新图表数据和摘要
        await Promise.all([
          fetchChartData(),
          fetchSummary()
        ]);
        
        toast.success(data.message);
      } else {
        toast.error(data.message || '应用筛选条件失败');
      }
      
      return data;
    } catch (error: any) {
      console.error('应用订单筛选条件错误:', error);
      const errorMessage = error?.response?.data?.detail || '应用订单筛选条件失败，请重试。';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsFiltering(false);
    }
  }, []);

  // 获取图表数据
  const fetchChartData = useCallback(async () => {
    setIsLoadingCharts(true);
    try {
      const data = await ordersApi.getOrderCharts();
      setChartData(data);
      return data;
    } catch (error: any) {
      console.error('获取订单图表数据错误:', error);
      // 图表数据获取失败时，设置一个错误状态而不是完全清空
      setChartData({
        charts: {} as any,
        error: '图表数据加载失败'
      });
      return null;
    } finally {
      setIsLoadingCharts(false);
    }
  }, []);

  // 获取筛选范围
  const fetchFilterRanges = useCallback(async () => {
    setIsLoadingRanges(true);
    try {
      const data = await ordersApi.getOrderFilterRanges();
      setFilterRanges(data);
      return data;
    } catch (error: any) {
      console.error('获取订单筛选范围错误:', error);
      // 设置默认的筛选范围，确保UI能正常显示
      setFilterRanges({
        date_range: {
          min: "2025-04-01",
          max: "2025-05-31"
        },
        sales_amount_range: {
          min: 0,
          max: 100
        },
        available_options: {
          order_types: ["新单", "续费"],
          license_ids: [1, 2, 3, 4, 5],
          currencies: ["usd", "cny", "eur"],
          payment_platforms: ["paypal", "stripe"],
          order_statuses: ["已付款", "已退款", "取消付款", "付款失败"]
        },
        error: '筛选范围加载失败，使用默认值'
      });
      return null;
    } finally {
      setIsLoadingRanges(false);
    }
  }, []);

  // 获取数据摘要
  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const data = await ordersApi.getOrderSummary();
      setSummary(data);
      return data;
    } catch (error: any) {
      console.error('获取订单数据摘要错误:', error);
      // 设置默认摘要状态
      setSummary({
        total_orders: 0,
        filtered_orders: 0,
        has_data: false,
        last_generation_params: {}
      });
      return null;
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // 获取导出 URL
  const getExportUrl = useCallback(() => {
    return ordersApi.exportOrderData();
  }, []);

  // 重置所有数据
  const resetData = useCallback(async () => {
    try {
      const data = await ordersApi.resetOrderData();
      
      if (data.success) {
        setOrderStats(null);
        setFilteredStats(null);
        setChartData(null);
        setFilterRanges(null);
        setSummary(null);
        
        toast.success(data.message);
      }
      
      return data;
    } catch (error: any) {
      console.error('重置订单数据错误:', error);
      const errorMessage = error?.response?.data?.detail || '重置订单数据失败，请重试。';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // 手动刷新所有数据
  const refreshAllData = useCallback(async () => {
    if (!summary?.has_data) {
      return;
    }

    try {
      await Promise.all([
        fetchFilterRanges(),
        fetchChartData(),
        fetchSummary()
      ]);
    } catch (error) {
      console.error('刷新数据失败:', error);
    }
  }, [summary?.has_data, fetchFilterRanges, fetchChartData, fetchSummary]);

  // 检查是否有数据
  const hasData = summary?.has_data || false;

  // 检查是否正在加载
  const isLoading = isGenerating || isFiltering || isLoadingCharts || isLoadingRanges || isLoadingSummary;

  return {
    // 状态
    isGenerating,
    isFiltering,
    isLoadingCharts,
    isLoadingRanges,
    isLoadingSummary,
    isLoading,
    hasData,
    orderStats,
    filteredStats,
    chartData,
    filterRanges,
    summary,
    
    // 操作
    generateVirtualData,
    applyFilters,
    fetchChartData,
    fetchFilterRanges,
    fetchSummary,
    refreshAllData,
    getExportUrl,
    resetData,
  };
}