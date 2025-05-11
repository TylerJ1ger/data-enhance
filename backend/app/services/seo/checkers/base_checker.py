from typing import Dict, Any, List, Optional, Union
from bs4 import BeautifulSoup, Tag
import re

class BaseChecker:
    """SEO检查器的基类，提供通用功能和接口"""
    
    def __init__(self, soup: BeautifulSoup, page_url: Optional[str] = None):
        """
        初始化检查器
        
        Args:
            soup: BeautifulSoup解析的HTML文档对象
            page_url: 页面URL，可选
        """
        self.soup = soup
        self.page_url = page_url
        self.issues = {
            "issues": [],      # 问题 - 需要修复的错误
            "warnings": [],    # 警告 - 需要检查但不一定是问题的项目
            "opportunities": [] # 机会 - 可以优化的部分
        }
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        执行所有检查并返回问题列表
        
        Returns:
            包含issues, warnings和opportunities列表的字典
        """
        # 子类应该覆盖此方法
        raise NotImplementedError("Subclasses must implement check()")
    
    def add_issue(self, 
                 category: str, 
                 issue: str, 
                 description: str, 
                 priority: str, 
                 affected_element: Optional[Union[str, Tag]] = None,
                 affected_resources: Optional[List[str]] = None,
                 issue_type: str = "issues"):
        """
        添加一个SEO问题到结果列表
        
        Args:
            category: 问题类别，如'Page Titles', 'Meta Description'等
            issue: 问题简短描述
            description: 问题详细描述
            priority: 优先级，如'high', 'medium', 'low'
            affected_element: 受影响的HTML元素或其字符串表示
            affected_resources: 受影响的资源列表，如URL
            issue_type: 问题类型，可以是'issues', 'warnings', 或'opportunities'
        """
        # 验证issue_type合法性
        if issue_type not in ["issues", "warnings", "opportunities"]:
            issue_type = "issues"  # 默认为issues
            
        # 创建问题数据字典
        issue_data = {
            "category": category,
            "issue": issue,
            "description": description,
            "priority": priority
        }
        
        # 处理受影响的元素
        if affected_element:
            if isinstance(affected_element, Tag):
                # 将BeautifulSoup Tag对象转换为字符串并截断
                element_str = str(affected_element)
                affected_element = element_str[:100] + ('...' if len(element_str) > 100 else '')
            issue_data["affected_element"] = affected_element
            
        # 处理受影响的资源
        if affected_resources:
            issue_data["affected_resources"] = affected_resources
            
        # 添加到相应的问题列表
        self.issues[issue_type].append(issue_data)
        
    def get_issues(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        获取所有已发现的问题
        
        Returns:
            包含issues, warnings和opportunities列表的字典
        """
        return self.issues
    
    def truncate_element(self, element: Tag, max_length: int = 100) -> str:
        """
        截断HTML元素字符串表示
        
        Args:
            element: BeautifulSoup Tag对象
            max_length: 最大字符长度，默认为100
            
        Returns:
            截断后的字符串
        """
        if not element:
            return ""
            
        element_str = str(element)
        if len(element_str) <= max_length:
            return element_str
        return element_str[:max_length] + '...'
    
    def is_element_visible(self, element: Tag) -> bool:
        """
        检查HTML元素是否可见(启发式方法)
        
        Args:
            element: BeautifulSoup Tag对象
            
        Returns:
            元素是否可能对用户可见
        """
        # 检查常见的隐藏属性
        style = element.get('style', '').lower()
        if 'display: none' in style or 'visibility: hidden' in style:
            return False
            
        # 检查class是否包含常见的隐藏类名
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
        检查元素属性是否包含特定值
        
        Args:
            element: BeautifulSoup Tag对象
            attr_name: 属性名称
            value: 要搜索的值
            
        Returns:
            属性是否包含指定值
        """
        if not element.has_attr(attr_name):
            return False
            
        attr_value = element[attr_name]
        if isinstance(attr_value, list):
            # 对于列表类型的属性(如class)
            return any(value.lower() in item.lower() for item in attr_value)
        else:
            # 对于字符串类型的属性
            return value.lower() in attr_value.lower()
    
    def count_words(self, text: str) -> int:
        """
        计算文本中的单词数量
        
        Args:
            text: 要计算的文本
            
        Returns:
            单词数量
        """
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
        """
        估算文本的像素宽度
        这是一个启发式方法，假设:
        - 英文字母、数字平均约7像素宽
        - 中文字符约14像素宽
        - 空格约3像素宽
        
        Args:
            text: 要估算的文本
            
        Returns:
            估计的像素宽度
        """
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
    
    def get_element_text(self, element: Optional[Tag]) -> str:
        """
        获取元素的文本内容，处理None情况
        
        Args:
            element: BeautifulSoup Tag对象或None
            
        Returns:
            元素的文本内容或空字符串
        """
        if not element:
            return ""
        return element.get_text(strip=True)