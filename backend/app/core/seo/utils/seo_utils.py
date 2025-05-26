"""
SEO工具函数模块

提供SEO相关的通用工具函数，包括文本处理、URL分析、内容检测等功能。
这些函数被SEO检查器和处理器使用。

重构说明：
- 原文件：app/services/seo/utils.py
- 新位置：app/core/seo/utils/seo_utils.py
- 保持所有原有功能不变
"""

import re
from typing import Dict, Any, List, Optional, Set, Tuple, Union
from urllib.parse import urlparse, parse_qs


def estimate_pixel_width(text: str) -> int:
    """
    估算文本的像素宽度
    
    这是一个简单的启发式方法，假设:
    - 英文字母、数字、标点平均约7像素宽
    - 中文字符约14像素宽
    - 空格约3像素宽
    
    Args:
        text: 要估算的文本
        
    Returns:
        int: 估计的像素宽度
    """
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
    """
    截断字符串并添加省略号
    
    用于显示太长的HTML元素
    
    Args:
        s: 要截断的字符串
        max_length: 最大长度，默认100
        
    Returns:
        str: 截断后的字符串
    """
    if not s or len(s) <= max_length:
        return s
    return s[:max_length] + ('...' if len(s) > max_length else '')


def format_element_str(element, max_length: int = 100) -> str:
    """
    格式化元素为字符串并限制长度
    
    Args:
        element: 要格式化的元素
        max_length: 最大长度，默认100
        
    Returns:
        str: 格式化后的字符串
    """
    element_str = str(element)
    return truncate_string(element_str, max_length)


def is_valid_url(url: str) -> bool:
    """
    检查URL是否有效
    
    Args:
        url: 要检查的URL
        
    Returns:
        bool: URL是否有效
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False


def get_domain_from_url(url: str) -> Optional[str]:
    """
    从URL中提取域名
    
    Args:
        url: 要提取域名的URL
        
    Returns:
        Optional[str]: 提取出的域名，失败时返回None
    """
    try:
        parsed = urlparse(url)
        return parsed.netloc
    except:
        return None


def is_internal_url(url: str, base_url: Optional[str]) -> bool:
    """
    判断URL是否为内部链接
    
    Args:
        url: 要判断的URL
        base_url: 基础URL，用于比较
        
    Returns:
        bool: 是否为内部链接
    """
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
    """
    检查rel属性是否包含nofollow
    
    Args:
        rel_attr: rel属性值，可以是字符串或列表
        
    Returns:
        bool: 是否包含nofollow
    """
    if not rel_attr:
        return False
        
    # rel属性可能是列表或字符串
    if isinstance(rel_attr, list):
        return 'nofollow' in rel_attr
    elif isinstance(rel_attr, str):
        return 'nofollow' in rel_attr.split()
        
    return False


def get_language_from_html(text: str) -> str:
    """
    简单检测文本的主要语言
    
    基于中文字符比例判断
    
    Args:
        text: 要检测的文本
        
    Returns:
        str: 语言代码，'zh-CN'或'en-US'
    """
    if not text:
        return 'en-US'
        
    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    is_chinese = chinese_chars / len(text) > 0.5
    return 'zh-CN' if is_chinese else 'en-US'


def parse_url_parts(url: str) -> Dict[str, Any]:
    """
    解析URL的各个部分
    
    返回域名、路径、查询参数等
    
    Args:
        url: 要解析的URL
        
    Returns:
        Dict[str, Any]: 解析结果字典
    """
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
    """
    从HTML内容中提取纯文本
    
    简单实现，不使用BeautifulSoup
    
    Args:
        html_content: HTML内容
        
    Returns:
        str: 提取的纯文本
    """
    # 移除HTML标签
    text = re.sub(r'<[^>]+>', ' ', html_content)
    # 移除多余空白
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def count_words(text: str) -> int:
    """
    计算文本中的单词数量
    
    Args:
        text: 要计算的文本
        
    Returns:
        int: 单词数量
    """
    # 分割文本为单词
    words = re.findall(r'\b\w+\b', text)
    return len(words)


def split_sentences(text: str) -> List[str]:
    """
    将文本分割为句子
    
    Args:
        text: 要分割的文本
        
    Returns:
        List[str]: 句子列表
    """
    # 使用常见的句子终止符
    sentences = re.split(r'[。！？.!?]', text)
    # 过滤空句子
    return [s.strip() for s in sentences if s.strip()]


def has_mixed_content(page_url: str, resource_url: str) -> bool:
    """
    检查是否是混合内容
    
    当页面是HTTPS但资源是HTTP时返回True
    
    Args:
        page_url: 页面URL
        resource_url: 资源URL
        
    Returns:
        bool: 是否为混合内容
    """
    if not page_url or not resource_url:
        return False
        
    return page_url.startswith('https://') and resource_url.startswith('http://')


def contains_lorem_ipsum(text: str) -> bool:
    """
    检查文本是否包含Lorem Ipsum占位文本
    
    Args:
        text: 要检查的文本
        
    Returns:
        bool: 是否包含Lorem Ipsum
    """
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
    """
    检测内容是否暗示这是一个"软404"页面
    
    Args:
        text: 要检测的文本内容
        
    Returns:
        bool: 是否为软404内容
    """
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
    """
    检查是否为非描述性锚文本
    
    Args:
        text: 锚文本
        
    Returns:
        bool: 是否为非描述性锚文本
    """
    non_descriptive_terms = [
        '点击这里', '查看更多', '了解详情', '详情', '点击', '这里', '更多', 
        'click here', 'read more', 'learn more', 'more', 'click', 'here', 
        'details', 'view more', 'see more'
    ]
    
    text_lower = text.lower().strip()
    return any(term == text_lower or term in text_lower for term in non_descriptive_terms)


def is_empty_or_whitespace(text: str) -> bool:
    """
    检查文本是否为空或只包含空白字符
    
    Args:
        text: 要检查的文本
        
    Returns:
        bool: 是否为空或空白
    """
    return not text or text.strip() == ''


def get_content_type_from_extension(filename: str) -> str:
    """
    从文件扩展名获取内容类型
    
    Args:
        filename: 文件名
        
    Returns:
        str: MIME类型
    """
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
    """
    规范化文本中的空白字符
    
    Args:
        text: 要规范化的文本
        
    Returns:
        str: 规范化后的文本
    """
    if not text:
        return ""
    
    # 将多个空白字符替换为单个空格
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_domain_from_email(email: str) -> Optional[str]:
    """
    从邮箱地址中提取域名
    
    Args:
        email: 邮箱地址
        
    Returns:
        Optional[str]: 域名，如果解析失败返回None
    """
    if not email or '@' not in email:
        return None
    
    try:
        domain_part = email.split('@')[1]
        return domain_part.lower()
    except (IndexError, AttributeError):
        return None


def is_social_media_url(url: str) -> bool:
    """
    检查URL是否为社交媒体链接
    
    Args:
        url: 要检查的URL
        
    Returns:
        bool: 是否为社交媒体链接
    """
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
    """
    清理URL，移除不必要的参数和片段
    
    Args:
        url: 要清理的URL
        
    Returns:
        str: 清理后的URL
    """
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
    """
    检查URL是否指向图片资源
    
    Args:
        url: 要检查的URL
        
    Returns:
        bool: 是否为图片URL
    """
    image_extensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', 
        '.bmp', '.ico', '.tiff', '.tif'
    ]
    
    url_lower = url.lower()
    return any(url_lower.endswith(ext) for ext in image_extensions)


def extract_numbers_from_text(text: str) -> List[float]:
    """
    从文本中提取所有数字
    
    Args:
        text: 要提取数字的文本
        
    Returns:
        List[float]: 提取的数字列表
    """
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
    """
    计算两个文本的相似度（简单的词汇重叠）
    
    Args:
        text1: 第一个文本
        text2: 第二个文本
        
    Returns:
        float: 相似度分数（0-1之间）
    """
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
    """
    验证HTML属性值是否合法
    
    Args:
        attribute_value: 属性值
        attribute_type: 属性类型（如'url', 'email', 'color'等）
        
    Returns:
        bool: 是否合法
    """
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