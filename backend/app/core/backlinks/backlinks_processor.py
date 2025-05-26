import os
import pandas as pd
import tempfile
from typing import List, Dict, Any, Tuple, Optional
from fastapi import UploadFile
from urllib.parse import urlparse

from app.shared.utils.data_utils import (
    read_file, 
    merge_dataframes, 
    count_domains, 
    filter_backlink_dataframe,
    calculate_brand_domain_overlap,
    get_dataframe_stats
)


class BacklinksProcessor:
    def __init__(self):
        """初始化外链处理器"""
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
                # 将上传文件内容写入临时文件
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
        
        # 合并数据框
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
        domain_ascore_range: Optional[Tuple[float, float]] = None,
        backlinks_range: Optional[Tuple[float, float]] = None,
        domain_frequency_range: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        self.filtered_data = filter_backlink_dataframe(
            self.merged_data,
            domain_ascore_range,
            backlinks_range,
            domain_frequency_range
        )
        
        return {
            "filtered_stats": get_dataframe_stats(self.filtered_data),
            "domain_counts": count_domains(self.filtered_data)
        }
    
    def get_brand_overlap(self) -> Dict[str, Any]:
        overlap_data = calculate_brand_domain_overlap(self.filtered_data)
        
        # 获取品牌统计信息
        brand_stats = {}
        if not self.filtered_data.empty and 'Brand' in self.filtered_data.columns:
            brand_counts = self.filtered_data['Brand'].value_counts()
            for brand, count in brand_counts.items():
                if pd.notna(brand) and brand != '':
                    brand_stats[brand] = {
                        "total_domains": count,
                        "unique_domains": self.filtered_data[self.filtered_data['Brand'] == brand]['Domain'].nunique()
                    }
        
        return {
            "overlap_matrix": overlap_data,
            "brand_stats": brand_stats
        }
    
    def export_filtered_data(self) -> bytes:
        if self.filtered_data.empty:
            return b"No data to export"
        
        # 将DataFrame转换为CSV
        csv_bytes = self.filtered_data.to_csv(index=False).encode('utf-8')
        return csv_bytes
    
    def export_unique_filtered_data(self) -> bytes:
        if self.filtered_data.empty:
            return b"No data to export"
        
        # 获取唯一域名
        if 'Domain' in self.filtered_data.columns:
            # 计算每个域名出现的次数
            domain_counts = self.filtered_data['Domain'].value_counts().to_dict()
            
            # 获取唯一域名
            unique_domains = self.filtered_data.drop_duplicates(subset=['Domain'])
            
            # 添加duplicate列，表示域名的重复次数
            unique_domains['duplicate'] = unique_domains['Domain'].map(domain_counts)
            
            # 将DataFrame转换为CSV
            csv_bytes = unique_domains.to_csv(index=False).encode('utf-8')
            return csv_bytes
        else:
            return b"No domain column found in data"
    
    def get_filter_ranges(self) -> Dict[str, Any]:
        if self.merged_data.empty:
            return {
                "domain_ascore": [0, 100],
                "backlinks": [0, 1000],
                "domain_frequency": [1, 100]
            }
        
        stats = get_dataframe_stats(self.merged_data)
        
        # 计算域名频率范围
        domain_frequency_min = 1
        domain_frequency_max = 100
        
        if 'Domain' in self.merged_data.columns:
            domain_counts = self.merged_data['Domain'].value_counts()
            if not domain_counts.empty:
                domain_frequency_min = 1
                domain_frequency_max = max(100, int(domain_counts.max()))
        
        return {
            "domain_ascore": [
                stats["min_values"].get("Domain ascore", 0),
                stats["max_values"].get("Domain ascore", 100)
            ],
            "backlinks": [
                stats["min_values"].get("Backlinks", 0),
                stats["max_values"].get("Backlinks", 1000)
            ],
            "domain_frequency": [
                domain_frequency_min,
                domain_frequency_max
            ]
        }
        
    def filter_by_domain(self, domain: str) -> Dict[str, Any]:
        if self.filtered_data.empty:
            return {"results": []}
        
        # 转换为Python原生逻辑，避免Series布尔操作
        domain_data = self.filtered_data[self.filtered_data['Domain'].str.lower() == domain.lower()]
        
        if domain_data.empty:
            return {"results": []}
        
        # 提取相关列
        required_columns = ['Brand', 'Domain ascore', 'Backlinks', 'Domain']
        
        # 确保只使用存在的列
        available_columns = [col for col in required_columns if col in domain_data.columns]
        
        # 如果缺少必要的列，返回空结果
        if 'Brand' not in available_columns or 'Domain' not in available_columns or len(available_columns) < 2:
            return {"results": []}
        
        # 准备所有数据项
        results = []
        for _, row in domain_data.iterrows():
            brand = row['Brand'] if pd.notna(row['Brand']) else "未知品牌"
            if brand == '':
                brand = "未知品牌"
                
            item = {
                "domain": row['Domain'],
                "brand": brand
            }
            
            # 添加可用的列
            if 'Domain ascore' in available_columns:
                item["domain_ascore"] = float(row['Domain ascore']) if pd.notna(row['Domain ascore']) else None
            
            if 'Backlinks' in available_columns:
                item["backlinks"] = float(row['Backlinks']) if pd.notna(row['Backlinks']) else None
            
            # 添加其他可能存在的列
            if 'IP Address' in domain_data.columns:
                item["ip_address"] = row['IP Address'] if pd.notna(row['IP Address']) else None
            
            if 'Country' in domain_data.columns:
                item["country"] = row['Country'] if pd.notna(row['Country']) else None
                
            if 'First seen' in domain_data.columns:
                item["first_seen"] = row['First seen'] if pd.notna(row['First seen']) else None
                
            if 'Last seen' in domain_data.columns:
                item["last_seen"] = row['Last seen'] if pd.notna(row['Last seen']) else None
            
            results.append(item)
        
        # 按照品牌名称排序结果
        results.sort(key=lambda x: x.get("brand", ""))
        
        return {"results": results}