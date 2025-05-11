from .base_checker import BaseChecker
from typing import Dict, Any, List
import re

class ContentChecker(BaseChecker):
    """检查页面内容相关的SEO问题"""
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """执行所有内容相关检查"""
        self.check_content()
        self.check_images()
        self.check_mobile()
        
        return self.get_issues()
    
    def check_content(self):
        """检查内容相关问题"""
        # 获取页面可见文本内容
        text_content = self.soup.get_text(strip=True)
        
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
        
        # 使用language-tool-python和textstat进行高级内容分析
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
            
            # 释放LanguageTool资源
            tool.close()
            
            # 拼写错误
            spelling_errors = [m for m in matches if m.ruleId.startswith(('MORFOLOGIK_', 'SPELLING'))]
            if spelling_errors and len(spelling_errors) > 2:  # 忽略少量可能的误报
                self.add_issue(
                    category="Content",
                    issue="Spelling Errors",
                    description=f"发现{len(spelling_errors)}个拼写错误，这可能影响用户体验和SEO表现。",
                    priority="medium",
                    affected_resources=[f"{e.context} -> {e.replacements[:3]}" for e in spelling_errors[:3]],
                    issue_type="issues"
                )
            
            # 语法错误
            grammar_errors = [m for m in matches if not m.ruleId.startswith(('MORFOLOGIK_', 'SPELLING'))]
            if grammar_errors and len(grammar_errors) > 2:  # 忽略少量可能的误报
                self.add_issue(
                    category="Content",
                    issue="Grammar Errors",
                    description=f"发现{len(grammar_errors)}个语法或风格错误，这可能降低内容质量。",
                    priority="medium",
                    affected_resources=[f"{e.context} -> {e.message}" for e in grammar_errors[:3]],
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