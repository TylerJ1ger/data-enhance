"""
数据处理工具模块 - 使用Logger的正确版本
"""

import os
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional, Set
import numpy as np
import logging

# 设置日志记录器
logger = logging.getLogger(__name__)

# 导入新的列名映射工具 - 添加日志记录
try:
    from app.shared.utils.column_name_utils import find_column_name, find_multiple_column_names
    COLUMN_MAPPING_AVAILABLE = True
    logger.info("列名映射模块导入成功 - 使用映射方案")
except ImportError as e:
    COLUMN_MAPPING_AVAILABLE = False
    logger.info("列名映射模块导入失败 - 使用回退方案")
    
    # 回退版本的列名查找
    def find_column_name(df: pd.DataFrame, concept: str) -> Optional[str]:
        """回退版本的列名查找"""
        concept_mappings = {
            'traffic': ['Traffic', 'Search Volume'],
            'keyword': ['Keyword'],
            'brand': ['Brand'],
            'position': ['Position'],
            'url': ['URL'],
            'keyword_difficulty': ['Keyword Difficulty'],
            'cpc': ['CPC']
        }
        for col_name in concept_mappings.get(concept, []):
            if col_name in df.columns:
                return col_name
        return None
    
    def find_multiple_column_names(df: pd.DataFrame, concepts: List[str]) -> Dict[str, Optional[str]]:
        """回退版本的多列名查找"""
        return {concept: find_column_name(df, concept) for concept in concepts}


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
# 关键词分析相关函数 - 更新版本
# ========================================

def count_keywords(df: pd.DataFrame, column_mappings: Optional[Dict[str, str]] = None) -> Dict[str, int]:
    if df.empty:
        return {}
    
    # 获取关键词列名 - 添加调试日志
    keyword_column = None
    if column_mappings and 'keyword' in column_mappings:
        keyword_column = column_mappings['keyword']
        logger.debug(f"关键词计数: 使用传入映射 -> {keyword_column}")
    else:
        keyword_column = find_column_name(df, 'keyword')
        if COLUMN_MAPPING_AVAILABLE:
            logger.debug(f"关键词计数: 使用映射方案 -> {keyword_column}")
        else:
            logger.debug(f"关键词计数: 使用回退方案 -> {keyword_column}")
    
    if not keyword_column or keyword_column not in df.columns:
        # 回退到原始逻辑
        if 'Keyword' in df.columns:
            keyword_column = 'Keyword'
            logger.debug(f"关键词计数: 使用硬编码回退 -> {keyword_column}")
        else:
            return {}
    
    # 确保返回的是Python原生类型的字典
    counts = df[keyword_column].value_counts().to_dict()
    return {str(k): int(v) for k, v in counts.items()}


def filter_dataframe(
    df: pd.DataFrame, 
    position_range: Optional[Tuple[float, float]] = None,
    search_volume_range: Optional[Tuple[float, float]] = None,
    keyword_difficulty_range: Optional[Tuple[float, float]] = None,
    cpc_range: Optional[Tuple[float, float]] = None,
    keyword_frequency_range: Optional[Tuple[float, float]] = None,
    column_mappings: Optional[Dict[str, str]] = None
) -> pd.DataFrame:
    """
    筛选DataFrame，支持动态列名映射 - 添加状态日志
    """
    if df.empty:
        return df

    # 添加状态日志 - 使用INFO级别确保能看到
    if column_mappings:
        logger.info("数据筛选: 使用传入列映射")
    elif COLUMN_MAPPING_AVAILABLE:
        logger.info("数据筛选: 使用映射方案")
    else:
        logger.info("数据筛选: 使用回退方案")

    filtered_df = df.copy()
    
    # 获取实际列名，优先使用传入的映射，否则自动查找
    def get_actual_column(concept: str) -> Optional[str]:
        if column_mappings and concept in column_mappings:
            return column_mappings[concept]
        return find_column_name(df, concept)
    
    # 应用位置过滤
    if position_range:
        position_column = get_actual_column('position')
        if not position_column and 'Position' in filtered_df.columns:
            position_column = 'Position'
            logger.debug("位置筛选: 使用硬编码回退 -> Position")
        elif position_column:
            logger.debug(f"位置筛选: 使用映射列名 -> {position_column}")
        
        if position_column and position_column in filtered_df.columns:
            filtered_df = filtered_df[
                (filtered_df[position_column] >= position_range[0]) & 
                (filtered_df[position_column] <= position_range[1])
            ]
        else:
            logger.debug("位置筛选: 跳过 - 未找到对应列")
    
    # 应用搜索量过滤 - 优先使用search_volume，如果没有则使用traffic
    if search_volume_range:
        search_volume_column = get_actual_column('search_volume')
        if not search_volume_column:
            search_volume_column = get_actual_column('traffic')
            if search_volume_column:
                logger.debug(f"搜索量筛选: 回退到流量列 -> {search_volume_column}")
        elif search_volume_column:
            logger.debug(f"搜索量筛选: 使用搜索量列 -> {search_volume_column}")
            
        if not search_volume_column and 'Search Volume' in filtered_df.columns:
            search_volume_column = 'Search Volume'
            logger.debug("搜索量筛选: 使用硬编码回退 -> Search Volume")
        
        if search_volume_column and search_volume_column in filtered_df.columns:
            filtered_df = filtered_df[
                (filtered_df[search_volume_column] >= search_volume_range[0]) & 
                (filtered_df[search_volume_column] <= search_volume_range[1])
            ]
        else:
            logger.debug("搜索量筛选: 跳过 - 未找到对应列")
    
    # 应用关键词难度过滤
    if keyword_difficulty_range:
        kd_column = get_actual_column('keyword_difficulty')
        if not kd_column and 'Keyword Difficulty' in filtered_df.columns:
            kd_column = 'Keyword Difficulty'
            logger.debug("关键词难度筛选: 使用硬编码回退 -> Keyword Difficulty")
        elif kd_column:
            logger.debug(f"关键词难度筛选: 使用映射列名 -> {kd_column}")
        
        if kd_column and kd_column in filtered_df.columns:
            filtered_df = filtered_df[
                (filtered_df[kd_column] >= keyword_difficulty_range[0]) & 
                (filtered_df[kd_column] <= keyword_difficulty_range[1])
            ]
        else:
            logger.debug("关键词难度筛选: 跳过 - 未找到对应列")
    
    # 应用CPC过滤
    if cpc_range:
        cpc_column = get_actual_column('cpc')
        if not cpc_column and 'CPC' in filtered_df.columns:
            cpc_column = 'CPC'
            logger.debug("CPC筛选: 使用硬编码回退 -> CPC")
        elif cpc_column:
            logger.debug(f"CPC筛选: 使用映射列名 -> {cpc_column}")
        
        if cpc_column and cpc_column in filtered_df.columns:
            filtered_df = filtered_df[
                (filtered_df[cpc_column] >= cpc_range[0]) & 
                (filtered_df[cpc_column] <= cpc_range[1])
            ]
        else:
            logger.debug("CPC筛选: 跳过 - 未找到对应列")
    
    # 应用关键词频率过滤
    if keyword_frequency_range:
        keyword_column = get_actual_column('keyword')
        if not keyword_column and 'Keyword' in filtered_df.columns:
            keyword_column = 'Keyword'
            logger.debug("关键词频率筛选: 使用硬编码回退 -> Keyword")
        elif keyword_column:
            logger.debug(f"关键词频率筛选: 使用映射列名 -> {keyword_column}")
        
        if keyword_column and keyword_column in filtered_df.columns:
            # 计算每个关键词出现的次数
            keyword_counts = filtered_df[keyword_column].value_counts()
            # 获取频率在范围内的关键词
            valid_keywords = keyword_counts[
                (keyword_counts >= keyword_frequency_range[0]) & 
                (keyword_counts <= keyword_frequency_range[1])
            ].index
            # 筛选包含这些关键词的行
            filtered_df = filtered_df[filtered_df[keyword_column].isin(valid_keywords)]
        else:
            logger.debug("关键词频率筛选: 跳过 - 未找到对应列")
    
    return filtered_df


def calculate_brand_keyword_overlap(
    df: pd.DataFrame, 
    column_mappings: Optional[Dict[str, str]] = None
) -> Dict[str, Dict[str, int]]:
    """
    计算品牌关键词重叠，支持动态列名映射
    """
    if df.empty:
        return {}
    
    # 获取实际列名
    keyword_column = None
    brand_column = None
    
    if column_mappings:
        keyword_column = column_mappings.get('keyword')
        brand_column = column_mappings.get('brand')
        logger.debug("品牌重叠计算: 使用传入映射")
    else:
        keyword_column = find_column_name(df, 'keyword')
        brand_column = find_column_name(df, 'brand')
        if COLUMN_MAPPING_AVAILABLE:
            logger.debug("品牌重叠计算: 使用映射方案")
        else:
            logger.debug("品牌重叠计算: 使用回退方案")
    
    # 回退到原始列名
    if not keyword_column and 'Keyword' in df.columns:
        keyword_column = 'Keyword'
    if not brand_column and 'Brand' in df.columns:
        brand_column = 'Brand'
    
    if not keyword_column or not brand_column:
        return {}
    
    if keyword_column not in df.columns or brand_column not in df.columns:
        return {}
    
    # 移除Brand值为空的行
    df_with_brand = df[df[brand_column].notna() & (df[brand_column] != '')]
    
    # 获取唯一品牌和关键词
    brands = df_with_brand[brand_column].unique()
    
    # 创建字典存储每个品牌的关键词集合
    brand_keywords = {
        str(brand): set(df_with_brand[df_with_brand[brand_column] == brand][keyword_column]) 
        for brand in brands
    }
    
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
# 通用统计分析函数 - 更新版本
# ========================================

def get_dataframe_stats(df: pd.DataFrame, column_mappings: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    获取DataFrame统计信息，支持动态列名映射
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
    
    # 获取实际列名的辅助函数
    def get_actual_column(concept: str) -> Optional[str]:
        if column_mappings and concept in column_mappings:
            return column_mappings[concept]
        return find_column_name(df, concept)
    
    keyword_column = get_actual_column('keyword')
    brand_column = get_actual_column('brand')
    
    # 回退到原始列名
    if not keyword_column and 'Keyword' in df.columns:
        keyword_column = 'Keyword'
    if not brand_column and 'Brand' in df.columns:
        brand_column = 'Brand'
    
    # 记录使用的方案
    if column_mappings:
        logger.debug("统计信息: 使用传入映射")
    elif COLUMN_MAPPING_AVAILABLE:
        logger.debug("统计信息: 使用映射方案") 
    else:
        logger.debug("统计信息: 使用回退方案")
    
    # 确保返回Python原生类型的值
    stats = {
        "total_rows": int(len(df)),
        "brands": [],
        "min_values": {},
        "max_values": {}
    }
    
    # 品牌信息
    if brand_column and brand_column in df.columns:
        stats["brands"] = [str(brand) for brand in df[brand_column].unique().tolist() if pd.notna(brand)]
    
    # 关键词统计
    if keyword_column and keyword_column in df.columns:
        stats["keyword_count"] = int(df[keyword_column].count())
        stats["unique_keywords"] = int(df[keyword_column].nunique())
    else:
        stats["keyword_count"] = 0
        stats["unique_keywords"] = 0
    
    # 域名统计（用于外链分析）
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
    
    # 处理新的列名映射
    if column_mappings:
        numeric_concepts = ['position', 'search_volume', 'traffic', 'keyword_difficulty', 'cpc']
        for concept in numeric_concepts:
            actual_column = get_actual_column(concept)
            if actual_column and actual_column in df.columns:
                # 检查列是否为数值类型
                if pd.api.types.is_numeric_dtype(df[actual_column]):
                    stats["min_values"][actual_column] = float(df[actual_column].min())
                    stats["max_values"][actual_column] = float(df[actual_column].max())
    
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