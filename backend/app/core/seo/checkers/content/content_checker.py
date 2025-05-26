from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup
from ..base_checker import BaseChecker
from .content_extractor import ContentExtractor
from .content_analyzer import ContentAnalyzer
from .content_validator import ContentValidator


class ContentChecker(BaseChecker):
    """检查页面内容相关的SEO问题"""
    
    def __init__(self, soup: BeautifulSoup, page_url: Optional[str] = None, 
                 content_extractor: str = "auto", enable_advanced_analysis: bool = True):
        super().__init__(soup, page_url)
        
        # Initialize component modules
        self.extractor = ContentExtractor(soup, content_extractor)
        self.analyzer = ContentAnalyzer(enable_advanced_analysis)
        self.validator = ContentValidator()
        
        # Store configuration
        self.content_extractor = content_extractor
        self.enable_advanced_analysis = enable_advanced_analysis
        
        # Store extracted content
        self.extracted_content = {
            "text": "",
            "spelling_errors": [],
            "grammar_errors": [],
            "title": "",
            "description": "",
            "structure": []
        }
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """执行所有内容相关检查"""
        # Extract content with structure
        self.extract_content_with_structure()
        
        # Perform content checks
        self.check_content()
        self.check_images()
        self.check_mobile()
        
        return self.get_issues()
    
    def extract_content_with_structure(self):
        """
        提取内容并保留结构信息
        """
        # Use extractor to extract content
        main_text = self.extractor.extract_content_with_structure()
        
        # Get extracted content from extractor
        self.extracted_content = self.extractor.get_extracted_content()
        
        return main_text
    
    def check_content(self):
        """检查内容相关问题"""
        # Get main text content
        text_content = self.extracted_content["text"]
        
        # Basic content checks
        # Check content length
        if len(text_content) < 300:
            self.add_issue(
                category="Content",
                issue="Low Content Pages",
                description=f"页面内容过少，仅有约{len(text_content)}个字符，可能被视为薄内容。",
                priority="medium",
                issue_type="opportunities"
            )
        
        # Use analyzer to check for patterns
        pattern_results = self.validator.check_content_patterns(text_content)
        
        # Check Lorem Ipsum placeholder text
        if pattern_results.get("has_lorem_ipsum", False):
            self.add_issue(
                category="Content",
                issue="Lorem Ipsum Placeholder",
                description="页面包含Lorem Ipsum占位文本，这应该在发布前替换为实际内容。",
                priority="high",
                issue_type="warnings"
            )
        
        # Check for placeholder text
        if pattern_results.get("has_placeholder_text", False):
            self.add_issue(
                category="Content",
                issue="Placeholder Content",
                description="页面包含占位符文本，应该替换为实际内容。",
                priority="medium",
                issue_type="warnings"
            )
        
        # Perform advanced analysis if enabled
        if self.enable_advanced_analysis:
            self._perform_advanced_content_analysis(text_content)
    
    def _perform_advanced_content_analysis(self, text_content: str):
        """使用analyzer进行高级内容分析"""
        try:
            # Get analysis results from analyzer
            analysis_results = self.analyzer.perform_advanced_content_analysis(text_content)
            
            # Update extracted content with analysis results
            self.extracted_content["spelling_errors"] = analysis_results.get("spelling_errors", [])
            self.extracted_content["grammar_errors"] = analysis_results.get("grammar_errors", [])
            
            # Add issues based on analysis results
            spelling_errors = analysis_results.get("spelling_errors", [])
            grammar_errors = analysis_results.get("grammar_errors", [])
            
            # Only report issues if there are enough valid errors
            if spelling_errors and len(spelling_errors) > 2:  # Ignore small amount of possible false positives
                # Format error information
                formatted_resources = []
                for e in spelling_errors[:3]:
                    # Truncate context, show at most 50 characters
                    context = e.get("text", "").strip()
                    if len(context) > 50:
                        context = context[:47] + "..."
                        
                    # Format replacement suggestions
                    replacements = e.get("replacements", [])[:3]
                    if replacements:
                        suggestions = ", ".join(replacements)
                        formatted_resources.append(f"{context} → {suggestions}")
                    else:
                        formatted_resources.append(context)
                        
                self.add_issue(
                    category="Content",
                    issue="Spelling Errors",
                    description=f"发现{len(spelling_errors)}个拼写错误，这可能影响用户体验和SEO表现。",
                    priority="medium",
                    affected_resources=formatted_resources,
                    issue_type="issues"
                )
            
            # Grammar errors
            if grammar_errors and len(grammar_errors) > 2:  # Ignore small amount of possible false positives
                # Format error information
                formatted_resources = []
                for e in grammar_errors[:3]:
                    # Truncate context, show at most 50 characters
                    context = e.get("text", "").strip()
                    if len(context) > 50:
                        context = context[:47] + "..."
                        
                    # Format error message
                    message = e.get("message", "").strip() if e.get("message") else "语法错误"
                    formatted_resources.append(f"{context} → {message}")
                        
                self.add_issue(
                    category="Content",
                    issue="Grammar Errors",
                    description=f"发现{len(grammar_errors)}个语法或风格错误，这可能降低内容质量。",
                    priority="medium",
                    affected_resources=formatted_resources,
                    issue_type="issues"
                )
            
            # Handle readability analysis
            readability = analysis_results.get("readability", {})
            if readability:
                if readability.get("is_difficult", False):
                    reading_ease = readability.get("reading_ease", 0)
                    self.add_issue(
                        category="Content",
                        issue="Readability Very Difficult",
                        description=f"内容可读性极差（Flesch得分：{reading_ease:.1f}，相当于大学以上水平），建议简化语言提高易读性。",
                        priority="medium",
                        issue_type="opportunities"
                    )
                elif readability.get("is_very_difficult", False):
                    reading_ease = readability.get("reading_ease", 0)
                    self.add_issue(
                        category="Content",
                        issue="Readability Difficult",
                        description=f"内容可读性较差（Flesch得分：{reading_ease:.1f}，大学水平），可考虑简化用词和句式。",
                        priority="low",
                        issue_type="opportunities"
                    )
                
                if readability.get("is_advanced_level", False):
                    grade_level = readability.get("grade_level", 0)
                    self.add_issue(
                        category="Content",
                        issue="Advanced Reading Level",
                        description=f"内容阅读水平较高（相当于{grade_level:.1f}年级），可能不适合所有目标用户。",
                        priority="low",
                        issue_type="opportunities"
                    )
                
                if readability.get("is_long_sentences", False):
                    avg_sentence_length = readability.get("avg_sentence_length", 0)
                    self.add_issue(
                        category="Content",
                        issue="Long Sentences",
                        description=f"内容中句子平均长度为{avg_sentence_length:.1f}个字符，较长的句子可能影响可读性。",
                        priority="low",
                        issue_type="opportunities"
                    )
            
            # Check for Soft 404 pages
            if self.analyzer.check_soft_404_content(text_content) and self.page_url and "404" not in self.page_url:
                self.add_issue(
                    category="Content",
                    issue="Soft 404 Page",
                    description="页面内容暗示这是一个\"软404\"页面（内容表明页面不存在但HTTP状态码不是404）。这可能会混淆搜索引擎爬虫。",
                    priority="high",
                    issue_type="warnings"
                )
                
        except Exception as e:
            # Catch any exceptions from advanced analysis to avoid affecting main functionality
            self.add_issue(
                category="Content",
                issue="Content Analysis Error",
                description=f"执行高级内容分析时出错：{str(e)}",
                priority="low",
                issue_type="warnings"
            )
    
    def check_images(self):
        """检查图片相关问题"""
        img_tags = self.soup.find_all('img')
        
        # Check if all images have alt attribute
        for img in img_tags:
            if not img.has_attr('alt'):
                self.add_issue(
                    category="Images",
                    issue="Missing Alt Attribute",
                    description="图片缺少alt属性，这对于SEO和无障碍访问至关重要。",
                    affected_element=str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    priority="low",
                    issue_type="issues"
                )
                break  # Only report once
            elif img['alt'].strip() == '':
                self.add_issue(
                    category="Images",
                    issue="Missing Alt Text",
                    description="图片的alt属性是空的，应该提供描述性的替代文本。",
                    affected_element=str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    priority="low",
                    issue_type="issues"
                )
                break  # Only report once
            elif len(img['alt']) > 100:
                self.add_issue(
                    category="Images",
                    issue="Alt Text Over 100 Characters",
                    description=f"图片的alt文本长度为{len(img['alt'])}个字符，超过了100个字符的建议长度。",
                    affected_element=str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    priority="low",
                    issue_type="opportunities"
                )
                break  # Only report once
        
        # Check if images have size attributes
        for img in img_tags:
            if not (img.has_attr('width') and img.has_attr('height')):
                self.add_issue(
                    category="Images",
                    issue="Missing Size Attributes",
                    description="图片缺少宽度和高度属性，这可能导致页面加载时的布局偏移(CLS)。",
                    affected_element=str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    priority="low",
                    issue_type="opportunities"
                )
                break  # Only report once
    
    def check_mobile(self):
        """检查移动端相关问题"""
        # Check viewport
        viewport = self.soup.find('meta', attrs={'name': 'viewport'})
        if not viewport:
            self.add_issue(
                category="Mobile",
                issue="Viewport Not Set",
                description="页面缺少viewport元标签，这对于移动端响应式显示至关重要。",
                priority="high",
                issue_type="issues"
            )
        else:
            viewport_content = viewport.get('content', '').lower()
            if 'user-scalable=no' in viewport_content or 'maximum-scale=1' in viewport_content:
                self.add_issue(
                    category="Mobile",
                    issue="Viewport Prevents Scaling",
                    description="Viewport设置阻止了用户缩放，这会影响无障碍访问。",
                    priority="medium",
                    issue_type="warnings"
                )
    
    def get_extracted_content(self) -> Dict[str, Any]:
        """获取提取的内容和标记的错误，供前端展示"""
        return self.extracted_content