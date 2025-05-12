import os
import tempfile
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup
from fastapi import UploadFile

from .checkers.meta_checker import MetaChecker
from .checkers.content_checker import ContentChecker
from .checkers.link_checker import LinkChecker
from .checkers.structure_checker import StructureChecker
from .checkers.technical_checker import TechnicalChecker
from .checkers.accessibility_checker import AccessibilityChecker

class SEOProcessor:
    """SEO处理器主类，协调各个检查器并处理结果"""
    
    def __init__(self):
        self.html_content = None
        self.soup = None
        self.page_url = None
        self.issues = {
            "issues": [],
            "warnings": [],
            "opportunities": []
        }
        
    async def process_file(self, file: UploadFile) -> Dict[str, Any]:
        """处理上传的HTML文件并执行SEO分析"""
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
    
    def extract_page_url(self):
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
    
    def check_all_seo_issues(self):
        """执行所有SEO检查"""
        # 清空之前的检查结果
        self.issues = {
            "issues": [],
            "warnings": [],
            "opportunities": []
        }
        
        # 初始化并运行各个检查器
        checkers = [
            TechnicalChecker(self.soup, self.page_url),  # 技术性检查（响应码、安全性、URL）
            MetaChecker(self.soup, self.page_url),       # 元数据检查（标题、描述等）
            ContentChecker(self.soup, self.page_url),    # 内容检查
            LinkChecker(self.soup, self.page_url),       # 链接检查
            StructureChecker(self.soup, self.page_url),  # 结构化数据检查
            AccessibilityChecker(self.soup, self.page_url) # 无障碍检查
        ]
        
        # 收集所有检查结果
        for checker in checkers:
            checker_issues = checker.check()
            self.issues["issues"].extend(checker_issues["issues"])
            self.issues["warnings"].extend(checker_issues["warnings"])
            self.issues["opportunities"].extend(checker_issues["opportunities"])
    
    def merge_issues(self, new_issues: Dict[str, List[Dict[str, Any]]]):
        """合并新的问题到现有结果中"""
        for issue_type in ["issues", "warnings", "opportunities"]:
            if issue_type in new_issues:
                self.issues[issue_type].extend(new_issues[issue_type])
    
    def get_issue_count(self) -> Dict[str, int]:
        """获取各类问题的数量"""
        return {
            "issues": len(self.issues["issues"]),
            "warnings": len(self.issues["warnings"]),
            "opportunities": len(self.issues["opportunities"])
        }
    
    def get_issues_by_category(self, category: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """按类别获取问题"""
        if not category:
            return self.issues
            
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
    
    def get_categories(self) -> List[str]:
        """获取所有问题类别"""
        categories = set()
        
        for issue_type in ["issues", "warnings", "opportunities"]:
            for issue in self.issues[issue_type]:
                if "category" in issue:
                    categories.add(issue["category"])
                    
        return sorted(list(categories))
    
    def get_high_priority_issues(self) -> List[Dict[str, Any]]:
        """获取所有高优先级问题"""
        high_priority = []
        
        for issue_type in ["issues", "warnings"]:  # 通常只考虑issues和warnings中的高优先级问题
            high_priority.extend([
                issue for issue in self.issues[issue_type] 
                if issue.get("priority") == "high"
            ])
            
        return high_priority
    
    def has_critical_issues(self) -> bool:
        """检查是否存在关键问题"""
        # 检查是否有高优先级的issues
        for issue in self.issues["issues"]:
            if issue.get("priority") == "high":
                return True
                
        return False
    
    def get_seo_score(self) -> int:
        """
        计算SEO评分（0-100）
        基于问题数量和严重程度
        """
        # 问题权重
        weights = {
            "issues": {"high": 10, "medium": 5, "low": 2},
            "warnings": {"high": 5, "medium": 2, "low": 1},
            "opportunities": {"high": 2, "medium": 1, "low": 0.5}
        }
        
        # 计算加权问题数
        total_weighted_issues = 0
        for issue_type in ["issues", "warnings", "opportunities"]:
            for issue in self.issues[issue_type]:
                priority = issue.get("priority", "medium")
                total_weighted_issues += weights[issue_type][priority]
        
        # 基础分数100，每个加权问题减少相应分数
        score = max(0, 100 - total_weighted_issues)
        
        return round(score)