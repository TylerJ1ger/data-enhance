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
    """
    if not s or len(s) <= max_length:
        return s
    return s[:max_length] + ('...' if len(s) > max_length else '')

def format_element_str(element, max_length: int = 100) -> str:
    """
    格式化元素为字符串并限制长度
    """
    element_str = str(element)
    return truncate_string(element_str, max_length)

def is_valid_url(url: str) -> bool:
    """
    检查URL是否有效
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def get_domain_from_url(url: str) -> Optional[str]:
    """
    从URL中提取域名
    """
    try:
        parsed = urlparse(url)
        return parsed.netloc
    except:
        return None

def is_internal_url(url: str, base_url: Optional[str]) -> bool:
    """
    判断URL是否为内部链接
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
    """
    # 移除HTML标签
    text = re.sub(r'<[^>]+>', ' ', html_content)
    # 移除多余空白
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def count_words(text: str) -> int:
    """
    计算文本中的单词数量
    """
    # 分割文本为单词
    words = re.findall(r'\b\w+\b', text)
    return len(words)

def split_sentences(text: str) -> List[str]:
    """
    将文本分割为句子
    """
    # 使用常见的句子终止符
    sentences = re.split(r'[。！？.!?]', text)
    # 过滤空句子
    return [s.strip() for s in sentences if s.strip()]

def has_mixed_content(page_url: str, resource_url: str) -> bool:
    """
    检查是否是混合内容
    当页面是HTTPS但资源是HTTP时返回True
    """
    if not page_url or not resource_url:
        return False
        
    return page_url.startswith('https://') and resource_url.startswith('http://')

def contains_lorem_ipsum(text: str) -> bool:
    """
    检查文本是否包含Lorem Ipsum占位文本
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
    """
    return not text or text.strip() == ''

def get_content_type_from_extension(filename: str) -> str:
    """
    从文件扩展名获取内容类型
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