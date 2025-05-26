"""
URL和域名处理的工具函数模块
"""

import re
from typing import Optional, Set, Dict, Any, List
from urllib.parse import urlparse, parse_qs


def normalize_domain(domain: str) -> str:
    if not isinstance(domain, str):
        return ""
            
    domain = domain.lower().strip()
    
    # 移除www前缀
    if domain.startswith('www.'):
        domain = domain[4:]
        
    return domain


def extract_domain(url: str) -> str:
    try:
        domain = urlparse(url).netloc.lower()
        
        # 移除端口号
        if ':' in domain:
            domain = domain.split(':')[0]
        
        # 移除www前缀
        if domain.startswith('www.'):
            domain = domain[4:]
            
        return domain
    except Exception:
        return ""


def get_domain_from_url(url: str) -> Optional[str]:
    domain = extract_domain(url)
    return domain if domain else None


def extract_root_domain(url: str) -> str:
    try:
        url_obj = urlparse(url)
        hostname = url_obj.netloc.lower()
        
        # 移除端口号
        if ':' in hostname:
            hostname = hostname.split(':')[0]
        
        # 如果没有netloc，尝试从path中提取域名
        if not hostname and url_obj.path:
            path_parts = url_obj.path.split('/')
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
        
    except Exception:
        # 如果URL解析失败，尝试从字符串中提取类似域名的部分
        domain_match = url.replace('http://', '').replace('https://', '').split('/')[0]
        return domain_match.lower()


def check_domain_match(source_domain: str, domain_cache: Set[str]) -> bool:
    if not source_domain or not domain_cache:
        return False
    
    # 直接匹配
    if source_domain in domain_cache:
        return True
        
    # 子域名匹配
    for domain in domain_cache:
        if source_domain.endswith('.' + domain):
            return True
            
    return False


def is_valid_url(url: str) -> bool:
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def get_url_path_parts(url: str) -> List[str]:
    try:
        parsed = urlparse(url)
        path = parsed.path
        # 分割路径并移除空元素
        return [p for p in path.split('/') if p]
    except Exception:
        return []


def is_internal_url(url: str, base_url: Optional[str]) -> bool:
    if not base_url:
        return False
        
    # 处理相对URL
    if not url.startswith(('http://', 'https://', 'mailto:', 'tel:', '#')):
        return True
        
    # 处理绝对URL
    base_domain = get_domain_from_url(base_url)
    url_domain = get_domain_from_url(url)
    
    return base_domain and url_domain and base_domain == url_domain


def parse_url_parts(url: str) -> Dict[str, Any]:
    try:
        parsed = urlparse(url)
        return {
            'scheme': parsed.scheme,
            'domain': parsed.netloc,
            'path': parsed.path,
            'query': parsed.query,
            'fragment': parsed.fragment,
            'params': parse_qs(parsed.query)
        }
    except Exception:
        return {
            'scheme': '',
            'domain': '',
            'path': '',
            'query': '',
            'fragment': '',
            'params': {}
        }


def has_mixed_content(page_url: str, resource_url: str) -> bool:
    if not page_url or not resource_url:
        return False
        
    return page_url.startswith('https://') and resource_url.startswith('http://')


def is_same_domain(url1: str, url2: str) -> bool:
    domain1 = extract_root_domain(url1)
    domain2 = extract_root_domain(url2)
    
    return domain1 and domain2 and domain1 == domain2


def get_url_without_params(url: str) -> str:
    try:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    except Exception:
        return url


def normalize_url(url: str) -> str:
    try:
        parsed = urlparse(url.lower().strip())
        
        # 规范化scheme
        scheme = 'https' if parsed.scheme == 'http' else parsed.scheme
        
        # 规范化域名
        domain = normalize_domain(parsed.netloc)
        
        # 规范化路径
        path = parsed.path.rstrip('/') if parsed.path != '/' else '/'
        
        # 重建URL
        normalized = f"{scheme}://{domain}{path}"
        
        # 添加查询参数和fragment（如果有）
        if parsed.query:
            normalized += f"?{parsed.query}"
        if parsed.fragment:
            normalized += f"#{parsed.fragment}"
            
        return normalized
    except Exception:
        return url


def is_absolute_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return bool(parsed.scheme and parsed.netloc)
    except Exception:
        return False


def join_urls(base_url: str, relative_url: str) -> str:
    try:
        from urllib.parse import urljoin
        return urljoin(base_url, relative_url)
    except Exception:
        return relative_url if is_absolute_url(relative_url) else base_url + relative_url


def extract_subdomain(url: str) -> str:
    try:
        domain = extract_domain(url)
        root_domain = extract_root_domain(url)
        
        if domain == root_domain:
            return ""
        
        # 移除根域名部分
        if domain.endswith('.' + root_domain):
            subdomain = domain[:-len('.' + root_domain)]
            return subdomain
        
        return ""
    except Exception:
        return ""


def is_nofollow_link(rel_attr) -> bool:
    if not rel_attr:
        return False
        
    # rel属性可能是列表或字符串
    if isinstance(rel_attr, list):
        return 'nofollow' in rel_attr
    elif isinstance(rel_attr, str):
        return 'nofollow' in rel_attr.split()
        
    return False