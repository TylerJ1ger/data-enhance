import os
import tempfile
from typing import Dict, Any, List, Optional, Set, Tuple
from fastapi import UploadFile
from bs4 import BeautifulSoup
import pandas as pd
import asyncio
import logging

# 更新后的导入路径 - checkers
from app.core.seo.checkers.meta_checker import MetaChecker
from app.core.seo.checkers.content.content_checker import ContentChecker
from app.core.seo.checkers.link_checker import LinkChecker
from app.core.seo.checkers.structure_checker import StructureChecker
from app.core.seo.checkers.technical_checker import TechnicalChecker
from app.core.seo.checkers.accessibility_checker import AccessibilityChecker

logger = logging.getLogger(__name__)


class SEOProcessor:
    def __init__(self):
        """初始化SEO处理器"""
        # 单文件分析相关属性（保持向后兼容）
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
        
        # 批量分析相关属性（新增）
        self.batch_results = []  # 存储批量分析结果
        self.batch_stats = {
            "total_files": 0,
            "processed_files": 0,
            "failed_files": 0,
            "total_issues": 0,
            "total_warnings": 0,
            "total_opportunities": 0
        }
        
    async def process_file(
        self, 
        file: UploadFile, 
        content_extractor: str = "auto", 
        enable_advanced_analysis: bool = True
    ) -> Dict[str, Any]:
        """处理单个文件（保持原有接口不变）"""
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
    
    async def process_files(
        self, 
        files: List[UploadFile],
        content_extractor: str = "auto", 
        enable_advanced_analysis: bool = True
    ) -> Dict[str, Any]:
        """批量处理多个HTML文件（新增）"""
        if not files:
            raise ValueError("No files provided")
        
        # 重置批量分析状态
        self.batch_results = []
        self.batch_stats = {
            "total_files": len(files),
            "processed_files": 0,
            "failed_files": 0,
            "total_issues": 0,
            "total_warnings": 0,
            "total_opportunities": 0
        }
        
        file_stats = []
        
        # 并发处理文件（控制并发数量）
        semaphore = asyncio.Semaphore(3)  # 限制同时处理3个文件
        
        async def process_single_file(file: UploadFile) -> Dict[str, Any]:
            async with semaphore:
                try:
                    # 为每个文件创建独立的临时处理器实例
                    temp_processor = SEOProcessor()
                    result = await temp_processor.process_file(file, content_extractor, enable_advanced_analysis)
                    
                    # 更新统计信息
                    self.batch_stats["processed_files"] += 1
                    self.batch_stats["total_issues"] += result["issues_count"]["issues"]
                    self.batch_stats["total_warnings"] += result["issues_count"]["warnings"]
                    self.batch_stats["total_opportunities"] += result["issues_count"]["opportunities"]
                    
                    logger.info(f"Successfully processed file: {file.filename}")
                    return result
                    
                except Exception as e:
                    self.batch_stats["failed_files"] += 1
                    logger.error(f"Failed to process file {file.filename}: {str(e)}")
                    
                    # 返回错误结果
                    return {
                        "file_name": file.filename,
                        "error": str(e),
                        "page_url": None,
                        "seo_score": 0,
                        "issues_count": {"issues": 0, "warnings": 0, "opportunities": 0},
                        "issues": {"issues": [], "warnings": [], "opportunities": []},
                        "extracted_content": {},
                        "categories": [],
                        "high_priority_issues": [],
                        "has_critical_issues": False
                    }
        
        # 并发处理所有文件
        tasks = [process_single_file(file) for file in files]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理结果
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                # 处理异常情况
                self.batch_stats["failed_files"] += 1
                error_result = {
                    "file_name": files[i].filename,
                    "error": str(result),
                    "page_url": None,
                    "seo_score": 0,
                    "issues_count": {"issues": 0, "warnings": 0, "opportunities": 0},
                    "issues": {"issues": [], "warnings": [], "opportunities": []},
                    "extracted_content": {},
                    "categories": [],
                    "high_priority_issues": [],
                    "has_critical_issues": False
                }
                self.batch_results.append(error_result)
                file_stats.append({
                    "filename": files[i].filename,
                    "status": "error",
                    "error": str(result),
                    "issues_count": {"issues": 0, "warnings": 0, "opportunities": 0}
                })
            else:
                # 正常结果
                self.batch_results.append(result)
                file_stats.append({
                    "filename": result["file_name"],
                    "status": "success",
                    "seo_score": result["seo_score"],
                    "issues_count": result["issues_count"],
                    "has_critical_issues": result["has_critical_issues"]
                })
        
        logger.info(f"Batch processing completed: {self.batch_stats['processed_files']} successful, {self.batch_stats['failed_files']} failed")
        
        return {
            "file_stats": file_stats,
            "batch_stats": self.batch_stats,
            "total_files": len(files),
            "successful_files": self.batch_stats["processed_files"],
            "failed_files": self.batch_stats["failed_files"],
            "analysis_summary": self._get_batch_analysis_summary()
        }
    
    def _get_batch_analysis_summary(self) -> Dict[str, Any]:
        """获取批量分析摘要"""
        if not self.batch_results:
            return {}
        
        successful_results = [r for r in self.batch_results if "error" not in r]
        
        if not successful_results:
            return {"message": "No files were successfully processed"}
        
        # 计算平均SEO得分
        total_score = sum(r["seo_score"] for r in successful_results)
        avg_score = total_score / len(successful_results) if successful_results else 0
        
        # 统计最常见的问题类别
        all_categories = []
        for result in successful_results:
            all_categories.extend(result.get("categories", []))
        
        category_counts = {}
        for category in all_categories:
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # 获取前5个最常见的问题类别
        top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "avg_seo_score": round(avg_score, 1),
            "files_with_critical_issues": len([r for r in successful_results if r.get("has_critical_issues", False)]),
            "top_issue_categories": [{"category": cat, "count": count} for cat, count in top_categories],
            "total_unique_issues": len(set(
                issue["issue"] for result in successful_results 
                for issue_type in ["issues", "warnings", "opportunities"]
                for issue in result.get("issues", {}).get(issue_type, [])
            ))
        }
    
    def export_batch_results_csv(self) -> bytes:
        """导出批量分析结果为CSV格式"""
        if not self.batch_results:
            return b"No batch analysis results to export"
        
        # 准备CSV数据
        csv_rows = []
        
        for result in self.batch_results:
            file_name = result.get("file_name", "Unknown")
            page_url = result.get("page_url", "")
            seo_score = result.get("seo_score", 0)
            has_error = "error" in result
            error_message = result.get("error", "")
            
            if has_error:
                # 错误文件的记录
                csv_rows.append({
                    "文件名": file_name,
                    "页面URL": page_url,
                    "SEO得分": 0,
                    "状态": "错误",
                    "错误信息": error_message,
                    "问题数量": 0,
                    "警告数量": 0,
                    "机会数量": 0,
                    "是否有关键问题": "否",
                    "问题类别": "",
                    "具体问题": ""
                })
            else:
                # 成功分析的文件
                issues_count = result.get("issues_count", {})
                issues_data = result.get("issues", {})
                categories = result.get("categories", [])
                
                # 收集所有问题的详细信息
                all_issues = []
                for issue_type in ["issues", "warnings", "opportunities"]:
                    for issue in issues_data.get(issue_type, []):
                        all_issues.append(f"[{issue_type.upper()}] {issue.get('issue', '')}: {issue.get('description', '')}")
                
                csv_rows.append({
                    "文件名": file_name,
                    "页面URL": page_url,
                    "SEO得分": seo_score,
                    "状态": "成功",
                    "错误信息": "",
                    "问题数量": issues_count.get("issues", 0),
                    "警告数量": issues_count.get("warnings", 0),
                    "机会数量": issues_count.get("opportunities", 0),
                    "是否有关键问题": "是" if result.get("has_critical_issues", False) else "否",
                    "问题类别": "; ".join(categories),
                    "具体问题": " | ".join(all_issues[:5]) + ("..." if len(all_issues) > 5 else "")  # 限制长度
                })
        
        # 转换为DataFrame并导出CSV
        df = pd.DataFrame(csv_rows)
        csv_content = df.to_csv(index=False, encoding='utf-8-sig')  # 使用utf-8-sig确保中文正常显示
        
        return csv_content.encode('utf-8-sig')
    
    def export_detailed_results_csv(self) -> bytes:
        """导出详细的问题分析结果为CSV格式"""
        if not self.batch_results:
            return b"No batch analysis results to export"
        
        # 准备详细的CSV数据
        csv_rows = []
        
        for result in self.batch_results:
            file_name = result.get("file_name", "Unknown")
            page_url = result.get("page_url", "")
            
            if "error" in result:
                # 错误文件的记录
                csv_rows.append({
                    "文件名": file_name,
                    "页面URL": page_url,
                    "问题类型": "ERROR",
                    "问题类别": "System",
                    "问题标题": "文件处理错误",
                    "问题描述": result.get("error", ""),
                    "优先级": "high",
                    "受影响元素": "",
                    "受影响资源": ""
                })
            else:
                # 成功分析的文件，展开所有问题
                issues_data = result.get("issues", {})
                
                for issue_type in ["issues", "warnings", "opportunities"]:
                    for issue in issues_data.get(issue_type, []):
                        csv_rows.append({
                            "文件名": file_name,
                            "页面URL": page_url,
                            "问题类型": issue_type.upper(),
                            "问题类别": issue.get("category", ""),
                            "问题标题": issue.get("issue", ""),
                            "问题描述": issue.get("description", ""),
                            "优先级": issue.get("priority", ""),
                            "受影响元素": issue.get("affected_element", ""),
                            "受影响资源": "; ".join(issue.get("affected_resources", [])) if issue.get("affected_resources") else ""
                        })
                
                # 如果文件没有任何问题，也添加一条记录
                if not any(issues_data.get(issue_type, []) for issue_type in ["issues", "warnings", "opportunities"]):
                    csv_rows.append({
                        "文件名": file_name,
                        "页面URL": page_url,
                        "问题类型": "INFO",
                        "问题类别": "General",
                        "问题标题": "无问题发现",
                        "问题描述": "此文件未发现任何SEO问题",
                        "优先级": "low",
                        "受影响元素": "",
                        "受影响资源": ""
                    })
        
        # 转换为DataFrame并导出CSV
        df = pd.DataFrame(csv_rows)
        csv_content = df.to_csv(index=False, encoding='utf-8-sig')
        
        return csv_content.encode('utf-8-sig')
    
    def get_batch_results(self) -> List[Dict[str, Any]]:
        """获取批量分析结果"""
        return self.batch_results
    
    def get_batch_stats(self) -> Dict[str, Any]:
        """获取批量分析统计信息"""
        return self.batch_stats
    
    def reset_batch_data(self) -> None:
        """重置批量分析数据"""
        self.batch_results = []
        self.batch_stats = {
            "total_files": 0,
            "processed_files": 0,
            "failed_files": 0,
            "total_issues": 0,
            "total_warnings": 0,
            "total_opportunities": 0
        }
    
    # 以下保持原有方法不变...
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
        for issue_type in ["issues", "warnings", "opportunities"]:
            self.issues[issue_type].extend(other_issues.get(issue_type, []))
            
    def get_extracted_content(self) -> Dict[str, Any]:
        return self.extracted_content
            
    def get_issue_categories(self) -> Set[str]:
        categories = set()
        for issue_type in ["issues", "warnings", "opportunities"]:
            for issue in self.issues[issue_type]:
                if "category" in issue:
                    categories.add(issue["category"])
        return categories
    
    def filter_issues_by_category(self, category: str) -> Dict[str, List[Dict[str, Any]]]:
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