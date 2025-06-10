/**
 * 离线操作管理器
 * 管理网络状态检测和离线操作缓存
 */

import { dataSyncService } from '../sync/data-sync-service';
import { indexedDBManager } from '../db/indexeddb-manager';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

interface OfflineOperation {
  id: string;
  operation: string;
  params: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

class OfflineManager {
  private networkStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0
  };

  private offlineQueue: OfflineOperation[] = [];
  private isProcessingQueue = false;
  private networkCheckInterval: NodeJS.Timeout | null = null;
  private readonly QUEUE_PROCESS_INTERVAL = 5000; // 5秒检查一次离线队列
  private readonly MAX_RETRY_COUNT = 3;

  constructor() {
    this.initializeNetworkMonitoring();
    this.startQueueProcessor();
  }

  /**
   * 初始化网络监控
   */
  private initializeNetworkMonitoring(): void {
    // 监听网络状态变化
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // 获取网络连接信息（如果支持）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.updateNetworkStatus(connection);
      
      connection.addEventListener('change', () => {
        this.updateNetworkStatus(connection);
      });
    }

    // 定期检查网络状态
    this.networkCheckInterval = setInterval(() => {
      this.checkNetworkStatus();
    }, 10000); // 每10秒检查一次
  }

  /**
   * 更新网络状态
   */
  private updateNetworkStatus(connection?: any): void {
    this.networkStatus = {
      isOnline: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0
    };
  }

  /**
   * 检查网络状态
   */
  private async checkNetworkStatus(): Promise<void> {
    try {
      // 尝试请求后端健康检查接口
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiBaseUrl}/v1/keystore/health`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        if (!this.networkStatus.isOnline) {
          this.handleOnline();
        }
      } else {
        if (this.networkStatus.isOnline) {
          this.handleOffline();
        }
      }
    } catch (error) {
      if (this.networkStatus.isOnline) {
        this.handleOffline();
      }
    }
  }

  /**
   * 处理网络连接
   */
  private handleOnline(): void {
    console.log('Network connection restored');
    this.networkStatus.isOnline = true;
    
    // 网络恢复后立即处理离线队列
    this.processOfflineQueue();
    
    // 触发数据同步
    dataSyncService.performFullSync().catch(console.error);
    
    // 发布网络状态变化事件
    this.dispatchNetworkEvent('online');
  }

  /**
   * 处理网络断开
   */
  private handleOffline(): void {
    console.log('Network connection lost');
    this.networkStatus.isOnline = false;
    
    // 发布网络状态变化事件
    this.dispatchNetworkEvent('offline');
  }

  /**
   * 发布网络状态变化事件
   */
  private dispatchNetworkEvent(type: 'online' | 'offline'): void {
    const event = new CustomEvent(`network-${type}`, {
      detail: { networkStatus: this.networkStatus }
    });
    window.dispatchEvent(event);
  }

  /**
   * 获取当前网络状态
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * 检查是否在线
   */
  isOnline(): boolean {
    return this.networkStatus.isOnline;
  }

  /**
   * 检查网络质量
   */
  getNetworkQuality(): 'good' | 'fair' | 'poor' | 'unknown' {
    if (!this.networkStatus.isOnline) {
      return 'poor';
    }

    const effectiveType = this.networkStatus.effectiveType;
    switch (effectiveType) {
      case '4g':
        return 'good';
      case '3g':
        return 'fair';
      case '2g':
      case 'slow-2g':
        return 'poor';
      default:
        return 'unknown';
    }
  }

  /**
   * 添加离线操作到队列
   */
  async addOfflineOperation(
    operation: string,
    params: any,
    maxRetries: number = this.MAX_RETRY_COUNT
  ): Promise<void> {
    const offlineOp: OfflineOperation = {
      id: crypto.randomUUID(),
      operation,
      params,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries
    };

    this.offlineQueue.push(offlineOp);
    
    // 如果在线，立即尝试处理
    if (this.isOnline() && !this.isProcessingQueue) {
      await this.processOfflineQueue();
    }
  }

  /**
   * 启动队列处理器
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isOnline() && !this.isProcessingQueue && this.offlineQueue.length > 0) {
        await this.processOfflineQueue();
      }
    }, this.QUEUE_PROCESS_INTERVAL);
  }

  /**
   * 处理离线操作队列
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnline() || this.offlineQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`Processing ${this.offlineQueue.length} offline operations`);

    const processedOperations: string[] = [];

    for (const operation of this.offlineQueue) {
      try {
        const success = await this.executeOfflineOperation(operation);
        
        if (success) {
          processedOperations.push(operation.id);
          console.log(`Offline operation ${operation.operation} executed successfully`);
        } else {
          operation.retryCount++;
          if (operation.retryCount >= operation.maxRetries) {
            processedOperations.push(operation.id);
            console.error(`Offline operation ${operation.operation} failed after ${operation.maxRetries} retries`);
          }
        }
      } catch (error) {
        console.error(`Error executing offline operation ${operation.operation}:`, error);
        operation.retryCount++;
        if (operation.retryCount >= operation.maxRetries) {
          processedOperations.push(operation.id);
        }
      }
    }

    // 移除已处理的操作
    this.offlineQueue = this.offlineQueue.filter(op => !processedOperations.includes(op.id));
    
    this.isProcessingQueue = false;
  }

  /**
   * 执行离线操作
   */
  private async executeOfflineOperation(operation: OfflineOperation): Promise<boolean> {
    switch (operation.operation) {
      case 'deleteKeyword':
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          const response = await fetch(`${apiBaseUrl}/v1/keystore/keywords/remove`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(operation.params)
          });
          return response.ok;
        } catch (error) {
          return false;
        }

      case 'updateKeyword':
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          const response = await fetch(`${apiBaseUrl}/v1/keystore/keywords/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(operation.params)
          });
          return response.ok;
        } catch (error) {
          return false;
        }

      case 'createGroup':
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          const response = await fetch(`${apiBaseUrl}/v1/keystore/groups/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(operation.params)
          });
          return response.ok;
        } catch (error) {
          return false;
        }

      default:
        console.warn(`Unknown offline operation: ${operation.operation}`);
        return false;
    }
  }

  /**
   * 获取离线队列状态
   */
  getOfflineQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    operations: Array<{ operation: string; timestamp: string; retryCount: number }>
  } {
    return {
      queueLength: this.offlineQueue.length,
      isProcessing: this.isProcessingQueue,
      operations: this.offlineQueue.map(op => ({
        operation: op.operation,
        timestamp: op.timestamp,
        retryCount: op.retryCount
      }))
    };
  }

  /**
   * 清空离线队列
   */
  clearOfflineQueue(): void {
    this.offlineQueue = [];
  }

  /**
   * 执行离线删除关键词操作
   */
  async deleteKeywordOffline(keyword: string, group: string): Promise<void> {
    if (this.isOnline()) {
      // 如果在线，直接执行
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const response = await fetch(`${apiBaseUrl}/v1/keystore/keywords/remove`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ keyword, group })
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete keyword');
        }
      } catch (error) {
        // 网络错误，添加到离线队列
        await this.addOfflineOperation('deleteKeyword', { keyword, group });
        throw error;
      }
    } else {
      // 离线状态，添加到队列
      await this.addOfflineOperation('deleteKeyword', { keyword, group });
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
    
    this.clearOfflineQueue();
  }
}

// 单例实例
export const offlineManager = new OfflineManager();
export type { NetworkStatus, OfflineOperation };