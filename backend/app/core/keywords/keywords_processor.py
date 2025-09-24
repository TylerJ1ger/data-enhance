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
from app.shared.utils.column_name_utils import (
    find_column_name,
    find_multiple_column_names,
    get_required_columns_for_keyword_filter,
    get_filterable_columns,
    validate_dataframe_columns,
    analyze_dataframe_columns,
    KEYWORD_COLUMN_MAPPINGS
)
from app.shared.utils.brand_extraction_utils import enhance_brand_identification


class KeywordsProcessor:
    def __init__(self):
        """初始化关键词处理器"""
        self.data = pd.DataFrame()
        self.original_files_data = []
        self.merged_data = pd.DataFrame()
        self.filtered_data = pd.DataFrame()
        self._column_mappings = {}  # 存储当前数据的列名映射
    
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
                
                # 验证列结构
                validation_result = validate_dataframe_columns(df)
                existing_brand_column = validation_result['found_columns'].get('brand')
                
                # 增强品牌识别：优先使用现有Brand列，然后从文件名提取，最后使用"Other"兜底
                brand_column_used = enhance_brand_identification(
                    df, 
                    file.filename, 
                    existing_brand_column
                )
                
                # 重新验证列结构（现在应该有Brand列了）
                validation_result_after = validate_dataframe_columns(df)
                if not validation_result_after['is_valid']:
                    # 记录警告但继续处理
                    print(f"Warning: File {file.filename} still missing some required columns: {validation_result_after['missing_concepts']}")
                
                # 存储原始文件统计信息
                file_stats.append({
                    "filename": file.filename,
                    "stats": get_dataframe_stats(df),
                    "column_analysis": analyze_dataframe_columns(df),
                    "brand_extraction": {
                        "original_brand_column": existing_brand_column,
                        "brand_column_used": brand_column_used,
                        "extraction_method": "existing" if existing_brand_column else "filename_or_fallback"
                    }
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
        
        # 更新列名映射
        self._update_column_mappings()
        
        # 返回处理结果
        return {
            "file_stats": file_stats,
            "merged_stats": get_dataframe_stats(self.merged_data),
            "column_mappings": self._column_mappings
        }
    
    def _update_column_mappings(self):
        """更新当前数据的列名映射"""
        if not self.merged_data.empty:
            self._column_mappings = find_multiple_column_names(
                self.merged_data, 
                list(KEYWORD_COLUMN_MAPPINGS.keys())
            )
    
    def apply_filters(
        self, 
        position_range: Optional[Tuple[float, float]] = None,
        search_volume_range: Optional[Tuple[float, float]] = None,
        keyword_difficulty_range: Optional[Tuple[float, float]] = None,
        cpc_range: Optional[Tuple[float, float]] = None,
        keyword_frequency_range: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        # 使用新的列名映射进行筛选
        self.filtered_data = filter_dataframe(
            self.merged_data,
            position_range,
            search_volume_range,
            keyword_difficulty_range,
            cpc_range,
            keyword_frequency_range,
            column_mappings=self._column_mappings  # 传递列名映射
        )
        
        return {
            "filtered_stats": get_dataframe_stats(self.filtered_data),
            "keyword_counts": count_keywords(self.filtered_data, self._column_mappings)
        }
    
    def get_brand_overlap(self) -> Dict[str, Any]:
        overlap_data = calculate_brand_keyword_overlap(
            self.filtered_data, 
            column_mappings=self._column_mappings
        )
        
        # 获取品牌统计信息
        brand_stats = {}
        brand_column = self._column_mappings.get('brand')
        keyword_column = self._column_mappings.get('keyword')
        
        if not self.filtered_data.empty and brand_column and keyword_column:
            brand_counts = self.filtered_data[brand_column].value_counts()
            for brand, count in brand_counts.items():
                if pd.notna(brand) and brand != '':
                    brand_stats[brand] = {
                        "total_keywords": count,
                        "unique_keywords": self.filtered_data[
                            self.filtered_data[brand_column] == brand
                        ][keyword_column].nunique()
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
        keyword_column = self._column_mappings.get('keyword')
        if keyword_column and keyword_column in self.filtered_data.columns:
            unique_keywords = self.filtered_data.drop_duplicates(subset=[keyword_column])
            
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
                "keyword_frequency": [1, 100]
            }
        
        stats = get_dataframe_stats(self.merged_data)
        
        # 使用列名映射获取实际列名
        filterable_columns = get_filterable_columns(self.merged_data)
        
        # 计算关键词频率范围
        keyword_frequency_min = 1
        keyword_frequency_max = 100
        
        keyword_column = self._column_mappings.get('keyword')
        if keyword_column and keyword_column in self.merged_data.columns:
            keyword_counts = self.merged_data[keyword_column].value_counts()
            if not keyword_counts.empty:
                keyword_frequency_min = 1
                keyword_frequency_max = max(100, int(keyword_counts.max()))
        
        # 构建返回结果，使用动态列名
        result = {
            "keyword_frequency": [keyword_frequency_min, keyword_frequency_max]
        }
        
        # 动态添加其他筛选范围
        filter_mapping = {
            'position': 'position',
            'search_volume': 'search_volume', 
            'keyword_difficulty': 'keyword_difficulty',
            'cpc': 'cpc'
        }
        
        for concept, result_key in filter_mapping.items():
            actual_column = filterable_columns.get(concept)
            if actual_column:
                result[result_key] = [
                    stats["min_values"].get(actual_column, 0),
                    stats["max_values"].get(actual_column, 100)
                ]
            else:
                # 提供默认值
                defaults = {
                    'position': [0, 100],
                    'search_volume': [0, 1000000],
                    'keyword_difficulty': [0, 100],
                    'cpc': [0, 10]
                }
                result[result_key] = defaults.get(concept, [0, 100])
        
        return result
        
    def filter_by_keyword(self, keyword: str) -> Dict[str, Any]:
        if self.filtered_data.empty:
            return {"results": []}
        
        # 使用新的列名映射获取实际列名
        keyword_column = self._column_mappings.get('keyword')
        if not keyword_column or keyword_column not in self.filtered_data.columns:
            return {"results": []}
        
        # 筛选特定关键词（不区分大小写）
        keyword_data = self.filtered_data[
            self.filtered_data[keyword_column].str.lower() == keyword.lower()
        ]
        
        if keyword_data.empty:
            return {"results": []}
        
        # 使用新的工具获取流量列
        traffic_column = find_column_name(keyword_data, 'traffic')
        
        # 获取必需的列名
        brand_column = self._column_mappings.get('brand')
        position_column = self._column_mappings.get('position')
        url_column = self._column_mappings.get('url')
        
        # 检查必要列是否存在
        required_columns = []
        if brand_column and brand_column in keyword_data.columns:
            required_columns.append(brand_column)
        if position_column and position_column in keyword_data.columns:
            required_columns.append(position_column)
        if url_column and url_column in keyword_data.columns:
            required_columns.append(url_column)
        
        # 如果缺少关键列，返回空结果
        if not brand_column or len(required_columns) < 1:
            return {"results": []}
        
        # 准备所有数据项
        results = []
        for _, row in keyword_data.iterrows():
            brand = row[brand_column] if pd.notna(row[brand_column]) else "未知品牌"
            if brand == '':
                brand = "未知品牌"
                
            item = {
                "keyword": keyword,
                "brand": brand
            }
            
            # 添加位置信息
            if position_column and position_column in keyword_data.columns:
                item["position"] = float(row[position_column]) if pd.notna(row[position_column]) else None
            
            # 添加URL信息
            if url_column and url_column in keyword_data.columns:
                item["url"] = row[url_column] if pd.notna(row[url_column]) else None
            
            # 添加流量信息
            if traffic_column and traffic_column in keyword_data.columns:
                item["traffic"] = float(row[traffic_column]) if pd.notna(row[traffic_column]) else None
            
            results.append(item)
        
        # 按照品牌名称排序结果
        results.sort(key=lambda x: x.get("brand", ""))
        
        return {"results": results}
    
    def get_keywords_list(self) -> Dict[str, Any]:
        """获取所有关键词列表数据"""
        if self.filtered_data.empty:
            return {
                "keywords": [],
                "total_count": 0
            }
        
        # 获取列名映射
        keyword_column = self._column_mappings.get('keyword')
        brand_column = self._column_mappings.get('brand')
        position_column = self._column_mappings.get('position')
        url_column = self._column_mappings.get('url')
        
        # 查找其他可能的列
        search_volume_column = find_column_name(self.filtered_data, 'search_volume')
        keyword_difficulty_column = find_column_name(self.filtered_data, 'keyword_difficulty')
        cpc_column = find_column_name(self.filtered_data, 'cpc')
        traffic_column = find_column_name(self.filtered_data, 'traffic')
        trends_column = find_column_name(self.filtered_data, 'trends')
        timestamp_column = find_column_name(self.filtered_data, 'timestamp')
        # 添加新的三个字段
        number_of_results_column = find_column_name(self.filtered_data, 'results_count') or 'Number of Results'
        keyword_intents_column = find_column_name(self.filtered_data, 'intent') or 'Keyword Intents'
        position_type_column = find_column_name(self.filtered_data, 'position_type') or 'Position Type'
        
        # 检查必要列是否存在
        if not keyword_column or keyword_column not in self.filtered_data.columns:
            return {
                "keywords": [],
                "total_count": 0
            }
        
        # 计算总行数
        total_count = len(self.filtered_data)
        
        # 使用所有数据
        all_data = self.filtered_data
        
        # 构建结果列表
        keywords = []
        for _, row in all_data.iterrows():
            # 基本信息
            keyword = row[keyword_column] if pd.notna(row[keyword_column]) else ""
            brand = row[brand_column] if brand_column and brand_column in self.filtered_data.columns and pd.notna(row[brand_column]) else "未知品牌"
            
            # 构建关键词项目
            item = {
                "keyword": keyword,
                "brand": brand if brand != "" else "未知品牌"
            }
            
            # 添加位置信息
            if position_column and position_column in self.filtered_data.columns and pd.notna(row[position_column]):
                try:
                    item["position"] = int(float(row[position_column]))
                except (ValueError, TypeError):
                    item["position"] = None
            else:
                item["position"] = None
            
            # 添加搜索量信息
            if search_volume_column and search_volume_column in self.filtered_data.columns and pd.notna(row[search_volume_column]):
                try:
                    item["search_volume"] = int(float(row[search_volume_column]))
                except (ValueError, TypeError):
                    item["search_volume"] = None
            else:
                item["search_volume"] = None
            
            # 添加关键词难度信息
            if keyword_difficulty_column and keyword_difficulty_column in self.filtered_data.columns and pd.notna(row[keyword_difficulty_column]):
                try:
                    item["keyword_difficulty"] = float(row[keyword_difficulty_column])
                except (ValueError, TypeError):
                    item["keyword_difficulty"] = None
            else:
                item["keyword_difficulty"] = None
            
            # 添加CPC信息
            if cpc_column and cpc_column in self.filtered_data.columns and pd.notna(row[cpc_column]):
                try:
                    item["cpc"] = float(row[cpc_column])
                except (ValueError, TypeError):
                    item["cpc"] = None
            else:
                item["cpc"] = None
            
            # 添加URL信息
            if url_column and url_column in self.filtered_data.columns and pd.notna(row[url_column]):
                item["url"] = str(row[url_column])
            else:
                item["url"] = None
            
            # 添加流量信息
            if traffic_column and traffic_column in self.filtered_data.columns and pd.notna(row[traffic_column]):
                try:
                    item["traffic"] = int(float(row[traffic_column]))
                except (ValueError, TypeError):
                    item["traffic"] = None
            else:
                item["traffic"] = None

            # 添加热度趋势信息
            if trends_column and trends_column in self.filtered_data.columns and pd.notna(row[trends_column]):
                item["trends"] = str(row[trends_column])
            else:
                item["trends"] = None

            # 添加时间戳信息
            if timestamp_column and timestamp_column in self.filtered_data.columns and pd.notna(row[timestamp_column]):
                item["timestamp"] = str(row[timestamp_column])
            else:
                item["timestamp"] = None

            # 添加结果数量信息
            if number_of_results_column and number_of_results_column in self.filtered_data.columns and pd.notna(row[number_of_results_column]):
                try:
                    item["number_of_results"] = int(float(row[number_of_results_column]))
                except (ValueError, TypeError):
                    item["number_of_results"] = None
            else:
                item["number_of_results"] = None

            # 添加关键词意图信息
            if keyword_intents_column and keyword_intents_column in self.filtered_data.columns and pd.notna(row[keyword_intents_column]):
                item["keyword_intents"] = str(row[keyword_intents_column])
            else:
                item["keyword_intents"] = None

            # 添加位置类型信息
            if position_type_column and position_type_column in self.filtered_data.columns and pd.notna(row[position_type_column]):
                item["position_type"] = str(row[position_type_column])
            else:
                item["position_type"] = None

            keywords.append(item)
        
        return {
            "keywords": keywords,
            "total_count": total_count
        }
    
    def get_data_summary(self) -> Dict[str, Any]:
        keyword_column = self._column_mappings.get('keyword')
        brand_column = self._column_mappings.get('brand')
        
        return {
            "total_rows": len(self.merged_data) if not self.merged_data.empty else 0,
            "filtered_rows": len(self.filtered_data) if not self.filtered_data.empty else 0,
            "total_keywords": self.merged_data[keyword_column].nunique() if keyword_column and keyword_column in self.merged_data.columns else 0,
            "total_brands": self.merged_data[brand_column].nunique() if brand_column and brand_column in self.merged_data.columns else 0,
            "has_data": not self.merged_data.empty,
            "column_mappings": self._column_mappings
        }
    
    def reset_data(self) -> None:
        """重置所有数据"""
        self.data = pd.DataFrame()
        self.original_files_data = []
        self.merged_data = pd.DataFrame()
        self.filtered_data = pd.DataFrame()
        self._column_mappings = {}