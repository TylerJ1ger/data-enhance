"""
URL和域名处理的辅助函数
提供对URL和域名进行处理的工具函数，包括规范化、提取和匹配等功能
"""

from typing import Optional, Set
from urllib.parse import urlparse

def normalize_domain(domain: str) -> str:
    """
    简单规范化域名格式，移除www前缀并转为小写
    
    Args:
        domain: 需要规范化的域名
        
    Returns:
        规范化后的域名字符串
    """
    if not isinstance(domain, str):
        return ""
            
    domain = domain.lower().strip()
    
    # 移除www前缀
    if domain.startswith('www.'):
        domain = domain[4:]
        
    return domain

def extract_domain(url: str) -> str:
    """
    从URL中简单提取域名 - 基本版本
    
    Args:
        url: 需要提取域名的URL
        
    Returns:
        提取出的域名，如果解析失败则返回空字符串
    """
    try:
        domain = urlparse(url).netloc.lower()
        
        # 移除www前缀
        if domain.startswith('www.'):
            domain = domain[4:]
            
        return domain
    except:
        return ""

def extract_root_domain(url: str) -> str:
    """
    更健壮的从URL中提取根域名的方法，处理各种特殊情况
    
    Args:
        url: 需要提取根域名的URL
        
    Returns:
        提取出的根域名，如果解析失败则尝试从字符串中提取类似域名的部分
    """
    try:
        urlObj = urlparse(url)
        hostname = urlObj.netloc.lower()
        
        # 如果没有netloc，尝试从path中提取域名
        if not hostname and urlObj.path:
            path_parts = urlObj.path.split('/')
            if len(path_parts) > 0 and '.' in path_parts[0]:
                hostname = path_parts[0]
        
        # 处理IP地址的情况
        if hostname and hostname[0].isdigit() and all(part.isdigit() for part in hostname.split('.')):
            return hostname
        
        # 移除www前缀
        if hostname.startswith('www.'):
            hostname = hostname[4:]
        
        # 分割域名部分
        parts = hostname.split('.')
        
        # 如果只有两部分或更少，直接返回
        if len(parts) <= 2:
            return hostname
        
        # 识别根域名的规则集
        # 常见的顶级域名
        common_tlds = [
            'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co', 'ai', 'app',
            'dev', 'me', 'info', 'biz', 'tv', 'us', 'uk', 'cn', 'jp', 'de', 'fr'
        ]
        
        # 处理二级顶级域名的情况，如.co.uk，.com.au等
        if len(parts) >= 3:
            # 处理特殊情况，如example.co.uk
            if parts[-2] in ['co', 'com', 'org', 'net', 'ac', 'gov', 'edu'] and len(parts[-1]) == 2:
                if len(parts) > 3:
                    # 形如subdomain.example.co.uk，返回example.co.uk
                    return f"{parts[-3]}.{parts[-2]}.{parts[-1]}"
                else:
                    # 形如example.co.uk，直接返回
                    return hostname
            
            # 对于uptodown.com这样的域名，确保子域名如seeu-ai.id.uptodown.com被识别为uptodown.com
            for tld in common_tlds:
                if parts[-1] == tld:
                    # 返回主域名和TLD
                    return f"{parts[-2]}.{parts[-1]}"
            
            # 对于leonardo.ai这样的域名，确保子域名如app.leonardo.ai被识别为leonardo.ai
            if len(parts) >= 2:
                last_part = parts[-1]
                if last_part not in common_tlds:
                    # 如果最后一部分不是常见TLD，可能是类似.ai的域名
                    # 返回最后两个部分
                    return f"{parts[-2]}.{parts[-1]}"
        
        # 默认情况，返回hostname
        return hostname
        
    except Exception as e:
        # 如果URL解析失败，尝试从字符串中提取类似域名的部分
        domain_match = url.replace('http://', '').replace('https://', '').split('/')[0]
        return domain_match.lower()

def check_domain_match(source_domain: str, domain_cache: Set[str]) -> bool:
    """
    检查源域名是否与已缓存的域名匹配，支持子域名匹配
    
    Args:
        source_domain: 要检查的源域名
        domain_cache: 已缓存的域名集合
        
    Returns:
        如果域名匹配返回True，否则返回False
    """
    # 直接匹配
    if source_domain in domain_cache:
        return True
        
    # 子域名匹配
    for domain in domain_cache:
        if source_domain.endswith('.' + domain):
            return True
            
    return False

def is_valid_url(url: str) -> bool:
    """
    检查URL是否有效
    
    Args:
        url: 要检查的URL
        
    Returns:
        如果URL有效返回True，否则返回False
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def get_url_path_parts(url: str) -> list:
    """
    从URL中提取路径部分并分割为列表
    
    Args:
        url: 要处理的URL
        
    Returns:
        路径部分的列表，不包含空元素
    """
    try:
        parsed = urlparse(url)
        path = parsed.path
        # 分割路径并移除空元素
        return [p for p in path.split('/') if p]
    except:
        return []