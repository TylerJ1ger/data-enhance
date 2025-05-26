import os
import tempfile
from typing import Dict, Any, List, Optional, Set, Tuple
from fastapi import UploadFile
from bs4 import BeautifulSoup

# 更新后的导入路径 - checkers
from app.core.seo.checkers.meta_checker import MetaChecker
from app.core.seo.checkers.content.content_checker import ContentChecker
from app.core.seo.checkers.link_checker import LinkChecker
from app.core.seo.checkers.structure_checker import StructureChecker
from app.core.seo.checkers.technical_checker import TechnicalChecker
from app.core.seo.checkers.accessibility_checker import AccessibilityChecker


class SEOProcessor:
    """
    SEO处理器主类，处理文件上传、协调检查器执行和整合结果
    
    这是重构后的SEO处理器，整合了原有的所有功能：
    - 支持多种内容提取引擎
    - 高级内容分析（拼写检查、语法检查、可读性分析）
    - 全面的SEO检查（技术、内容、链接、结构化数据、无障碍性）
    - 灵活的问题分类和统计
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
        self.extracted_content = {
            "text": "",
            "spelling_errors": [],
            "grammar_errors": [],
            "title": "",
            "description": "",
            "structure": []
        }
        
    async def process_file(
        self, 
        file: UploadFile, 
        content_extractor: str = "auto", 
        enable_advanced_analysis: bool = True
    ) -> Dict[str, Any]:
        """
        处理上传的HTML文件并执行SEO分析
        
        Args:
            file: 上传的HTML文件对象
            content_extractor: 内容提取引擎（auto, trafilatura, newspaper, readability, goose3, custom）
            enable_advanced_analysis: 是否开启高级内容分析
            
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
            
            # 执行所有检查，传入提取引擎和高级分析选项
            await self.check_all_seo_issues(content_extractor, enable_advanced_analysis)
            
            # 清理临时文件
            temp_file.close()
            os.unlink(temp_file.name)
            
        # 返回分析结果，包括提取的页面内容
        return {
            "file_name": file.filename,
            "page_url": self.page_url,
            "seo_score": self.calculate_seo_score(),
            "issues_count": {
                "issues": len(self.issues["issues"]),
                "warnings": len(self.issues["warnings"]),
                "opportunities": len(self.issues["opportunities"])
            },
            "issues": self.issues,
            "extracted_content": self.get_extracted_content(),
            "categories": self.get_categories(),
            "high_priority_issues": self.get_high_priority_issues(),
            "has_critical_issues": self.has_critical_issues()
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
    
    async def check_all_seo_issues(self, content_extractor: str = "auto", enable_advanced_analysis: bool = True) -> None:
        """
        执行所有SEO检查，使用各个专门的检查器
        
        Args:
            content_extractor: 内容提取引擎（auto, trafilatura, newspaper, readability, goose3, custom）
            enable_advanced_analysis: 是否开启高级内容分析
        """
        # 清空之前的检查结果
        self.issues = {
            "issues": [],
            "warnings": [],
            "opportunities": []
        }
        
        # 初始化并运行各个检查器，为ContentChecker传入特定参数
        checkers = [
            TechnicalChecker(self.soup, self.page_url),       # 技术检查（响应码、安全性、URL）
            MetaChecker(self.soup, self.page_url),            # 元数据检查（标题、描述等）
            ContentChecker(self.soup, self.page_url, content_extractor, enable_advanced_analysis),  # 内容检查，传入新参数
            LinkChecker(self.soup, self.page_url),            # 链接检查
            StructureChecker(self.soup, self.page_url),       # 结构化数据检查
            AccessibilityChecker(self.soup, self.page_url)    # 无障碍检查
        ]
        
        # 收集所有检查结果
        for checker in checkers:
            try:
                checker_issues = checker.check()
                self.issues["issues"].extend(checker_issues.get("issues", []))
                self.issues["warnings"].extend(checker_issues.get("warnings", []))
                self.issues["opportunities"].extend(checker_issues.get("opportunities", []))
                
                # 获取内容检查器提取的内容
                if isinstance(checker, ContentChecker):
                    self.extracted_content = checker.get_extracted_content()
            except Exception as e:
                # 如果某个检查器出错，记录错误但不影响其他检查器
                self.add_issue(
                    category="System",
                    issue="Checker Error",
                    description=f"检查器 {checker.__class__.__name__} 执行时出错: {str(e)}",
                    priority="low",
                    issue_type="warnings"
                )
    
    def add_issue(self, category: str, issue: str, description: str, priority: str, 
                  affected_element: Optional[str] = None, affected_resources: Optional[List[str]] = None,
                  issue_type: str = "issues"):
        """
        添加一个SEO问题到结果列表
        
        Args:
            category: 问题类别
            issue: 问题简短描述
            description: 问题详细描述
            priority: 优先级（high, medium, low）
            affected_element: 受影响的HTML元素
            affected_resources: 受影响的资源列表
            issue_type: 问题类型（issues, warnings, opportunities）
        """
        if issue_type not in ["issues", "warnings", "opportunities"]:
            issue_type = "issues"
            
        issue_data = {
            "category": category,
            "issue": issue,
            "description": description,
            "priority": priority
        }
        
        if affected_element:
            issue_data["affected_element"] = affected_element
        if affected_resources:
            issue_data["affected_resources"] = affected_resources
            
        self.issues[issue_type].append(issue_data)
            
    def merge_issues(self, other_issues: Dict[str, List[Dict[str, Any]]]) -> None:
        """
        合并其他检查器的问题结果到主问题列表
        
        Args:
            other_issues: 另一个检查器的问题字典
        """
        for issue_type in ["issues", "warnings", "opportunities"]:
            self.issues[issue_type].extend(other_issues.get(issue_type, []))
            
    def get_extracted_content(self) -> Dict[str, Any]:
        """
        获取提取的页面内容及标记的错误
        
        Returns:
            包含提取文本和标记的错误的字典
        """
        return self.extracted_content
            
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
                else:
                    # 如果类别不存在，初始化它
                    stats[category] = {"high": 0, "medium": 0, "low": 0, "total": 0}
                    stats[category][priority] += 1
                    stats[category]["total"] += 1
        
        return stats
    
    def get_issue_count(self) -> Dict[str, int]:
        """获取各类问题的数量"""
        return {
            "issues": len(self.issues["issues"]),
            "warnings": len(self.issues["warnings"]),
            "opportunities": len(self.issues["opportunities"]),
            "total": len(self.issues["issues"]) + len(self.issues["warnings"]) + len(self.issues["opportunities"])
        }
    
    def get_issues_by_category(self, category: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """按类别获取问题"""
        if not category:
            return self.issues
            
        return self.filter_issues_by_category(category)
    
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
    
    def calculate_seo_score(self) -> int:
        """
        计算SEO评分（0-100）
        基于问题数量和严重程度
        
        Returns:
            int: SEO评分，0-100之间
        """
        # 问题权重
        weights = {
            "issues": {"high": 15, "medium": 8, "low": 3},
            "warnings": {"high": 8, "medium": 4, "low": 2},
            "opportunities": {"high": 3, "medium": 2, "low": 1}
        }
        
        # 计算加权问题数
        total_weighted_issues = 0
        for issue_type in ["issues", "warnings", "opportunities"]:
            for issue in self.issues[issue_type]:
                priority = issue.get("priority", "medium")
                if priority in weights[issue_type]:
                    total_weighted_issues += weights[issue_type][priority]
        
        # 基础分数100，每个加权问题减少相应分数
        score = max(0, 100 - total_weighted_issues)
        
        return round(score)
    
    def get_seo_summary(self) -> Dict[str, Any]:
        """
        获取SEO分析摘要
        
        Returns:
            包含综合分析摘要的字典
        """
        return {
            "seo_score": self.calculate_seo_score(),
            "total_issues": sum(len(self.issues[t]) for t in ["issues", "warnings", "opportunities"]),
            "critical_issues": len([i for i in self.issues["issues"] if i.get("priority") == "high"]),
            "categories_affected": len(self.get_categories()),
            "has_critical_issues": self.has_critical_issues(),
            "page_url": self.page_url,
            "content_length": len(self.extracted_content.get("text", "")),
            "spelling_errors": len(self.extracted_content.get("spelling_errors", [])),
            "grammar_errors": len(self.extracted_content.get("grammar_errors", []))
        }
    
    def export_issues_csv(self) -> bytes:
        """
        导出问题列表为CSV格式
        
        Returns:
            CSV格式的字节数据
        """
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # 写入表头
        writer.writerow(['Category', 'Issue', 'Type', 'Priority', 'Description', 'Affected Element'])
        
        # 写入数据
        for issue_type in ["issues", "warnings", "opportunities"]:
            for issue in self.issues[issue_type]:
                writer.writerow([
                    issue.get("category", ""),
                    issue.get("issue", ""),
                    issue_type,
                    issue.get("priority", ""),
                    issue.get("description", ""),
                    issue.get("affected_element", "")
                ])
        
        return output.getvalue().encode('utf-8')
    
    def clear_analysis(self) -> None:
        """清空当前分析结果，准备新的分析"""
        self.html_content = None
        self.soup = None
        self.page_url = None
        self.issues = {
            "issues": [],
            "warnings": [],
            "opportunities": []
        }
        self.extracted_content = {
            "text": "",
            "spelling_errors": [],
            "grammar_errors": [],
            "title": "",
            "description": "",
            "structure": []
        }