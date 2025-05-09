/**
 * Format a number with K/M suffix
 */
export const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };
  
  /**
   * Format a currency value
   */
  export const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };
  
  /**
   * Truncate a string with ellipsis
   */
  export const truncateString = (str: string, length: number): string => {
    if (str.length <= length) {
      return str;
    }
    return str.slice(0, length) + '...';
  };
  
  /**
   * Get a color from a string (for consistent color assignment)
   */
  export const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  };
  
  /**
   * Generate a lighter version of a color
   */
  export const lightenColor = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    
    let r = (num >> 16) + amount;
    r = Math.min(r, 255);
    r = Math.max(r, 0);
    
    let g = ((num >> 8) & 0x00FF) + amount;
    g = Math.min(g, 255);
    g = Math.max(g, 0);
    
    let b = (num & 0x0000FF) + amount;
    b = Math.min(b, 255);
    b = Math.max(b, 0);
    
    return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
  };
  
  /**
   * Parse a CSV string to an array of objects
   */
  export const parseCSV = (csvString: string): any[] => {
    const lines = csvString.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      const obj: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        let value = values[j] ? values[j].trim() : '';
        
        // Try to convert numbers
        if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
        }
        
        obj[headers[j]] = value;
      }
      
      results.push(obj);
    }
    
    return results;
  };
  
  /**
   * Check if a value is empty (null, undefined, empty string, empty array, empty object)
   */
  export const isEmpty = (value: any): boolean => {
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
  };