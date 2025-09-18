/**
 * CSV导出工具函数
 */

export interface ExportableData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * 将数据导出为CSV文件
 * @param data 要导出的数据数组
 * @param filename 文件名（不包括.csv扩展名）
 * @param columnMapping 列名映射，用于自定义CSV表头
 */
export function exportToCSV(
  data: ExportableData[], 
  filename: string = 'export',
  columnMapping?: Record<string, string>
) {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // 获取所有列名
  const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
  
  // 应用列名映射
  const headers = allKeys.map(key => columnMapping?.[key] || key);
  
  // 创建CSV内容
  const csvContent = [
    headers.join(','), // 表头
    ...data.map(item => 
      allKeys.map(key => {
        const value = item[key];
        // 处理包含逗号、引号或换行符的值
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // 创建Blob并下载
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * 关键词数据的CSV导出
 * @param keywords 关键词数据
 * @param filename 文件名
 */
export function exportKeywordsToCSV(keywords: ExportableData[], filename: string = 'unique_keywords') {
  const columnMapping = {
    keyword: '关键词',
    brand: '品牌',
    position: '排名',
    search_volume: '搜索量',
    traffic: '流量',
    keyword_difficulty: '关键词难度',
    cpc: 'CPC',
    url: 'URL',
    duplicate_count: '重复次数'
  };
  
  exportToCSV(keywords, filename, columnMapping);
}