"""
数据处理工具模块

提供数据文件读取、DataFrame处理、统计分析等通用功能。
支持关键词分析和外链分析的数据处理需求。

重构说明：
- 原文件：app/utils/helpers.py
- 新位置：app/shared/utils/data_utils.py
- 保持所有原有功能不变，优化代码组织和文档
"""

import os
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional, Set
import numpy as np


# ========================================
# 文件处理相关函数
# ========================================

def allowed_file(filename: str, allowed_extensions: Set[str]) -> bool:
    """
    检查文件是否具有允许的扩展名。
    
    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名集合
        
    Returns:
        bool: 文件扩展名是否被允许
        
    Example:
        >>> allowed_file("data.csv", {"csv", "xlsx"})
        True
        >>> allowed_file("data.txt", {"csv", "xlsx"}) 
        False
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions


def read_file(file_path: str) -> pd.DataFrame:
    """
    读取CSV或XLSX文件并返回DataFrame。
    
    Args:
        file_path: 文件路径
        
    Returns:
        pd.DataFrame: 读取的数据
        
    Raises:
        ValueError: 不支持的文件格式
        
    Example:
        >>> df = read_file("data.csv")
        >>> df = read_file("data.xlsx")
    """
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    elif file_path.endswith('.xlsx'):
        return pd.read_excel(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_path}")


def merge_dataframes(dataframes: List[pd.DataFrame]) -> pd.DataFrame:
    """
    将多个DataFrame合并为一个，并去除重复行。
    
    Args:
        dataframes: 要合并的DataFrame列表
        
    Returns:
        pd.DataFrame: 合并后的DataFrame
        
    Example:
        >>> df1 = pd.DataFrame({"A": [1, 2], "B": [3, 4]})
        >>> df2 = pd.DataFrame({"A": [5, 6], "B": [7, 8]})
        >>> merged = merge_dataframes([df1, df2])
    """
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
    """
    统计DataFrame中每个关键词的出现次数。
    
    Args:
        df: 包含Keyword列的DataFrame
        
    Returns:
        Dict[str, int]: 关键词及其出现次数的字典
        
    Example:
        >>> df = pd.DataFrame({"Keyword": ["python", "java", "python"]})
        >>> count_keywords(df)
        {"python": 2, "java": 1}
    """
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
    """
    基于指定范围过滤关键词数据的DataFrame。
    
    Args:
        df: 要过滤的DataFrame
        position_range: 排名范围 (min, max)
        search_volume_range: 搜索量范围 (min, max)
        keyword_difficulty_range: 关键词难度范围 (min, max)
        cpc_range: CPC范围 (min, max)
        keyword_frequency_range: 关键词频率范围 (min, max)
        
    Returns:
        pd.DataFrame: 过滤后的DataFrame
        
    Example:
        >>> filtered_df = filter_dataframe(df, position_range=(1, 10))
    """
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
    """
    计算不同品牌之间的关键词重叠情况。
    
    Args:
        df: 包含Keyword和Brand列的DataFrame
        
    Returns:
        Dict[str, Dict[str, int]]: 品牌间关键词重叠矩阵
        
    Example:
        >>> overlap = calculate_brand_keyword_overlap(df)
        >>> # overlap["brand1"]["brand2"] 表示brand1和brand2共同的关键词数量
    """
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
    """
    统计DataFrame中每个域名的出现次数。
    
    Args:
        df: 包含Domain列的DataFrame
        
    Returns:
        Dict[str, int]: 域名及其出现次数的字典
        
    Example:
        >>> df = pd.DataFrame({"Domain": ["example.com", "test.com", "example.com"]})
        >>> count_domains(df)
        {"example.com": 2, "test.com": 1}
    """
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
    """
    基于指定范围过滤外链数据的DataFrame。
    
    Args:
        df: 要过滤的DataFrame
        domain_ascore_range: 域名权重范围 (min, max)
        backlinks_range: 反链数量范围 (min, max)
        domain_frequency_range: 域名频率范围 (min, max)
        
    Returns:
        pd.DataFrame: 过滤后的DataFrame
        
    Example:
        >>> filtered_df = filter_backlink_dataframe(df, domain_ascore_range=(50, 100))
    """
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
    """
    计算不同品牌之间的域名重叠情况。
    
    Args:
        df: 包含Domain和Brand列的DataFrame
        
    Returns:
        Dict[str, Dict[str, int]]: 品牌间域名重叠矩阵
        
    Example:
        >>> overlap = calculate_brand_domain_overlap(df)
        >>> # overlap["brand1"]["brand2"] 表示brand1和brand2共同的域名数量
    """
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
    """
    获取DataFrame的统计信息，支持关键词和域名数据。
    
    Args:
        df: 要分析的DataFrame
        
    Returns:
        Dict[str, Any]: 包含统计信息的字典
        
    统计信息包括：
        - total_rows: 总行数
        - keyword_count/domain_count: 关键词/域名总数
        - unique_keywords/unique_domains: 唯一关键词/域名数
        - brands: 品牌列表
        - min_values/max_values: 数值列的最小值和最大值
        
    Example:
        >>> stats = get_dataframe_stats(df)
        >>> print(f"总行数: {stats['total_rows']}")
    """
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
    """
    验证DataFrame是否包含必需的列。
    
    Args:
        df: 要验证的DataFrame
        required_columns: 必需的列名列表
        
    Returns:
        Tuple[bool, List[str]]: (是否有效, 缺失的列名列表)
        
    Example:
        >>> is_valid, missing = validate_dataframe_columns(df, ["Keyword", "Position"])
        >>> if not is_valid:
        ...     print(f"缺失列: {missing}")
    """
    if df.empty:
        return False, required_columns
    
    missing_columns = [col for col in required_columns if col not in df.columns]
    return len(missing_columns) == 0, missing_columns


def clean_dataframe(df: pd.DataFrame, drop_empty_rows: bool = True, drop_duplicates: bool = True) -> pd.DataFrame:
    """
    清理DataFrame，移除空行和重复行。
    
    Args:
        df: 要清理的DataFrame
        drop_empty_rows: 是否删除空行
        drop_duplicates: 是否删除重复行
        
    Returns:
        pd.DataFrame: 清理后的DataFrame
        
    Example:
        >>> cleaned_df = clean_dataframe(df, drop_empty_rows=True, drop_duplicates=True)
    """
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
    """
    将DataFrame转换为CSV字节数据。
    
    Args:
        df: 要转换的DataFrame
        include_index: 是否包含索引
        
    Returns:
        bytes: CSV格式的字节数据
        
    Example:
        >>> csv_bytes = dataframe_to_csv_bytes(df)
        >>> # 可用于文件下载或存储
    """
    if df.empty:
        return b"No data to export"
    
    return df.to_csv(index=include_index).encode('utf-8')


def get_dataframe_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    获取DataFrame的摘要信息。
    
    Args:
        df: 要分析的DataFrame
        
    Returns:
        Dict[str, Any]: 摘要信息字典
        
    包含信息：
        - shape: DataFrame形状 (行数, 列数)
        - columns: 列名列表
        - dtypes: 列数据类型
        - memory_usage: 内存使用情况
        - null_counts: 每列的空值数量
        
    Example:
        >>> summary = get_dataframe_summary(df)
        >>> print(f"数据形状: {summary['shape']}")
    """
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