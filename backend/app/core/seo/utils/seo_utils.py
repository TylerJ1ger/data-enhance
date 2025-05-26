"""
SEO工具函数模块
"""

import re
from typing import Dict, Any, List, Optional, Set, Tuple, Union
from urllib.parse import urlparse, parse_qs


def estimate_pixel_width(text: str) -> int:
    if not text:
        return 0
        
    pixel_width = 0
    for char in text:
        if ord(char) > 127:  # 非ASCII字符(如中文、日文等)
            pixel_width += 14
        elif char.isspace():  # 空格
            pixel_width += 3
        else:  # ASCII字符(英文字母、数字、标点)
            pixel_width += 7
            
    return pixel_width


def truncate_string(s: str, max_length: int = 100) -> str:
    if not s or len(s) <= max_length:
        return s
    return s[:max_length] + ('...' if len(s) > max_length else '')


def format_element_str(element, max_length: int = 100) -> str:
    element_str = str(element)
    return truncate_string(element_str, max_length)


def is_valid_url(url: str) -> bool:
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False


def get_domain_from_url(url: str) -> Optional[str]:
    try:
        parsed = urlparse(url)
        return parsed.netloc
    except:
        return None


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


def is_nofollow_link(rel_attr) -> bool:
    if not rel_attr:
        return False
        
    # rel属性可能是列表或字符串
    if isinstance(rel_attr, list):
        return 'nofollow' in rel_attr
    elif isinstance(rel_attr, str):
        return 'nofollow' in rel_attr.split()
        
    return False


def get_language_from_html(text: str) -> str:
    if not text:
        return 'en-US'
        
    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    is_chinese = chinese_chars / len(text) > 0.5
    return 'zh-CN' if is_chinese else 'en-US'


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
    except:
        return {
            'scheme': '',
            'domain': '',
            'path': '',
            'query': '',
            'fragment': '',
            'params': {}
        }


def extract_text_from_html(html_content: str) -> str:
    # 移除HTML标签
    text = re.sub(r'<[^>]+>', ' ', html_content)
    # 移除多余空白
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def count_words(text: str) -> int:
    # 分割文本为单词
    words = re.findall(r'\b\w+\b', text)
    return len(words)


def split_sentences(text: str) -> List[str]:
    # 使用常见的句子终止符
    sentences = re.split(r'[。！？.!?]', text)
    # 过滤空句子
    return [s.strip() for s in sentences if s.strip()]


def has_mixed_content(page_url: str, resource_url: str) -> bool:
    if not page_url or not resource_url:
        return False
        
    return page_url.startswith('https://') and resource_url.startswith('http://')


def contains_lorem_ipsum(text: str) -> bool:
    lorem_patterns = [
        r'lorem\s+ipsum',
        r'dolor\s+sit\s+amet',
        r'consectetur\s+adipiscing\s+elit',
    ]
    
    text_lower = text.lower()
    for pattern in lorem_patterns:
        if re.search(pattern, text_lower):
            return True
            
    return False


def is_soft_404_content(text: str) -> bool:
    soft_404_patterns = [
        "找不到页面", "不存在", "已删除", "page not found", "404", 
        "does not exist", "no longer available", "been removed",
        "无法找到", "抱歉，您访问的页面不存在", "sorry, the page you requested was not found"
    ]
    
    text_lower = text.lower()
    for pattern in soft_404_patterns:
        if pattern.lower() in text_lower:
            return True
            
    return False


def is_non_descriptive_anchor(text: str) -> bool:
    non_descriptive_terms = [
        '点击这里', '查看更多', '了解详情', '详情', '点击', '这里', '更多', 
        'click here', 'read more', 'learn more', 'more', 'click', 'here', 
        'details', 'view more', 'see more'
    ]
    
    text_lower = text.lower().strip()
    return any(term == text_lower or term in text_lower for term in non_descriptive_terms)


def is_empty_or_whitespace(text: str) -> bool:
    return not text or text.strip() == ''


def get_content_type_from_extension(filename: str) -> str:
    ext = filename.lower().split('.')[-1]
    content_types = {
        'html': 'text/html',
        'htm': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
    }
    return content_types.get(ext, 'application/octet-stream')


def normalize_whitespace(text: str) -> str:
    if not text:
        return ""
    
    # 将多个空白字符替换为单个空格
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_domain_from_email(email: str) -> Optional[str]:
    if not email or '@' not in email:
        return None
    
    try:
        domain_part = email.split('@')[1]
        return domain_part.lower()
    except (IndexError, AttributeError):
        return None


def is_social_media_url(url: str) -> bool:
    social_domains = [
        'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
        'youtube.com', 'tiktok.com', 'pinterest.com', 'snapchat.com',
        'weibo.com', 'douyin.com', 'xiaohongshu.com'
    ]
    
    domain = get_domain_from_url(url)
    if not domain:
        return False
    
    # 移除www前缀
    if domain.startswith('www.'):
        domain = domain[4:]
    
    return any(social_domain in domain for social_domain in social_domains)


def clean_url(url: str) -> str:
    if not url:
        return ""
    
    try:
        parsed = urlparse(url)
        # 重新构建URL，去掉fragment和查询参数
        clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        return clean_url
    except:
        return url


def is_image_url(url: str) -> bool:
    image_extensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', 
        '.bmp', '.ico', '.tiff', '.tif'
    ]
    
    url_lower = url.lower()
    return any(url_lower.endswith(ext) for ext in image_extensions)


def extract_numbers_from_text(text: str) -> List[float]:
    if not text:
        return []
    
    # 匹配整数和小数
    number_pattern = r'-?\d+\.?\d*'
    matches = re.findall(number_pattern, text)
    
    numbers = []
    for match in matches:
        try:
            numbers.append(float(match))
        except ValueError:
            continue
    
    return numbers


def calculate_text_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    
    # 转换为小写并分割为单词
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    if not words1 or not words2:
        return 0.0
    
    # 计算交集和并集
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    # 返回Jaccard相似度
    return len(intersection) / len(union) if union else 0.0


def validate_html_attribute(attribute_value: str, attribute_type: str = "generic") -> bool:
    if not attribute_value:
        return False
    
    if attribute_type == "url":
        return is_valid_url(attribute_value)
    elif attribute_type == "email":
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, attribute_value))
    elif attribute_type == "color":
        # 支持hex颜色码和常见颜色名
        color_pattern = r'^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$'
        common_colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray']
        return bool(re.match(color_pattern, attribute_value)) or attribute_value.lower() in common_colors
    else:
        # 通用验证：不包含危险字符
        dangerous_chars = ['<', '>', '"', "'", '&']
        return not any(char in attribute_value for char in dangerous_chars)