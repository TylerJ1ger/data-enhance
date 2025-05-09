import os
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
import numpy as np

def allowed_file(filename: str, allowed_extensions: set) -> bool:
    """Check if a file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def read_file(file_path: str) -> pd.DataFrame:
    """Read a CSV or XLSX file and return a DataFrame."""
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    elif file_path.endswith('.xlsx'):
        return pd.read_excel(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_path}")

def merge_dataframes(dataframes: List[pd.DataFrame]) -> pd.DataFrame:
    """Merge multiple DataFrames into one."""
    if not dataframes:
        return pd.DataFrame()
    
    # Concatenate all DataFrames
    merged_df = pd.concat(dataframes, ignore_index=True)
    
    # Drop duplicates based on all columns
    merged_df = merged_df.drop_duplicates()
    
    return merged_df

def count_keywords(df: pd.DataFrame) -> Dict[str, int]:
    """Count the occurrences of each keyword in the DataFrame."""
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
    """Filter DataFrame based on specified ranges."""
    if df.empty:
        return df
    
    filtered_df = df.copy()
    
    # Apply filters if provided
    if position_range and 'Position' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['Position'] >= position_range[0]) & 
                                 (filtered_df['Position'] <= position_range[1])]
    
    if search_volume_range and 'Search Volume' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['Search Volume'] >= search_volume_range[0]) & 
                                 (filtered_df['Search Volume'] <= search_volume_range[1])]
    
    if keyword_difficulty_range and 'Keyword Difficulty' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['Keyword Difficulty'] >= keyword_difficulty_range[0]) & 
                                 (filtered_df['Keyword Difficulty'] <= keyword_difficulty_range[1])]
    
    if cpc_range and 'CPC' in filtered_df.columns:
        filtered_df = filtered_df[(filtered_df['CPC'] >= cpc_range[0]) & 
                                 (filtered_df['CPC'] <= cpc_range[1])]
    
    # 添加关键词频率筛选
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
    """Calculate keyword overlap between different brands."""
    if df.empty or 'Keyword' not in df.columns or 'Brand' not in df.columns:
        return {}
    
    # Remove rows with empty brand values
    df_with_brand = df[df['Brand'].notna() & (df['Brand'] != '')]
    
    # Get unique brands and keywords
    brands = df_with_brand['Brand'].unique()
    
    # Create a dictionary to store keywords for each brand
    brand_keywords = {str(brand): set(df_with_brand[df_with_brand['Brand'] == brand]['Keyword']) 
                      for brand in brands}
    
    # Calculate overlap
    overlap_matrix = {}
    for brand1 in brands:
        brand1_str = str(brand1)
        overlap_matrix[brand1_str] = {}
        for brand2 in brands:
            brand2_str = str(brand2)
            overlap = len(brand_keywords[brand1_str].intersection(brand_keywords[brand2_str]))
            overlap_matrix[brand1_str][brand2_str] = int(overlap)
    
    return overlap_matrix

def get_dataframe_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Get statistics from a DataFrame."""
    if df.empty:
        return {
            "total_rows": 0,
            "keyword_count": 0,
            "unique_keywords": 0,
            "brands": [],
            "min_values": {},
            "max_values": {}
        }
    
    # 确保返回Python原生类型的值
    stats = {
        "total_rows": int(len(df)),
        "keyword_count": int(df['Keyword'].count()) if 'Keyword' in df.columns else 0,
        "unique_keywords": int(df['Keyword'].nunique()) if 'Keyword' in df.columns else 0,
        # 确保brands列表中的每个元素都是字符串
        "brands": [str(brand) for brand in df['Brand'].unique().tolist()] if 'Brand' in df.columns else [],
        "min_values": {},
        "max_values": {}
    }
    
    # Get min and max values for numeric columns，确保转换为Python float类型
    numeric_columns = ['Position', 'Search Volume', 'Keyword Difficulty', 'CPC']
    for col in numeric_columns:
        if col in df.columns:
            # 确保转换为Python原生的float类型
            stats["min_values"][col] = float(df[col].min())
            stats["max_values"][col] = float(df[col].max())
    
    return stats