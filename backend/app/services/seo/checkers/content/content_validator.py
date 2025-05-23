import importlib.util
import logging
from typing import Optional, Dict
from bs4 import Tag


class ContentValidator:
    """Provides validation utilities for content checking."""
    
    def __init__(self):
        """Initialize content validator."""
        # Initialize logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger('ContentValidator')
    
    def check_library_available(self, library_name: str) -> bool:
        """
        Check if specified library is available.
        Not only check if library is installed, but also try to import to ensure it's really available.
        
        Args:
            library_name: Name of the library to check
            
        Returns:
            bool: Whether the library is available
        """
        try:
            # Simplified check, only verify import
            if library_name == 'goose3':
                import goose3
                # Don't create Goose instance in this method, only verify importability
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
                return importlib.util.find_spec(library_name) is not None
        except ImportError:
            self.logger.warning(f"库{library_name}未安装或无法导入")
            return False
        except Exception as e:
            self.logger.warning(f"库{library_name}检查时出现问题: {str(e)}")
            return False
    
    def is_element_visible(self, element: Tag) -> bool:
        """
        Check if HTML element is visible (heuristic method).
        
        Args:
            element: BeautifulSoup Tag object
            
        Returns:
            bool: Whether element is likely visible to users
        """
        # Check common hidden attributes
        style = element.get('style', '').lower()
        if 'display: none' in style or 'visibility: hidden' in style:
            return False
            
        # Check if class contains common hidden class names
        classes = element.get('class', [])
        if isinstance(classes, str):
            classes = classes.split()
            
        hidden_classes = ['hidden', 'hide', 'invisible', 'd-none', 'display-none']
        for cls in classes:
            if cls.lower() in hidden_classes:
                return False
                
        return True
    
    def has_attr_containing(self, element: Tag, attr_name: str, value: str) -> bool:
        """
        Check if element attribute contains specific value.
        
        Args:
            element: BeautifulSoup Tag object
            attr_name: Attribute name
            value: Value to search for
            
        Returns:
            bool: Whether attribute contains specified value
        """
        if not element.has_attr(attr_name):
            return False
            
        attr_value = element[attr_name]
        if isinstance(attr_value, list):
            # For list type attributes (like class)
            return any(value.lower() in item.lower() for item in attr_value)
        else:
            # For string type attributes
            return value.lower() in attr_value.lower()
    
    def count_words(self, text: str) -> int:
        """
        Count number of words in text.
        
        Args:
            text: Text to count
            
        Returns:
            int: Number of words
        """
        if not text:
            return 0
            
        # Remove HTML tags (if any)
        import re
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove excess whitespace characters
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Split words and count
        words = text.split()
        return len(words)
    
    def estimate_pixel_width(self, text: str) -> int:
        """
        Estimate pixel width of text.
        This is a heuristic method, assuming:
        - English letters, numbers average about 7 pixels wide
        - Chinese characters about 14 pixels wide
        - Spaces about 3 pixels wide
        
        Args:
            text: Text to estimate
            
        Returns:
            int: Estimated pixel width
        """
        if not text:
            return 0
            
        pixel_width = 0
        for char in text:
            if ord(char) > 127:  # Non-ASCII characters (like Chinese, Japanese, etc.)
                pixel_width += 14
            elif char.isspace():  # Spaces
                pixel_width += 3
            elif char.isalpha() and ord(char) < 128:  # English letters
                pixel_width += 7
            elif char.isdigit():  # Numbers
                pixel_width += 7
            else:  # Other ASCII characters (like punctuation)
                pixel_width += 7
                
        return pixel_width
    
    def get_element_text(self, element: Optional[Tag]) -> str:
        """
        Get text content of element, handle None case.
        
        Args:
            element: BeautifulSoup Tag object or None
            
        Returns:
            str: Element text content or empty string
        """
        if not element:
            return ""
        return element.get_text(strip=True)
    
    def validate_url_structure(self, url: str) -> Dict[str, bool]:
        """
        Validate URL structure and return validation results.
        
        Args:
            url: URL to validate
            
        Returns:
            dict: Validation results
        """
        from urllib.parse import urlparse
        
        validation_results = {
            "is_valid": False,
            "has_scheme": False,
            "has_netloc": False,
            "is_secure": False,
            "has_fragment": False,
            "has_query": False
        }
        
        try:
            parsed = urlparse(url)
            validation_results["has_scheme"] = bool(parsed.scheme)
            validation_results["has_netloc"] = bool(parsed.netloc)
            validation_results["is_secure"] = parsed.scheme == 'https'
            validation_results["has_fragment"] = bool(parsed.fragment)
            validation_results["has_query"] = bool(parsed.query)
            validation_results["is_valid"] = bool(parsed.scheme and parsed.netloc)
        except Exception as e:
            self.logger.warning(f"URL validation failed: {str(e)}")
        
        return validation_results
    
    def check_content_patterns(self, text: str) -> Dict[str, bool]:
        """
        Check for various content patterns that might indicate issues.
        
        Args:
            text: Text content to check
            
        Returns:
            dict: Pattern check results
        """
        import re
        
        pattern_results = {
            "has_lorem_ipsum": False,
            "has_placeholder_text": False,
            "has_error_keywords": False,
            "has_navigation_text": False,
            "has_copyright_text": False
        }
        
        if not text:
            return pattern_results
        
        text_lower = text.lower()
        
        # Check for Lorem Ipsum
        lorem_patterns = [
            r'lorem\s+ipsum',
            r'dolor\s+sit\s+amet',
            r'consectetur\s+adipiscing\s+elit'
        ]
        pattern_results["has_lorem_ipsum"] = any(re.search(pattern, text_lower) for pattern in lorem_patterns)
        
        # Check for placeholder text
        placeholder_keywords = [
            'placeholder', 'sample text', 'dummy text', 'test content',
            'coming soon', '待编辑', '内容待更新'
        ]
        pattern_results["has_placeholder_text"] = any(keyword in text_lower for keyword in placeholder_keywords)
        
        # Check for error keywords
        error_keywords = [
            'error', '错误', 'not found', '找不到', '页面不存在',
            'server error', '服务器错误', 'access denied', '访问被拒绝'
        ]
        pattern_results["has_error_keywords"] = any(keyword in text_lower for keyword in error_keywords)
        
        # Check for navigation text
        nav_keywords = [
            'home', 'about', 'contact', 'menu', 'navigation',
            '首页', '关于', '联系', '菜单', '导航'
        ]
        pattern_results["has_navigation_text"] = any(keyword in text_lower for keyword in nav_keywords)
        
        # Check for copyright text
        copyright_patterns = [
            r'copyright\s*©',
            r'©.*all\s+rights\s+reserved',
            r'版权所有',
            r'©.*保留所有权利'
        ]
        pattern_results["has_copyright_text"] = any(re.search(pattern, text_lower) for pattern in copyright_patterns)
        
        return pattern_results