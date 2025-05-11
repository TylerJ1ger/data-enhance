import os
import tempfile
from typing import Dict, Any, List, Optional, Set, Tuple
from fastapi import UploadFile
from bs4 import BeautifulSoup

from app.services.seo.checkers.meta_checker import MetaChecker
from app.services.seo.checkers.content_checker import ContentChecker
from app.services.seo.checkers.link_checker import LinkChecker
from app.services.seo.checkers.structure_checker import StructureChecker
from app.services.seo.checkers.technical_checker import TechnicalChecker
from app.services.seo.checkers.accessibility_checker import AccessibilityChecker


class SEOProcessor:
    """
    SEO处理器主类，处理文件上传、协调检查器执行和整合结果
    """
    
    def __init__(self):
        """初始化SEO处理器"""
        self.html_content = None
        self.soup = None
        self.page_url = None
        self.issues = {
            "issues": [],      # 问题 - 需要修复的错误
            "warnings": [],    # 警告 - 需要检查但不一定是问题的项目
            "opportunities": [] # 机会 - 可以优化的部分
        }
        
    async def process_file(self, file: UploadFile) -> Dict[str, Any]:
        """
        处理上传的HTML文件并执行SEO分析
        
        Args:
            file: 上传的HTML文件对象
            
        Returns:
            Dict包含分析结果，包括文件名、URL、问题计数和分类问题列表
        """
        # 创建临时文件存储上传内容
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            # 写入上传文件内容到临时文件
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()
            
            # 解析HTML内容
            self.html_content = content.decode('utf-8', errors='replace')
            self.soup = BeautifulSoup(self.html_content, 'html.parser')
            
            # 尝试从HTML中提取页面URL
            self.extract_page_url()
            
            # 执行所有检查
            self.check_all_seo_issues()
            
            # 清理临时文件
            temp_file.close()
            os.unlink(temp_file.name)
            
        # 返回分析结果
        return {
            "file_name": file.filename,
            "page_url": self.page_url,
            "issues_count": {
                "issues": len(self.issues["issues"]),
                "warnings": len(self.issues["warnings"]),
                "opportunities": len(self.issues["opportunities"])
            },
            "issues": self.issues
        }
    
    def extract_page_url(self) -> None:
        """从HTML中提取页面URL"""
        # 尝试从<link rel="canonical"> 标签获取
        canonical = self.soup.find('link', rel='canonical')
        if canonical and canonical.get('href'):
            self.page_url = canonical.get('href')
            return
        
        # 尝试从<meta property="og:url"> 标签获取
        og_url = self.soup.find('meta', property='og:url')
        if og_url and og_url.get('content'):
            self.page_url = og_url.get('content')
            return
        
        # 尝试从base标签获取
        base = self.soup.find('base')
        if base and base.get('href'):
            self.page_url = base.get('href')
    
    def check_all_seo_issues(self) -> None:
        """执行所有SEO检查，使用各个专门的检查器"""
        # 清空之前的检查结果
        self.issues = {
            "issues": [],
            "warnings": [],
            "opportunities": []
        }
        
        # 初始化并运行各个检查器
        checkers = [
            MetaChecker(self.soup, self.page_url),            # 元数据检查
            ContentChecker(self.soup, self.page_url),         # 内容检查
            LinkChecker(self.soup, self.page_url),            # 链接检查
            StructureChecker(self.soup, self.page_url),       # 结构化数据检查
            TechnicalChecker(self.soup, self.page_url),       # 技术检查
            AccessibilityChecker(self.soup, self.page_url)    # 无障碍检查
        ]
        
        # 收集所有检查结果
        for checker in checkers:
            checker_issues = checker.check()
            self.issues["issues"].extend(checker_issues["issues"])
            self.issues["warnings"].extend(checker_issues["warnings"])
            self.issues["opportunities"].extend(checker_issues["opportunities"])
            
    def merge_issues(self, other_issues: Dict[str, List[Dict[str, Any]]]) -> None:
        """
        合并其他检查器的问题结果到主问题列表
        
        Args:
            other_issues: 另一个检查器的问题字典
        """
        for issue_type in ["issues", "warnings", "opportunities"]:
            self.issues[issue_type].extend(other_issues.get(issue_type, []))
            
    def get_issue_categories(self) -> Set[str]:
        """
        获取所有已发现问题的类别
        
        Returns:
            包含所有不同类别的集合
        """
        categories = set()
        for issue_type in ["issues", "warnings", "opportunities"]:
            for issue in self.issues[issue_type]:
                if "category" in issue:
                    categories.add(issue["category"])
        return categories
    
    def filter_issues_by_category(self, category: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        按类别筛选问题
        
        Args:
            category: 要筛选的类别名称
            
        Returns:
            仅包含指定类别问题的字典
        """
        filtered_issues = {
            "issues": [],
            "warnings": [],
            "opportunities": []
        }
        
        for issue_type in ["issues", "warnings", "opportunities"]:
            filtered_issues[issue_type] = [
                issue for issue in self.issues[issue_type]
                if issue.get("category") == category
            ]
            
        return filtered_issues
    
    def get_issue_stats(self) -> Dict[str, Dict[str, int]]:
        """
        获取按类别和优先级分类的问题统计
        
        Returns:
            嵌套字典，包含每个类别和优先级的问题计数
        """
        stats = {}
        
        # 初始化统计字典
        categories = self.get_issue_categories()
        for category in categories:
            stats[category] = {
                "high": 0,
                "medium": 0,
                "low": 0,
                "total": 0
            }
        
        # 计算统计数据
        for issue_type in ["issues", "warnings", "opportunities"]:
            for issue in self.issues[issue_type]:
                category = issue.get("category", "Unknown")
                priority = issue.get("priority", "low")
                
                if category in stats:
                    stats[category][priority] += 1
                    stats[category]["total"] += 1
        
        return stats