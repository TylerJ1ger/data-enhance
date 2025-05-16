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
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    // URL解析失败时，尝试基本提取
    const match = url.match(/^(?:https?:\/\/)?([^\/]+)/i);
    return match ? match[1] : url;
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