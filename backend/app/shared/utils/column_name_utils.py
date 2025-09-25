"""
列名映射工具模块 - 路径backend/app/shared/utils/column_name_utils.py
"""

from typing import Dict, List, Optional, Set, Union
import pandas as pd


# ========================================
# 关键词分析相关列名映射
# ========================================

# 关键词分析核心列名映射字典
# 每个键对应一个业务概念，值是该概念可能出现的不同列名（按优先级排序）
KEYWORD_COLUMN_MAPPINGS = {
    # 流量相关列名 - 按优先级排序，优先匹配 'Traffic'
    'traffic': ['Traffic'],
    
    # 关键词列名
    'keyword': ['Keyword', 'Keywords', '关键词'],
    
    # 品牌列名
    'brand': ['Brand'],
    
    # 排名位置列名
    'position': ['Position'],
    
    # URL列名
    'url': ['URL', 'Link', 'Landing Page', '链接', 'Page URL', 'Target URL'],
    
    # 关键词难度列名
    'keyword_difficulty': ['Keyword Difficulty', 'DIFF', '关键词难度', 'SEO Difficulty'],
    
    # 点击成本列名
    'cpc': ['CPC', 'CPC (USD)', 'Cost Per Click', '点击成本', 'Cost', 'Avg CPC', 'Average CPC'],
    
    # 搜索量列名（独立于traffic，用于特定场景）
    'search_volume': ['Search Volume', 'Volume', 'Monthly Searches', '搜索量', 'Searches', 'QPM'],
    
    # 点击率列名
    'ctr': ['CTR', 'Click Through Rate', '点击率', 'Click Rate'],
    
    # 流量估算列名
    'traffic_estimate': ['Traffic Estimate', 'Estimated Traffic', '流量估算', 'Est. Traffic'],

    # 热度趋势列名
    'trends': ['Trends', 'Trend', '趋势', '热度'],

    # 时间戳列名
    'timestamp': ['Timestamp', 'Date', 'Time', '时间戳', '日期']
}

# 必需列名定义（按业务逻辑重要性排序）
REQUIRED_KEYWORD_COLUMNS = ['keyword', 'brand']

# 可选但重要的列名
IMPORTANT_KEYWORD_COLUMNS = ['position', 'url', 'traffic']

# 筛选相关列名
FILTERABLE_KEYWORD_COLUMNS = ['position', 'search_volume', 'keyword_difficulty', 'cpc', 'traffic']


# ========================================
# 列名查找和映射函数
# ========================================

def find_column_name(df: pd.DataFrame, column_concept: str, mappings: Dict[str, List[str]] = None) -> Optional[str]:
    if mappings is None:
        mappings = KEYWORD_COLUMN_MAPPINGS
    
    if column_concept not in mappings:
        return None
    
    # 按优先级顺序查找列名
    for potential_name in mappings[column_concept]:
        if potential_name in df.columns:
            return potential_name
    
    return None


def find_multiple_column_names(df: pd.DataFrame, column_concepts: List[str], 
                               mappings: Dict[str, List[str]] = None) -> Dict[str, Optional[str]]:
    if mappings is None:
        mappings = KEYWORD_COLUMN_MAPPINGS
    
    result = {}
    for concept in column_concepts:
        result[concept] = find_column_name(df, concept, mappings)
    
    return result


def get_all_possible_names(column_concept: str, mappings: Dict[str, List[str]] = None) -> List[str]:
    """
    获取指定概念的所有可能列名
    
    Args:
        column_concept: 列概念名称
        mappings: 列名映射字典，默认使用KEYWORD_COLUMN_MAPPINGS
    
    Returns:
        所有可能的列名列表
    """
    if mappings is None:
        mappings = KEYWORD_COLUMN_MAPPINGS
    
    return mappings.get(column_concept, [])


def validate_dataframe_columns(df: pd.DataFrame, required_concepts: List[str] = None, 
                               mappings: Dict[str, List[str]] = None) -> Dict[str, Union[bool, List[str], Dict[str, str]]]:
    if mappings is None:
        mappings = KEYWORD_COLUMN_MAPPINGS
    if required_concepts is None:
        required_concepts = REQUIRED_KEYWORD_COLUMNS
    
    found_columns = find_multiple_column_names(df, list(mappings.keys()), mappings)
    missing_concepts = []
    available_concepts = []
    
    for concept in required_concepts:
        if found_columns.get(concept) is None:
            missing_concepts.append(concept)
        else:
            available_concepts.append(concept)
    
    # 添加找到的非必需概念
    for concept, column_name in found_columns.items():
        if concept not in required_concepts and column_name is not None:
            available_concepts.append(concept)
    
    return {
        'is_valid': len(missing_concepts) == 0,
        'missing_concepts': missing_concepts,
        'found_columns': {k: v for k, v in found_columns.items() if v is not None},
        'available_concepts': available_concepts
    }


def get_standardized_column_mapping(df: pd.DataFrame, mappings: Dict[str, List[str]] = None) -> Dict[str, str]:
    if mappings is None:
        mappings = KEYWORD_COLUMN_MAPPINGS
    
    column_mapping = {}
    found_columns = find_multiple_column_names(df, list(mappings.keys()), mappings)
    
    for concept, actual_column in found_columns.items():
        if actual_column is not None:
            column_mapping[actual_column] = concept
    
    return column_mapping


# ========================================
# 特定业务逻辑的辅助函数
# ========================================

def get_traffic_column(df: pd.DataFrame) -> Optional[str]:
    return find_column_name(df, 'traffic')


def get_required_columns_for_keyword_filter(df: pd.DataFrame) -> List[str]:
    required_concepts = ['brand', 'position', 'url']
    found_columns = find_multiple_column_names(df, required_concepts)
    
    result = []
    for concept in required_concepts:
        if found_columns[concept] is not None:
            result.append(found_columns[concept])
    
    return result


def get_filterable_columns(df: pd.DataFrame) -> Dict[str, str]:
    found_columns = find_multiple_column_names(df, FILTERABLE_KEYWORD_COLUMNS)
    return {concept: column for concept, column in found_columns.items() if column is not None}


# ========================================
# 列名标准化函数
# ========================================

def standardize_dataframe_columns(df: pd.DataFrame, mappings: Dict[str, List[str]] = None, 
                                  inplace: bool = False) -> pd.DataFrame:
    if mappings is None:
        mappings = KEYWORD_COLUMN_MAPPINGS
    
    if not inplace:
        df = df.copy()
    
    column_mapping = get_standardized_column_mapping(df, mappings)
    
    # 重命名列为标准概念名
    reverse_mapping = {actual_col: concept for actual_col, concept in column_mapping.items()}
    df.rename(columns=reverse_mapping, inplace=True)
    
    return df


# ========================================
# 调试和信息函数
# ========================================

def analyze_dataframe_columns(df: pd.DataFrame, mappings: Dict[str, List[str]] = None) -> Dict[str, any]:
    if mappings is None:
        mappings = KEYWORD_COLUMN_MAPPINGS
    
    validation_result = validate_dataframe_columns(df, mappings=mappings)
    filterable_columns = get_filterable_columns(df)
    
    unmatched_columns = []
    for col in df.columns:
        matched = False
        for concept_columns in mappings.values():
            if col in concept_columns:
                matched = True
                break
        if not matched:
            unmatched_columns.append(col)
    
    return {
        'total_columns': len(df.columns),
        'all_columns': list(df.columns),
        'validation': validation_result,
        'filterable_columns': filterable_columns,
        'unmatched_columns': unmatched_columns,
        'recommendations': _generate_recommendations(df, mappings)
    }


def _generate_recommendations(df: pd.DataFrame, mappings: Dict[str, List[str]]) -> List[str]:
    recommendations = []
    validation = validate_dataframe_columns(df, mappings=mappings)
    
    if not validation['is_valid']:
        for missing_concept in validation['missing_concepts']:
            possible_names = get_all_possible_names(missing_concept, mappings)
            recommendations.append(
                f"缺失必需列概念 '{missing_concept}'，可能的列名: {', '.join(possible_names)}"
            )
    
    if 'traffic' not in validation['found_columns'] and 'search_volume' not in validation['found_columns']:
        recommendations.append("建议包含流量相关数据列（Traffic 或 Search Volume）以获得更好的分析效果")
    
    return recommendations


# ========================================
# 向后兼容性支持
# ========================================

# 为了向后兼容，提供原有函数名的别名
get_traffic_column_name = get_traffic_column


# ========================================
# 测试和示例函数
# ========================================

def create_sample_dataframe() -> pd.DataFrame:
    import pandas as pd
    
    data = {
        'Keyword': ['python tutorial', 'react guide', 'vue.js basics'],
        'Brand': ['TechSite A', 'TechSite B', 'TechSite A'],
        'Position': [1, 3, 5],
        'URL': ['https://example.com/python', 'https://example.com/react', 'https://example.com/vue'],
        'Search Volume': [1000, 800, 600],
        'Keyword Difficulty': [25, 45, 30],
        'CPC': [1.20, 2.50, 1.80]
    }
    
    return pd.DataFrame(data)


if __name__ == "__main__":
    # 测试代码
    sample_df = create_sample_dataframe()
    print("Sample DataFrame:")
    print(sample_df.head())
    print("\nColumn Analysis:")
    analysis = analyze_dataframe_columns(sample_df)
    print(f"Found columns: {analysis['validation']['found_columns']}")
    print(f"Recommendations: {analysis['recommendations']}")