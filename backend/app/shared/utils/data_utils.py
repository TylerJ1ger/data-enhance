"""
数据处理工具模块
"""

import os
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional, Set
import numpy as np


# ========================================
# 文件处理相关函数
# ========================================

def allowed_file(filename: str, allowed_extensions: Set[str]) -> bool:
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions


def read_file(file_path: str) -> pd.DataFrame:
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    elif file_path.endswith('.xlsx'):
        return pd.read_excel(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_path}")


def merge_dataframes(dataframes: List[pd.DataFrame]) -> pd.DataFrame:
    if not dataframes:
        return pd.DataFrame()
    
    # 连接所有DataFrame
    merged_df = pd.concat(dataframes, ignore_index=True)
    
    # 基于所有列去除重复行
    merged_df = merged_df.drop_duplicates()
    
    return merged_df


# ========================================
# 关键词分析相关函数
# ========================================

def count_keywords(df: pd.DataFrame) -> Dict[str, int]:
    if df.empty or 'Keyword' not in df.columns:
        return {}
    
    # 确保返回的是Python原生类型的字典
    counts = df['Keyword'].value_counts().to_dict()
    return {str(k): int(v) for k, v in counts.items()}


def filter_dataframe(
    df: pd.DataFrame, 
    position_range: Optional[Tuple[float, float]] = None,
    search_volume_range: Optional[Tuple[float, float]] = None,
    keyword_difficulty_range: Optional[Tuple[float, float]] = None,
    cpc_range: Optional[Tuple[float, float]] = None,
    keyword_frequency_range: Optional[Tuple[float, float]] = None
) -> pd.DataFrame:
    if df.empty:
        return df
    
    filtered_df = df.copy()
    
    # 应用位置过滤
    if position_range and 'Position' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['Position'] >= position_range[0]) & 
                                 (filtered_df['Position'] <= position_range[1])]
    
    # 应用搜索量过滤
    if search_volume_range and 'Search Volume' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['Search Volume'] >= search_volume_range[0]) & 
                                 (filtered_df['Search Volume'] <= search_volume_range[1])]
    
    # 应用关键词难度过滤
    if keyword_difficulty_range and 'Keyword Difficulty' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['Keyword Difficulty'] >= keyword_difficulty_range[0]) & 
                                 (filtered_df['Keyword Difficulty'] <= keyword_difficulty_range[1])]
    
    # 应用CPC过滤
    if cpc_range and 'CPC' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['CPC'] >= cpc_range[0]) & 
                                 (filtered_df['CPC'] <= cpc_range[1])]
    
    # 应用关键词频率过滤
    if keyword_frequency_range and 'Keyword' in filtered_df.columns:
        # 计算每个关键词出现的次数
        keyword_counts = filtered_df['Keyword'].value_counts()
        # 获取频率在范围内的关键词
        valid_keywords = keyword_counts[(keyword_counts >= keyword_frequency_range[0]) & 
                                       (keyword_counts <= keyword_frequency_range[1])].index
        # 筛选包含这些关键词的行
        filtered_df = filtered_df[filtered_df['Keyword'].isin(valid_keywords)]
    
    return filtered_df


def calculate_brand_keyword_overlap(df: pd.DataFrame) -> Dict[str, Dict[str, int]]:
    if df.empty or 'Keyword' not in df.columns or 'Brand' not in df.columns:
        return {}
    
    # 移除Brand值为空的行
    df_with_brand = df[df['Brand'].notna() & (df['Brand'] != '')]
    
    # 获取唯一品牌和关键词
    brands = df_with_brand['Brand'].unique()
    
    # 创建字典存储每个品牌的关键词集合
    brand_keywords = {str(brand): set(df_with_brand[df_with_brand['Brand'] == brand]['Keyword']) 
                      for brand in brands}
    
    # 计算重叠矩阵
    overlap_matrix = {}
    for brand1 in brands:
        brand1_str = str(brand1)
        overlap_matrix[brand1_str] = {}
        for brand2 in brands:
            brand2_str = str(brand2)
            overlap = len(brand_keywords[brand1_str].intersection(brand_keywords[brand2_str]))
            overlap_matrix[brand1_str][brand2_str] = int(overlap)
    
    return overlap_matrix


# ========================================
# 外链分析相关函数
# ========================================

def count_domains(df: pd.DataFrame) -> Dict[str, int]:
    if df.empty or 'Domain' not in df.columns:
        return {}
    
    # 确保返回的是Python原生类型的字典
    counts = df['Domain'].value_counts().to_dict()
    return {str(k): int(v) for k, v in counts.items()}


def filter_backlink_dataframe(
    df: pd.DataFrame, 
    domain_ascore_range: Optional[Tuple[float, float]] = None,
    backlinks_range: Optional[Tuple[float, float]] = None,
    domain_frequency_range: Optional[Tuple[float, float]] = None
) -> pd.DataFrame:
    if df.empty:
        return df
    
    filtered_df = df.copy()
    
    # 应用域名权重过滤
    if domain_ascore_range and 'Domain ascore' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['Domain ascore'] >= domain_ascore_range[0]) & 
                                 (filtered_df['Domain ascore'] <= domain_ascore_range[1])]
    
    # 应用反链数量过滤
    if backlinks_range and 'Backlinks' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['Backlinks'] >= backlinks_range[0]) & 
                                 (filtered_df['Backlinks'] <= backlinks_range[1])]
    
    # 应用域名频率过滤
    if domain_frequency_range and 'Domain' in filtered_df.columns:
        # 计算每个域名出现的次数
        domain_counts = filtered_df['Domain'].value_counts()
        # 获取频率在范围内的域名
        valid_domains = domain_counts[(domain_counts >= domain_frequency_range[0]) & 
                                     (domain_counts <= domain_frequency_range[1])].index
        # 筛选包含这些域名的行
        filtered_df = filtered_df[filtered_df['Domain'].isin(valid_domains)]
    
    return filtered_df


def calculate_brand_domain_overlap(df: pd.DataFrame) -> Dict[str, Dict[str, int]]:
    if df.empty or 'Domain' not in df.columns or 'Brand' not in df.columns:
        return {}
    
    # 移除Brand值为空的行
    df_with_brand = df[df['Brand'].notna() & (df['Brand'] != '')]
    
    # 获取唯一品牌和域名
    brands = df_with_brand['Brand'].unique()
    
    # 创建字典存储每个品牌的域名集合
    brand_domains = {str(brand): set(df_with_brand[df_with_brand['Brand'] == brand]['Domain']) 
                     for brand in brands}
    
    # 计算重叠矩阵
    overlap_matrix = {}
    for brand1 in brands:
        brand1_str = str(brand1)
        overlap_matrix[brand1_str] = {}
        for brand2 in brands:
            brand2_str = str(brand2)
            overlap = len(brand_domains[brand1_str].intersection(brand_domains[brand2_str]))
            overlap_matrix[brand1_str][brand2_str] = int(overlap)
    
    return overlap_matrix


# ========================================
# 通用统计分析函数
# ========================================

def get_dataframe_stats(df: pd.DataFrame) -> Dict[str, Any]:
    if df.empty:
        return {
            "total_rows": 0,
            "keyword_count": 0,
            "unique_keywords": 0,
            "domain_count": 0,
            "unique_domains": 0,
            "brands": [],
            "min_values": {},
            "max_values": {}
        }
    
    # 确保返回Python原生类型的值
    stats = {
        "total_rows": int(len(df)),
        "brands": [str(brand) for brand in df['Brand'].unique().tolist()] if 'Brand' in df.columns else [],
        "min_values": {},
        "max_values": {}
    }
    
    # 根据DataFrame包含的列添加相应的统计信息
    if 'Keyword' in df.columns:
        stats["keyword_count"] = int(df['Keyword'].count())
        stats["unique_keywords"] = int(df['Keyword'].nunique())
    else:
        stats["keyword_count"] = 0
        stats["unique_keywords"] = 0
    
    # 添加域名统计支持
    if 'Domain' in df.columns:
        stats["domain_count"] = int(df['Domain'].count())
        stats["unique_domains"] = int(df['Domain'].nunique())
    else:
        stats["domain_count"] = 0
        stats["unique_domains"] = 0
    
    # 获取数值列的最小值和最大值，确保转换为Python float类型
    # 关键词相关列
    keyword_columns = ['Position', 'Search Volume', 'Keyword Difficulty', 'CPC']
    for col in keyword_columns:
        if col in df.columns:
            # 确保转换为Python原生的float类型
            stats["min_values"][col] = float(df[col].min())
            stats["max_values"][col] = float(df[col].max())
    
    # 域名相关列
    domain_columns = ['Domain ascore', 'Backlinks']
    for col in domain_columns:
        if col in df.columns:
            # 确保转换为Python原生的float类型
            stats["min_values"][col] = float(df[col].min())
            stats["max_values"][col] = float(df[col].max())
    
    return stats


# ========================================
# 数据验证函数
# ========================================

def validate_dataframe_columns(df: pd.DataFrame, required_columns: List[str]) -> Tuple[bool, List[str]]:
    if df.empty:
        return False, required_columns
    
    missing_columns = [col for col in required_columns if col not in df.columns]
    return len(missing_columns) == 0, missing_columns


def clean_dataframe(df: pd.DataFrame, drop_empty_rows: bool = True, drop_duplicates: bool = True) -> pd.DataFrame:
    if df.empty:
        return df
    
    cleaned_df = df.copy()
    
    if drop_empty_rows:
        # 删除所有列都为空的行
        cleaned_df = cleaned_df.dropna(how='all')
    
    if drop_duplicates:
        # 删除重复行
        cleaned_df = cleaned_df.drop_duplicates()
    
    return cleaned_df


# ========================================
# 数据导出函数
# ========================================

def dataframe_to_csv_bytes(df: pd.DataFrame, include_index: bool = False) -> bytes:
    if df.empty:
        return b"No data to export"
    
    return df.to_csv(index=include_index).encode('utf-8')


def get_dataframe_summary(df: pd.DataFrame) -> Dict[str, Any]:
    if df.empty:
        return {
            "shape": (0, 0),
            "columns": [],
            "dtypes": {},
            "memory_usage": 0,
            "null_counts": {}
        }
    
    return {
        "shape": df.shape,
        "columns": df.columns.tolist(),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "memory_usage": int(df.memory_usage(deep=True).sum()),
        "null_counts": {col: int(df[col].isnull().sum()) for col in df.columns}
    }