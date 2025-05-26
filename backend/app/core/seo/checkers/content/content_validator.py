"""
内容验证器模块
"""

import importlib.util
import logging
import re
from typing import Optional, Dict, Any
from urllib.parse import urlparse
from bs4 import Tag


class ContentValidator:   
    def __init__(self):
        """初始化内容验证器"""
        # 配置日志记录
        self._setup_logging()
        self.logger = logging.getLogger('ContentValidator')
    
    def _setup_logging(self):
        """设置日志配置"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # ================== 库可用性检查 ==================
    
    def check_library_available(self, library_name: str) -> bool:
        try:
            # 针对常用库进行特殊检查
            if library_name == 'goose3':
                import goose3
                # 仅验证可导入性，不在此方法中创建实例
                return True
            elif library_name == 'newspaper':
                import newspaper
                return True
            elif library_name == 'trafilatura':
                import trafilatura
                return True
            elif library_name == 'readability':
                import readability
                return True
            elif library_name == 'language_tool_python':
                import language_tool_python
                return True
            elif library_name == 'textstat':
                import textstat
                return True
            else:
                # 通用库检查
                return importlib.util.find_spec(library_name) is not None
                
        except ImportError:
            self.logger.warning(f"库 {library_name} 未安装或无法导入")
            return False
        except Exception as e:
            self.logger.warning(f"检查库 {library_name} 时出现问题: {str(e)}")
            return False
    
    # ================== HTML元素验证 ==================
    
    def is_element_visible(self, element: Tag) -> bool:
        if not element:
            return False
            
        # 检查内联样式中的隐藏属性
        style = element.get('style', '').lower()
        if 'display: none' in style or 'visibility: hidden' in style:
            return False
            
        # 检查class是否包含常见的隐藏类名
        classes = element.get('class', [])
        if isinstance(classes, str):
            classes = classes.split()
            
        hidden_classes = ['hidden', 'hide', 'invisible', 'd-none', 'display-none', 'sr-only']
        for cls in classes:
            if cls.lower() in hidden_classes:
                return False
                
        return True
    
    def has_attr_containing(self, element: Tag, attr_name: str, value: str) -> bool:
        if not element or not element.has_attr(attr_name):
            return False
            
        attr_value = element[attr_name]
        if isinstance(attr_value, list):
            # 对于列表类型的属性(如class)
            return any(value.lower() in item.lower() for item in attr_value)
        else:
            # 对于字符串类型的属性
            return value.lower() in attr_value.lower()
    
    def get_element_text(self, element: Optional[Tag]) -> str:
        if not element:
            return ""
        return element.get_text(strip=True)
    
    # ================== 文本分析工具 ==================
    
    def count_words(self, text: str) -> int:
        if not text:
            return 0
            
        # 移除HTML标签(如果有)
        text = re.sub(r'<[^>]+>', '', text)
        
        # 移除多余的空白字符
        text = re.sub(r'\s+', ' ', text).strip()
        
        # 分割单词并计数
        words = text.split()
        return len(words)
    
    def estimate_pixel_width(self, text: str) -> int:
        if not text:
            return 0
            
        pixel_width = 0
        for char in text:
            if ord(char) > 127:  # 非ASCII字符(如中文、日文等)
                pixel_width += 14
            elif char.isspace():  # 空格
                pixel_width += 3
            elif char.isalpha() and ord(char) < 128:  # 英文字母
                pixel_width += 7
            elif char.isdigit():  # 数字
                pixel_width += 7
            else:  # 其他ASCII字符(如标点)
                pixel_width += 7
                
        return pixel_width
    
    # ================== URL验证 ==================
    
    def validate_url_structure(self, url: str) -> Dict[str, Any]:
        validation_results = {
            "is_valid": False,
            "has_scheme": False,
            "has_netloc": False,
            "is_secure": False,
            "has_fragment": False,
            "has_query": False,
            "scheme": "",
            "netloc": "",
            "path": "",
            "query": "",
            "fragment": ""
        }
        
        try:
            parsed = urlparse(url)
            
            # 基本组件检查
            validation_results["has_scheme"] = bool(parsed.scheme)
            validation_results["has_netloc"] = bool(parsed.netloc)
            validation_results["is_secure"] = parsed.scheme == 'https'
            validation_results["has_fragment"] = bool(parsed.fragment)
            validation_results["has_query"] = bool(parsed.query)
            validation_results["is_valid"] = bool(parsed.scheme and parsed.netloc)
            
            # 详细信息
            validation_results["scheme"] = parsed.scheme
            validation_results["netloc"] = parsed.netloc
            validation_results["path"] = parsed.path
            validation_results["query"] = parsed.query
            validation_results["fragment"] = parsed.fragment
            
        except Exception as e:
            self.logger.warning(f"URL验证失败: {str(e)}")
        
        return validation_results
    
    # ================== 内容模式检查 ==================
    
    def check_content_patterns(self, text: str) -> Dict[str, Any]:
        pattern_results = {
            "has_lorem_ipsum": False,
            "has_placeholder_text": False,
            "has_error_keywords": False,
            "has_navigation_text": False,
            "has_copyright_text": False,
            "has_contact_info": False,
            "has_social_media_refs": False,
            "detected_language": "unknown"
        }
        
        if not text:
            return pattern_results
        
        text_lower = text.lower()
        
        # 检查Lorem Ipsum占位符文本
        lorem_patterns = [
            r'lorem\s+ipsum',
            r'dolor\s+sit\s+amet',
            r'consectetur\s+adipiscing\s+elit',
            r'sed\s+do\s+eiusmod\s+tempor'
        ]
        pattern_results["has_lorem_ipsum"] = any(
            re.search(pattern, text_lower) for pattern in lorem_patterns
        )
        
        # 检查占位符文本
        placeholder_keywords = [
            'placeholder', 'sample text', 'dummy text', 'test content',
            'coming soon', 'under construction', 'lorem ipsum',
            '待编辑', '内容待更新', '敬请期待', '正在建设中'
        ]
        pattern_results["has_placeholder_text"] = any(
            keyword in text_lower for keyword in placeholder_keywords
        )
        
        # 检查错误关键词
        error_keywords = [
            'error', '错误', 'not found', '找不到', '页面不存在',
            'server error', '服务器错误', 'access denied', '访问被拒绝',
            '404', '500', '503', 'forbidden', '禁止访问'
        ]
        pattern_results["has_error_keywords"] = any(
            keyword in text_lower for keyword in error_keywords
        )
        
        # 检查导航文本
        nav_keywords = [
            'home', 'about', 'contact', 'menu', 'navigation', 'sitemap',
            'search', 'login', 'register', 'cart', 'checkout',
            '首页', '关于', '联系', '菜单', '导航', '网站地图',
            '搜索', '登录', '注册', '购物车', '结账'
        ]
        pattern_results["has_navigation_text"] = any(
            keyword in text_lower for keyword in nav_keywords
        )
        
        # 检查版权文本
        copyright_patterns = [
            r'copyright\s*©',
            r'©.*all\s+rights\s+reserved',
            r'版权所有',
            r'©.*保留所有权利',
            r'\d{4}\s*©',
            r'©\s*\d{4}'
        ]
        pattern_results["has_copyright_text"] = any(
            re.search(pattern, text_lower) for pattern in copyright_patterns
        )
        
        # 检查联系信息
        contact_patterns = [
            r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # 电话号码
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # 邮箱
            r'\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr)\b'  # 地址
        ]
        pattern_results["has_contact_info"] = any(
            re.search(pattern, text_lower) for pattern in contact_patterns
        )
        
        # 检查社交媒体引用
        social_keywords = [
            'facebook', 'twitter', 'instagram', 'linkedin', 'youtube',
            'wechat', 'weibo', 'tiktok', 'snapchat', 'pinterest',
            '微信', '微博', '抖音'
        ]
        pattern_results["has_social_media_refs"] = any(
            keyword in text_lower for keyword in social_keywords
        )
        
        # 简单的语言检测
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        total_chars = len(text)
        if total_chars > 0:
            chinese_ratio = chinese_chars / total_chars
            if chinese_ratio > 0.3:
                pattern_results["detected_language"] = "chinese"
            elif chinese_ratio < 0.1:
                pattern_results["detected_language"] = "english"
            else:
                pattern_results["detected_language"] = "mixed"
        
        return pattern_results
    
    # ================== 内容质量评估 ==================
    
    def assess_content_quality(self, text: str) -> Dict[str, Any]:
        if not text:
            return {
                "word_count": 0,
                "char_count": 0,
                "is_sufficient_length": False,
                "has_structure": False,
                "quality_score": 0
            }
        
        word_count = self.count_words(text)
        char_count = len(text)
        
        # 检查是否有足够的内容长度
        is_sufficient_length = word_count >= 50 and char_count >= 300
        
        # 检查是否有基本的结构（段落分隔）
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        has_structure = len(paragraphs) >= 2
        
        # 计算质量分数（0-100）
        quality_score = 0
        if word_count > 0:
            # 基于长度的分数（最多40分）
            length_score = min(40, (word_count / 200) * 40)
            quality_score += length_score
            
            # 基于结构的分数（最多30分）
            if has_structure:
                structure_score = min(30, len(paragraphs) * 5)
                quality_score += structure_score
            
            # 基于内容模式的分数（最多30分）
            patterns = self.check_content_patterns(text)
            pattern_score = 30
            if patterns["has_lorem_ipsum"]:
                pattern_score -= 15
            if patterns["has_placeholder_text"]:
                pattern_score -= 10
            if patterns["has_error_keywords"]:
                pattern_score -= 10
            quality_score += max(0, pattern_score)
        
        return {
            "word_count": word_count,
            "char_count": char_count,
            "paragraph_count": len(paragraphs),
            "is_sufficient_length": is_sufficient_length,
            "has_structure": has_structure,
            "quality_score": min(100, max(0, int(quality_score))),
            "assessment": self._get_quality_assessment(quality_score)
        }
    
    def _get_quality_assessment(self, score: float) -> str:
        if score >= 80:
            return "优秀"
        elif score >= 60:
            return "良好"
        elif score >= 40:
            return "一般"
        elif score >= 20:
            return "较差"
        else:
            return "很差"