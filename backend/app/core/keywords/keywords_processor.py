"""
Keywords Analysis Processor
"""

import os
import pandas as pd
import tempfile
from typing import List, Dict, Any, Tuple, Optional
from fastapi import UploadFile

from app.shared.utils.data_utils import (
    read_file, 
    merge_dataframes, 
    count_keywords, 
    filter_dataframe, 
    calculate_brand_keyword_overlap,
    get_dataframe_stats
)


class KeywordsProcessor:
    def __init__(self):
        """初始化关键词处理器"""
        self.data = pd.DataFrame()
        self.original_files_data = []
        self.merged_data = pd.DataFrame()
        self.filtered_data = pd.DataFrame()
    
    async def process_files(self, files: List[UploadFile]) -> Dict[str, Any]:
        dataframes = []
        file_stats = []
        
        for file in files:
            # 创建临时文件存储上传内容
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                # 写入上传文件内容到临时文件
                content = await file.read()
                temp_file.write(content)
                temp_file.flush()
                
                # 读取文件到DataFrame
                df = read_file(temp_file.name)
                
                # 存储原始文件统计信息
                file_stats.append({
                    "filename": file.filename,
                    "stats": get_dataframe_stats(df)
                })
                
                dataframes.append(df)
                
                # 关闭并删除临时文件
                temp_file.close()
                os.unlink(temp_file.name)
        
        # 存储原始数据
        self.original_files_data = file_stats
        
        # 合并dataframes
        self.merged_data = merge_dataframes(dataframes)
        self.data = self.merged_data
        self.filtered_data = self.merged_data
        
        # 返回处理结果
        return {
            "file_stats": file_stats,
            "merged_stats": get_dataframe_stats(self.merged_data)
        }
    
    def apply_filters(
        self, 
        position_range: Optional[Tuple[float, float]] = None,
        search_volume_range: Optional[Tuple[float, float]] = None,
        keyword_difficulty_range: Optional[Tuple[float, float]] = None,
        cpc_range: Optional[Tuple[float, float]] = None,
        keyword_frequency_range: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        self.filtered_data = filter_dataframe(
            self.merged_data,
            position_range,
            search_volume_range,
            keyword_difficulty_range,
            cpc_range,
            keyword_frequency_range
        )
        
        return {
            "filtered_stats": get_dataframe_stats(self.filtered_data),
            "keyword_counts": count_keywords(self.filtered_data)
        }
    
    def get_brand_overlap(self) -> Dict[str, Any]:
        overlap_data = calculate_brand_keyword_overlap(self.filtered_data)
        
        # 获取品牌统计信息
        brand_stats = {}
        if not self.filtered_data.empty and 'Brand' in self.filtered_data.columns:
            brand_counts = self.filtered_data['Brand'].value_counts()
            for brand, count in brand_counts.items():
                if pd.notna(brand) and brand != '':
                    brand_stats[brand] = {
                        "total_keywords": count,
                        "unique_keywords": self.filtered_data[self.filtered_data['Brand'] == brand]['Keyword'].nunique()
                    }
        
        return {
            "overlap_matrix": overlap_data,
            "brand_stats": brand_stats
        }
    
    def export_filtered_data(self) -> bytes:
        if self.filtered_data.empty:
            return b"No data to export"
        
        # 转换DataFrame为CSV
        csv_bytes = self.filtered_data.to_csv(index=False).encode('utf-8')
        return csv_bytes
    
    def export_unique_filtered_data(self) -> bytes:
        if self.filtered_data.empty:
            return b"No data to export"
        
        # 获取唯一关键词
        if 'Keyword' in self.filtered_data.columns:
            unique_keywords = self.filtered_data.drop_duplicates(subset=['Keyword'])
            
            # 转换DataFrame为CSV
            csv_bytes = unique_keywords.to_csv(index=False).encode('utf-8')
            return csv_bytes
        else:
            return b"No keyword column found in data"
    
    def get_filter_ranges(self) -> Dict[str, Any]:
        if self.merged_data.empty:
            return {
                "position": [0, 100],
                "search_volume": [0, 1000000],
                "keyword_difficulty": [0, 100],
                "cpc": [0, 10],
                "keyword_frequency": [1, 100]  # 添加默认的关键词频率范围
            }
        
        stats = get_dataframe_stats(self.merged_data)
        
        # 计算关键词频率范围
        keyword_frequency_min = 1
        keyword_frequency_max = 100
        
        if 'Keyword' in self.merged_data.columns:
            keyword_counts = self.merged_data['Keyword'].value_counts()
            if not keyword_counts.empty:
                keyword_frequency_min = 1
                keyword_frequency_max = max(100, int(keyword_counts.max()))
        
        return {
            "position": [
                stats["min_values"].get("Position", 0),
                stats["max_values"].get("Position", 100)
            ],
            "search_volume": [
                stats["min_values"].get("Search Volume", 0),
                stats["max_values"].get("Search Volume", 1000000)
            ],
            "keyword_difficulty": [
                stats["min_values"].get("Keyword Difficulty", 0),
                stats["max_values"].get("Keyword Difficulty", 100)
            ],
            "cpc": [
                stats["min_values"].get("CPC", 0),
                stats["max_values"].get("CPC", 10)
            ],
            "keyword_frequency": [
                keyword_frequency_min,
                keyword_frequency_max
            ]
        }
        
    def filter_by_keyword(self, keyword: str) -> Dict[str, Any]:
        if self.filtered_data.empty:
            return {"results": []}
        
        # 筛选特定关键词（不区分大小写）
        keyword_data = self.filtered_data[self.filtered_data['Keyword'].str.lower() == keyword.lower()]
        
        if keyword_data.empty:
            return {"results": []}
        
        # 检查两种可能的流量数据列名
        traffic_column = None
        if 'Traffic' in keyword_data.columns:
            traffic_column = 'Traffic'
        elif 'Search Volume' in keyword_data.columns:
            traffic_column = 'Search Volume'
        
        # 提取相关列
        required_columns = ['Brand', 'Position', 'URL']
        if traffic_column:
            required_columns.append(traffic_column)
        
        # 确保只使用存在的列
        available_columns = [col for col in required_columns if col in keyword_data.columns]
        
        # 如果缺少必要的列，返回空结果
        if 'Brand' not in available_columns or len(available_columns) < 2:
            return {"results": []}
        
        # 准备所有数据项
        results = []
        for _, row in keyword_data.iterrows():
            brand = row['Brand'] if pd.notna(row['Brand']) else "未知品牌"
            if brand == '':
                brand = "未知品牌"
                
            item = {
                "keyword": keyword,
                "brand": brand
            }
            
            # 添加可用的列
            if 'Position' in available_columns:
                item["position"] = float(row['Position']) if pd.notna(row['Position']) else None
            
            if 'URL' in available_columns:
                item["url"] = row['URL'] if pd.notna(row['URL']) else None
            
            # 处理流量数据，优先使用找到的流量列
            if traffic_column and traffic_column in available_columns:
                item["traffic"] = float(row[traffic_column]) if pd.notna(row[traffic_column]) else None
            
            results.append(item)
        
        # 按照品牌名称排序结果
        results.sort(key=lambda x: x.get("brand", ""))
        
        return {"results": results}
    
    def get_data_summary(self) -> Dict[str, Any]:
        return {
            "total_rows": len(self.merged_data) if not self.merged_data.empty else 0,
            "filtered_rows": len(self.filtered_data) if not self.filtered_data.empty else 0,
            "total_keywords": self.merged_data['Keyword'].nunique() if 'Keyword' in self.merged_data.columns else 0,
            "total_brands": self.merged_data['Brand'].nunique() if 'Brand' in self.merged_data.columns else 0,
            "has_data": not self.merged_data.empty
        }
    
    def reset_data(self) -> None:
        """重置所有数据"""
        self.data = pd.DataFrame()
        self.original_files_data = []
        self.merged_data = pd.DataFrame()
        self.filtered_data = pd.DataFrame()