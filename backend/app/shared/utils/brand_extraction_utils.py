"""
品牌提取工具模块 - 从文件名提取品牌信息
路径: backend/app/shared/utils/brand_extraction_utils.py
"""

import re
from typing import Optional
from urllib.parse import urlparse


def extract_brand_from_filename(filename: str) -> Optional[str]:
    """
    从文件名提取品牌信息，支持SEMRUSH格式
    
    Args:
        filename: 文件名
        
    Returns:
        提取的品牌名，如果无法提取则返回None
    """
    if not filename:
        return None
    
    # 移除文件扩展名
    base_name = filename.replace('.csv', '').replace('.xlsx', '').replace('.xls', '')
    
    # 模式1: https___www.makewordart.com_-organic.Positions-us-20250709-2025-07-11T04_01_52Z
    # 匹配 https___ 开头的格式
    pattern1 = r'^https?___([^_]+)_'
    match1 = re.match(pattern1, base_name)
    if match1:
        domain_part = match1.group(1)
        # 提取域名的主要部分 (去掉www等前缀)
        brand = extract_brand_from_domain(domain_part)
        if brand:
            return brand
    
    # 模式2: openart.ai_generator_word-art-organic.Positions-us-20250710-2025-07-11T03_57_02Z
    # 匹配直接以域名开头的格式
    pattern2 = r'^([a-zA-Z0-9-]+\.[a-zA-Z]{2,})_'
    match2 = re.match(pattern2, base_name)
    if match2:
        domain_part = match2.group(1)
        brand = extract_brand_from_domain(domain_part)
        if brand:
            return brand
    
    # 模式3: 尝试提取可能的域名格式
    # 查找类似域名的模式
    domain_pattern = r'([a-zA-Z0-9-]+\.[a-zA-Z]{2,})'
    domain_matches = re.findall(domain_pattern, base_name)
    if domain_matches:
        # 取第一个匹配的域名
        domain = domain_matches[0]
        brand = extract_brand_from_domain(domain)
        if brand:
            return brand
    
    return None


def extract_brand_from_domain(domain: str) -> Optional[str]:
    """
    从域名提取品牌名
    
    Args:
        domain: 域名字符串
        
    Returns:
        提取的品牌名
    """
    if not domain:
        return None
    
    # 清理域名
    domain = domain.lower().strip()
    
    # 移除协议前缀
    if domain.startswith('http://'):
        domain = domain[7:]
    elif domain.startswith('https://'):
        domain = domain[8:]
    
    # 移除www前缀
    if domain.startswith('www.'):
        domain = domain[4:]
    
    # 分割域名获取主要部分
    parts = domain.split('.')
    if len(parts) >= 2:
        # 取主域名部分 (去掉顶级域名)
        main_part = parts[0]
        
        # 处理常见的品牌名提取
        # 如果包含连字符，取第一部分
        if '-' in main_part:
            brand_parts = main_part.split('-')
            # 选择最长的有意义部分
            main_part = max(brand_parts, key=len)
        
        # 过滤掉太短的品牌名
        if len(main_part) >= 3:
            return main_part
    
    return None


def add_brand_column_from_filename(df, filename: str, brand_column_name: str = 'Brand') -> None:
    """
    根据文件名为DataFrame添加Brand列
    
    Args:
        df: pandas DataFrame
        filename: 文件名
        brand_column_name: Brand列的名称
    """
    if df.empty:
        return
    
    # 尝试从文件名提取品牌
    extracted_brand = extract_brand_from_filename(filename)
    
    if extracted_brand:
        # 添加Brand列，所有行都使用提取的品牌名
        df[brand_column_name] = extracted_brand
    else:
        # 如果无法提取，设置为"Other"
        df[brand_column_name] = "Other"


def enhance_brand_identification(df, filename: str, existing_brand_column: Optional[str] = None) -> str:
    """
    增强品牌识别：优先使用现有Brand列，然后尝试从文件名提取，最后使用"Other"兜底
    
    Args:
        df: pandas DataFrame
        filename: 文件名
        existing_brand_column: 现有的Brand列名（如果存在）
        
    Returns:
        使用的Brand列名
    """
    # 1. 如果已经有Brand列且不为空，直接使用
    if existing_brand_column and existing_brand_column in df.columns:
        non_null_count = df[existing_brand_column].notna().sum()
        if non_null_count > 0:
            # 填充空值为"Other"
            df[existing_brand_column] = df[existing_brand_column].fillna("Other")
            return existing_brand_column
    
    # 2. 尝试从文件名提取Brand
    extracted_brand = extract_brand_from_filename(filename)
    
    # 确定Brand列名
    brand_column = existing_brand_column if existing_brand_column else 'Brand'
    
    if extracted_brand:
        # 使用提取的品牌名
        df[brand_column] = extracted_brand
    else:
        # 使用"Other"作为兜底
        df[brand_column] = "Other"
    
    return brand_column


def test_brand_extraction():
    """测试品牌提取功能"""
    test_cases = [
        "https___www.makewordart.com_-organic.Positions-us-20250709-2025-07-11T04_01_52Z.csv",
        "openart.ai_generator_word-art-organic.Positions-us-20250710-2025-07-11T03_57_02Z.csv",
        "example-site.com_data_export.csv",
        "regular_filename.csv",
        "techcrunch.com_articles.xlsx"
    ]
    
    print("Brand extraction test results:")
    for filename in test_cases:
        brand = extract_brand_from_filename(filename)
        print(f"{filename} -> {brand}")


if __name__ == "__main__":
    test_brand_extraction()