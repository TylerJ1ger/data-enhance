import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 从原有的helpers.ts导入这些实用函数
export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

export const formatCurrency = (value: number): string => {
  return `$${value.toFixed(2)}`;
};

export const truncateString = (str: string, length: number): string => {
  if (str.length <= length) {
    return str;
  }
  return str.slice(0, length) + '...';
};