from .base_checker import BaseChecker
from typing import Dict, Any, List, Optional
import re
from bs4 import Tag, BeautifulSoup
import importlib.util
import logging

class ContentChecker(BaseChecker):
    """检查页面内容相关的SEO问题"""
    
    def __init__(self, soup: BeautifulSoup, page_url: Optional[str] = None, 
                 content_extractor: str = "auto", enable_advanced_analysis: bool = True):
        """
        初始化内容检查器
        
        Args:
            soup: BeautifulSoup解析的HTML文档对象
            page_url: 页面URL，可选
            content_extractor: 内容提取引擎 ("auto", "trafilatura", "newspaper", "readability", "goose3", "custom")
            enable_advanced_analysis: 是否启用高级内容分析
        """
        super().__init__(soup, page_url)
        self.content_extractor = content_extractor
        self.enable_advanced_analysis = enable_advanced_analysis
        self.extracted_content = {
            "text": "",
            "spelling_errors": [],
            "grammar_errors": []
        }
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """执行所有内容相关检查"""
        self.check_content()
        self.check_images()
        self.check_mobile()
        
        return self.get_issues()
    
    def extract_main_content(self) -> str:
        """
        智能提取页面主要内容区域的文本
        基于用户选择的提取引擎
        """
        html_content = str(self.soup)
        content = ""
        
        # 根据选择的提取引擎选择不同的提取方法
        if self.content_extractor == "auto" or self.content_extractor == "trafilatura":
            if self._check_library_available('trafilatura'):
                try:
                    import trafilatura
                    content = trafilatura.extract(html_content)
                    if content and len(content) > 100:
                        self.extracted_content["text"] = content
                        return content
                except Exception as e:
                    logging.warning(f"Trafilatura内容提取失败: {str(e)}")
            
            # 如果是auto模式，继续尝试其他引擎
            if self.content_extractor != "auto":
                logging.warning("指定的Trafilatura提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
                self.extracted_content["text"] = content
                return content
        
        if self.content_extractor == "auto" or self.content_extractor == "newspaper":
            if self._check_library_available('newspaper'):
                try:
                    from newspaper import fulltext
                    content = fulltext(html_content)
                    if content and len(content) > 100:
                        self.extracted_content["text"] = content
                        return content
                except Exception as e:
                    logging.warning(f"Newspaper3k内容提取失败: {str(e)}")
            
            if self.content_extractor != "auto":
                logging.warning("指定的Newspaper提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
                self.extracted_content["text"] = content
                return content
        
        if self.content_extractor == "auto" or self.content_extractor == "readability":
            if self._check_library_available('readability'):
                try:
                    from readability import Document
                    doc = Document(html_content)
                    content_html = doc.summary()
                    # 从HTML中提取纯文本
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(content_html, 'html.parser')
                    text_content = soup.get_text(separator=' ', strip=True)
                    if text_content and len(text_content) > 100:
                        self.extracted_content["text"] = text_content
                        return text_content
                except Exception as e:
                    logging.warning(f"Readability-lxml内容提取失败: {str(e)}")
            
            if self.content_extractor != "auto":
                logging.warning("指定的Readability提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
                self.extracted_content["text"] = content
                return content
        
        if self.content_extractor == "auto" or self.content_extractor == "goose3":
            if self._check_library_available('goose3'):
                try:
                    from goose3 import Goose
                    g = Goose()
                    article = g.extract(raw_html=html_content)
                    content = article.cleaned_text
                    if content and len(content) > 100:
                        self.extracted_content["text"] = content
                        return content
                except Exception as e:
                    logging.warning(f"Goose3内容提取失败: {str(e)}")
            
            if self.content_extractor != "auto":
                logging.warning("指定的Goose3提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
                self.extracted_content["text"] = content
                return content
        
        # 如果所有引擎都失败或用户选择自定义算法
        if self.content_extractor == "custom" or not content:
            content = self._fallback_extract_content()
            self.extracted_content["text"] = content
            return content
        
        return content
    
    def check_content(self):
        """检查内容相关问题"""
        # 智能提取主要内容区域文本
        text_content = self.extract_main_content()
        
        # 检查内容长度
        if len(text_content) < 300:
            self.add_issue(
                category="Content",
                issue="Low Content Pages",
                description=f"页面内容过少，仅有约{len(text_content)}个字符，可能被视为薄内容。",
                priority="medium",
                issue_type="opportunities"
            )
        
        # 检查Lorem Ipsum占位文本
        if 'lorem ipsum' in text_content.lower():
            self.add_issue(
                category="Content",
                issue="Lorem Ipsum Placeholder",
                description="页面包含Lorem Ipsum占位文本，这应该在发布前替换为实际内容。",
                priority="high",
                issue_type="warnings"
            )
        
        # 仅在启用高级分析时执行
        if self.enable_advanced_analysis:
            self._perform_advanced_content_analysis(text_content)
    
    def _perform_advanced_content_analysis(self, text_content: str):
        """使用language-tool-python和textstat进行高级内容分析"""
        try:
            import language_tool_python
            import textstat
            
            # 如果文本内容太少，不进行分析
            if len(text_content) < 50:
                return
                
            # 检测页面主要语言
            # 简单方法：根据中文字符比例判断
            chinese_chars = sum(1 for c in text_content if '\u4e00' <= c <= '\u9fff')
            is_chinese = chinese_chars / len(text_content) > 0.5
            lang = 'zh-CN' if is_chinese else 'en-US'
            
            # 初始化LanguageTool
            tool = language_tool_python.LanguageTool(lang)
            
            # 为避免处理过大的文本，可以限制文本长度
            sample_text = text_content[:5000]  # 取前5000个字符
            
            # 执行语法和拼写检查
            matches = tool.check(sample_text)
            
            # 保存所有错误和建议，便于前端展示
            self.extracted_content["spelling_errors"] = []
            self.extracted_content["grammar_errors"] = []
            
            # 释放LanguageTool资源
            tool.close()
            
            # 拼写错误
            spelling_errors = [m for m in matches if m.ruleId.startswith(('MORFOLOGIK_', 'SPELLING'))]
            for error in spelling_errors:
                error_data = {
                    "text": error.context,
                    "offset": error.offsetInContext,
                    "length": error.errorLength,
                    "message": error.message,
                    "replacements": error.replacements[:5] if error.replacements else []
                }
                self.extracted_content["spelling_errors"].append(error_data)
            
            if spelling_errors and len(spelling_errors) > 2:  # 忽略少量可能的误报
                # 格式化错误信息
                formatted_resources = []
                for e in spelling_errors[:3]:
                    # 截断上下文，最多显示50个字符
                    context = e.context.strip()
                    if len(context) > 50:
                        context = context[:47] + "..."
                        
                    # 格式化替换建议
                    replacements = e.replacements[:3]
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
            
            # 语法错误
            grammar_errors = [m for m in matches if not m.ruleId.startswith(('MORFOLOGIK_', 'SPELLING'))]
            for error in grammar_errors:
                error_data = {
                    "text": error.context,
                    "offset": error.offsetInContext,
                    "length": error.errorLength,
                    "message": error.message,
                    "replacements": error.replacements[:5] if error.replacements else [],
                    "rule_id": error.ruleId
                }
                self.extracted_content["grammar_errors"].append(error_data)
            
            if grammar_errors and len(grammar_errors) > 2:  # 忽略少量可能的误报
                # 格式化错误信息
                formatted_resources = []
                for e in grammar_errors[:3]:
                    # 截断上下文，最多显示50个字符
                    context = e.context.strip()
                    if len(context) > 50:
                        context = context[:47] + "..."
                        
                    # 格式化错误信息
                    message = e.message.strip() if e.message else "语法错误"
                    formatted_resources.append(f"{context} → {message}")
                        
                self.add_issue(
                    category="Content",
                    issue="Grammar Errors",
                    description=f"发现{len(grammar_errors)}个语法或风格错误，这可能降低内容质量。",
                    priority="medium",
                    affected_resources=formatted_resources,
                    issue_type="issues"
                )
            
            # 执行可读性分析（主要针对英文内容）
            if not is_chinese:
                # Flesch Reading Ease评分
                reading_ease = textstat.flesch_reading_ease(sample_text)
                
                # Flesch-Kincaid Grade Level
                grade_level = textstat.flesch_kincaid_grade(sample_text)
                
                if reading_ease < 30:
                    self.add_issue(
                        category="Content",
                        issue="Readability Very Difficult",
                        description=f"内容可读性极差（Flesch得分：{reading_ease:.1f}，相当于大学以上水平），建议简化语言提高易读性。",
                        priority="medium",
                        issue_type="opportunities"
                    )
                elif reading_ease < 50:
                    self.add_issue(
                        category="Content",
                        issue="Readability Difficult",
                        description=f"内容可读性较差（Flesch得分：{reading_ease:.1f}，大学水平），可考虑简化用词和句式。",
                        priority="low",
                        issue_type="opportunities"
                    )
                
                # 如果分析结果表明内容适合高中以上级别，可能对部分用户不友好
                if grade_level > 12:
                    self.add_issue(
                        category="Content",
                        issue="Advanced Reading Level",
                        description=f"内容阅读水平较高（相当于{grade_level:.1f}年级），可能不适合所有目标用户。",
                        priority="low",
                        issue_type="opportunities"
                    )
            else:
                # 针对中文内容的简单可读性检查
                # 计算平均句子长度
                sentences = re.split(r'[。！？.!?]', sample_text)
                sentences = [s for s in sentences if len(s.strip()) > 0]
                if sentences:
                    avg_sentence_length = sum(len(s) for s in sentences) / len(sentences)
                    
                    if avg_sentence_length > 50:
                        self.add_issue(
                            category="Content",
                            issue="Long Sentences",
                            description=f"内容中句子平均长度为{avg_sentence_length:.1f}个字符，较长的句子可能影响可读性。",
                            priority="low",
                            issue_type="opportunities"
                        )
            
            # 检查是否为Soft 404页面
            soft_404_patterns = [
                "找不到页面", "不存在", "已删除", "page not found", "404", 
                "does not exist", "no longer available", "been removed"
            ]
            
            soft_404_matches = [p for p in soft_404_patterns if p.lower() in sample_text.lower()]
            if soft_404_matches and self.page_url and "404" not in self.page_url:
                self.add_issue(
                    category="Content",
                    issue="Soft 404 Page",
                    description="页面内容暗示这是一个\"软404\"页面（内容表明页面不存在但HTTP状态码不是404）。这可能会混淆搜索引擎爬虫。",
                    priority="high",
                    issue_type="warnings"
                )
                
        except ImportError as e:
            # 如果相关库未安装，添加警告但不影响基本功能
            missing_lib = str(e).split("'")[1] if "'" in str(e) else "required libraries"
            self.add_issue(
                category="Content",
                issue="Limited Content Analysis",
                description=f"高级内容分析功能受限，缺少{missing_lib}。安装language-tool-python和textstat可获得完整的内容质量分析。",
                priority="low",
                issue_type="warnings"
            )
        except Exception as e:
            # 捕获其他可能的异常，以免影响主要功能
            self.add_issue(
                category="Content",
                issue="Content Analysis Error",
                description=f"执行高级内容分析时出错：{str(e)}",
                priority="low",
                issue_type="warnings"
            )
    
    def _check_library_available(self, library_name: str) -> bool:
        """检查指定的库是否可用"""
        return importlib.util.find_spec(library_name) is not None
    
    def _fallback_extract_content(self) -> str:
        """
        自定义算法提取页面主要内容，在没有第三方库可用时使用
        """
        # 1. 尝试通过常见的内容容器标签和类名定位主要内容
        content_selectors = [
            'article', 'main', '.content', '#content', '.post', '.entry', 
            '.post-content', '.article-content', '.entry-content', '.page-content'
        ]
        
        # 尝试定位主要内容区域
        main_content_element = None
        for selector in content_selectors:
            elements = self.soup.select(selector)
            if elements:
                main_content_element = elements[0]
                break
                
        # 2. 如果没有找到明确的内容容器，使用启发式方法
        if not main_content_element:
            # 排除这些明显的非内容区域
            excluded_tags = ['nav', 'header', 'footer', 'aside', 'menu', 'style', 'script', 'meta', 'link', 'noscript']
            excluded_classes = ['menu', 'nav', 'navigation', 'header', 'footer', 'sidebar', 'widget', 'banner', 'ad']
            
            # 收集所有可能的内容块
            potential_content_blocks = []
            
            for element in self.soup.find_all(['div', 'section', 'article', 'main']):
                # 跳过被排除的标签
                if element.name in excluded_tags:
                    continue
                
                # 跳过被排除的类
                element_classes = element.get('class', [])
                if isinstance(element_classes, str):
                    element_classes = [element_classes]
                    
                if any(excluded_class in (cls.lower() if isinstance(cls, str) else '') 
                       for cls in element_classes for excluded_class in excluded_classes):
                    continue
                
                # 获取文本及其长度
                text = element.get_text(strip=True)
                text_length = len(text)
                
                # 计算内容密度（文本长度与HTML长度的比值）
                html_length = len(str(element))
                if html_length == 0:
                    continue
                
                content_density = text_length / html_length
                
                # 排除特别短的文本块
                if text_length < 100:
                    continue
                
                # 计算段落数量
                paragraphs = element.find_all('p')
                paragraph_count = len(paragraphs)
                
                # 收集潜在内容块信息
                potential_content_blocks.append({
                    'element': element,
                    'text_length': text_length,
                    'content_density': content_density,
                    'paragraph_count': paragraph_count,
                    'score': text_length * content_density * (1 + 0.1 * paragraph_count)  # 综合评分
                })
            
            # 如果找到了潜在内容块，选择评分最高的
            if potential_content_blocks:
                potential_content_blocks.sort(key=lambda x: x['score'], reverse=True)
                main_content_element = potential_content_blocks[0]['element']
            else:
                # 如果没有找到任何合适的内容块，使用body
                main_content_element = self.soup.body
        
        # 3. 从选定的内容区域中提取文本
        if main_content_element:
            # 进一步排除内容区域中的非内容元素
            for exclude_tag in main_content_element.find_all(['nav', 'header', 'footer', 'aside', 'style', 'script']):
                exclude_tag.decompose()
            
            content_text = main_content_element.get_text(separator=' ', strip=True)
            
            # 清理多余的空白字符
            content_text = re.sub(r'\s+', ' ', content_text).strip()
            return content_text
        
        # 4. 如果所有方法都失败，回退到使用整个页面文本
        return self.soup.get_text(separator=' ', strip=True)
    
    def check_images(self):
        """检查图片相关问题"""
        img_tags = self.soup.find_all('img')
        
        # 检查所有图片是否有alt属性
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
                break  # 只报告一次
            elif img['alt'].strip() == '':
                self.add_issue(
                    category="Images",
                    issue="Missing Alt Text",
                    description="图片的alt属性是空的，应该提供描述性的替代文本。",
                    affected_element=str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    priority="low",
                    issue_type="issues"
                )
                break  # 只报告一次
            elif len(img['alt']) > 100:
                self.add_issue(
                    category="Images",
                    issue="Alt Text Over 100 Characters",
                    description=f"图片的alt文本长度为{len(img['alt'])}个字符，超过了100个字符的建议长度。",
                    affected_element=str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    priority="low",
                    issue_type="opportunities"
                )
                break  # 只报告一次
        
        # 检查图片是否有尺寸属性
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
                break  # 只报告一次
    
    def check_mobile(self):
        """检查移动端相关问题"""
        # 检查viewport
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