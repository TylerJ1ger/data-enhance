//frontend-new/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 用于合并Tailwind类名的工具函数
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化数字，添加K/M后缀
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * 格式化货币值
 */
export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * 截断字符串并添加省略号
 */
export function truncateString(str: string, length: number): string {
  if (str.length <= length) {
    return str;
  }
  return str.slice(0, length) + '...';
}

/**
 * 根据字符串生成一致的颜色（用于为不同品牌等分配颜色）
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color = color + value.toString(16).padStart(2, '0');
  }
  
  return color;
}

/**
 * 生成颜色的较浅版本
 */
export function lightenColor(colorHex: string, amount: number): string {
  // 确保颜色是带#的16进制格式
  const hex = colorHex.startsWith('#') ? colorHex.slice(1) : colorHex;
  
  // 添加简单的有效性检查
  if (!/^[0-9A-Fa-f]{3,6}$/.test(hex)) {
    return colorHex; // 如果无效，返回原始值
  }
  
  // 使用parseInt转换为数字，添加类型注解
  const parsedColor: number = parseInt(hex, 16);
  
  // 分别处理RGB通道
  const r = Math.min(255, Math.max(0, ((parsedColor >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((parsedColor >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, ((parsedColor) & 0xff) + amount));
  
  // 确保转换为字符串，避免数字类型问题
  const rs = Math.floor(r).toString(16).padStart(2, '0');
  const gs = Math.floor(g).toString(16).padStart(2, '0');
  const bs = Math.floor(b).toString(16).padStart(2, '0');
  
  // 使用字符串连接，避免模板字符串
  return '#' + rs + gs + bs;
}

/**
 * 解析CSV字符串为对象数组
 */
export function parseCSV(csvString: string): Record<string, string | number>[] {
  const lines = csvString.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  
  const results: Record<string, string | number>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    const obj: Record<string, string | number> = {};
    
    for (let j = 0; j < headers.length; j++) {
      let value: string | number = values[j] ? values[j].trim() : '';
      
      // 尝试转换数字
      if (!isNaN(Number(value)) && value !== '') {
        value = Number(value);
      }
      
      obj[headers[j]] = value;
    }
    
    results.push(obj);
  }
  
  return results;
}

/**
 * 检查值是否为空（null、undefined、空字符串、空数组、空对象）
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * 格式化日期为本地字符串
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 从URL中提取域名
 * @param url URL字符串
 * @param extractRoot 是否提取根域名（如从subdomain.example.com提取example.com）
 * @returns 提取的域名
 */
export function getDomainFromUrl(url: string, extractRoot: boolean = false): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    let hostname = urlObj.hostname.toLowerCase();
    
    // 如果不需要提取根域名，直接返回完整域名
    if (!extractRoot) {
      // 移除www前缀（可选，根据需求调整）
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      return hostname;
    }
    
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
      // 如果是形如 example.co.uk 的情况，直接返回
      if (hostParts.length <= 3) {
        return hostname;
      }
      // 形如 subdomain.example.co.uk，返回 example.co.uk
      return `${hostParts[hostParts.length - 3]}.${secondLastPart}.${lastPart}`;
    }
    
    // 其他情况，返回主域名和TLD，如subdomain.example.com返回example.com
    if (commonTLDs.includes(lastPart)) {
      return `${hostParts[hostParts.length - 2]}.${lastPart}`;
    }
    
    // 对于不常见的TLD，默认返回最后两段
    return `${hostParts[hostParts.length - 2]}.${lastPart}`;
    
  } catch (e) {
    // URL解析失败时，尝试基本提取
    const domainMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    if (domainMatch && domainMatch[1]) {
      return domainMatch[1].toLowerCase();
    }
    return url.toLowerCase();
  }
}

/**
 * 从URL中提取路径
 */
export function getPathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch (e) {
    // URL解析失败时，尝试基本提取
    const match = url.match(/^(?:https?:\/\/)?[^\/]+(\/.+)/i);
    return match ? match[1] : '';
  }
}

/**
 * 标准化URL格式
 * @param url 待处理的URL
 * @returns 标准化后的URL
 */
export function normalizeUrl(url: string): string {
  // 如果URL不以http或https开头，添加https
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

/**
 * 获取URL的主机名和路径的可读表示
 * @param url URL字符串
 * @returns 可读的URL表示
 */
export function getUrlDisplay(url: string): string {
  try {
    const urlObj = new URL(normalizeUrl(url));
    const domain = urlObj.hostname;
    const path = urlObj.pathname;
    
    if (path === '/' || !path) {
      return domain;
    }
    
    // 如果路径过长，截断显示
    const truncatedPath = path.length > 20 ? path.substring(0, 17) + '...' : path;
    return `${domain}${truncatedPath}`;
  } catch {
    return url;
  }
}

/**
 * 通用排序函数
 * @param items 要排序的项目数组
 * @param key 排序键或获取排序键的函数
 * @param direction 排序方向
 * @returns 排序后的数组
 */
export function sortItems<T>(
  items: T[],
  key: keyof T | ((item: T) => any),
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const keyFn = typeof key === 'function' ? key : (item: T) => item[key];
    
    const valueA = keyFn(a);
    const valueB = keyFn(b);
    
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return direction === 'asc' ? valueA - valueB : valueB - valueA;
    } else {
      const strA = String(valueA || '').toLowerCase();
      const strB = String(valueB || '').toLowerCase();
      return direction === 'asc' 
        ? strA.localeCompare(strB) 
        : strB.localeCompare(strA);
    }
  });
}

/**
 * 通用文本搜索过滤函数
 * @param items 要过滤的项目数组
 * @param searchTerm 搜索词
 * @param keys 要搜索的字段名数组
 * @returns 过滤后的数组
 */
export function filterByText<T>(
  items: T[],
  searchTerm: string,
  keys: (keyof T)[]
): T[] {
  if (!searchTerm) return items;
  
  const term = searchTerm.toLowerCase();
  return items.filter(item => {
    return keys.some(key => {
      const value = item[key];
      return value && String(value).toLowerCase().includes(term);
    });
  });
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}