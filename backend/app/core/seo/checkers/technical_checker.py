from .base_checker import BaseChecker
from typing import Dict, Any, List
from urllib.parse import urlparse, parse_qs
import re

class TechnicalChecker(BaseChecker):
    """检查技术性SEO问题，如响应码、安全性、URL结构等"""
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """执行所有技术相关检查"""
        self.check_response_codes()
        self.check_security()
        self.check_url()
        
        return self.get_issues()
    
    def check_response_codes(self):
        """检查响应码相关问题"""
        # 由于只有HTML文件，无法完全检查响应码
        # 但可以检查HTML内部的meta刷新重定向
        meta_refresh = self.soup.find('meta', attrs={'http-equiv': re.compile('^refresh$', re.I)})
        if meta_refresh:
            self.add_issue(
                category="Response Codes",
                issue="Internal Redirection (Meta Refresh)",
                description="页面使用meta refresh进行重定向，建议改用HTTP 301/302重定向。",
                priority="low",
                issue_type="warnings"
            )
    
    def check_security(self):
        """检查安全相关问题"""
        # 检查是否使用HTTPS
        if self.page_url and self.page_url.startswith('http://'):
            self.add_issue(
                category="Security",
                issue="HTTP URLs",
                description="网站使用不安全的HTTP协议。建议迁移到HTTPS以提高安全性和SEO表现。",
                priority="high",
                issue_type="issues"
            )
        
        # 检查混合内容
        if self.page_url and self.page_url.startswith('https://'):
            # 检查脚本、链接、图片等资源是否使用HTTP
            insecure_resources = []
            
            # 检查脚本
            for script in self.soup.find_all('script', src=True):
                if script['src'].startswith('http://'):
                    insecure_resources.append(script['src'])
            
            # 检查样式表
            for link in self.soup.find_all('link', rel='stylesheet', href=True):
                if link['href'].startswith('http://'):
                    insecure_resources.append(link['href'])
            
            # 检查图片
            for img in self.soup.find_all('img', src=True):
                if img['src'].startswith('http://'):
                    insecure_resources.append(img['src'])
            
            if insecure_resources:
                self.add_issue(
                    category="Security",
                    issue="Mixed Content",
                    description=f"HTTPS页面加载了{len(insecure_resources)}个HTTP资源，可能导致混合内容警告。",
                    affected_resources=insecure_resources[:5],  # 只显示前5个
                    priority="high",
                    issue_type="issues"
                )
        
        # 检查表单安全
        forms = self.soup.find_all('form')
        for form in forms:
            action = form.get('action', '')
            if action.startswith('http://'):
                self.add_issue(
                    category="Security",
                    issue="Form URL Insecure",
                    description="表单提交到不安全的HTTP URL，可能导致用户数据被拦截。",
                    priority="high",
                    issue_type="issues"
                )
            
            if not action.startswith('https://') and self.page_url and self.page_url.startswith('http://'):
                self.add_issue(
                    category="Security",
                    issue="Form On HTTP URL",
                    description="表单位于HTTP页面上，用户提交的数据可能不安全。",
                    priority="high",
                    issue_type="issues"
                )
    
    def check_url(self):
        """检查URL相关问题"""
        if not self.page_url:
            return
        
        # 解析URL
        parsed_url = urlparse(self.page_url)
        path = parsed_url.path
        query = parsed_url.query
        fragment = parsed_url.fragment
        query_params = parse_qs(query)
        
        # === 已实现的检查 ===
        # 检查URL是否包含多个斜杠
        if '//' in path:
            self.add_issue(
                category="URL",
                issue="Multiple Slashes",
                description="URL包含多个连续斜杠，可能导致规范化问题。",
                priority="low",
                issue_type="issues"
            )
        
        # 检查URL是否包含空格
        if ' ' in self.page_url:
            self.add_issue(
                category="URL",
                issue="Contains A Space",
                description="URL包含空格，应使用%20或'-'替代。",
                priority="low",
                issue_type="issues"
            )
        
        # 检查URL是否包含大写字母
        if any(c.isupper() for c in path):
            self.add_issue(
                category="URL",
                issue="Uppercase",
                description="URL路径包含大写字母。建议使用全小写以避免重复内容问题。",
                priority="low",
                issue_type="warnings"
            )
        
        # 检查URL长度
        if len(self.page_url) > 115:
            self.add_issue(
                category="URL",
                issue="Over 115 Characters",
                description="URL长度超过115个字符，可能影响用户体验和搜索引擎处理。",
                priority="low",
                issue_type="opportunities"
            )
        
        # === 新增检查 ===
        # 检查Broken Bookmark
        if fragment and self.soup:
            has_matching_id = bool(self.soup.find(id=fragment))
            has_matching_name = bool(self.soup.find(attrs={"name": fragment}))
            
            if not (has_matching_id or has_matching_name):
                self.add_issue(
                    category="URL",
                    issue="Broken Bookmark",
                    description=f"URL包含锚点#{fragment}，但页面中不存在对应ID或名称的元素。",
                    priority="medium",
                    issue_type="issues"
                )
        
        # 检查Non ASCII Characters
        if re.search(r'[^\x00-\x7F]', self.page_url):
            self.add_issue(
                category="URL",
                issue="Non ASCII Characters",
                description="URL包含非ASCII字符，可能导致在某些浏览器或系统中显示异常。",
                priority="medium", 
                issue_type="warnings"
            )
        
        # 检查Repetitive Path
        path_segments = [seg for seg in path.split('/') if seg]
        if len(path_segments) != len(set(path_segments)) and len(path_segments) > 1:
            self.add_issue(
                category="URL",
                issue="Repetitive Path",
                description="URL路径包含重复的路径片段，可能导致内容重复问题。",
                priority="low",
                issue_type="warnings"
            )
        
        # 检查Internal Search
        search_params = ['search', 'query', 'q', 'find', 'keyword', 'keywords', 's']
        if any(param in query_params for param in search_params):
            self.add_issue(
                category="URL",
                issue="Internal Search",
                description="URL可能是内部搜索结果页面，应考虑添加noindex元标签避免索引。",
                priority="medium",
                issue_type="warnings"
            )
        
        # 检查Parameters
        if len(query_params) > 2:
            self.add_issue(
                category="URL",
                issue="Parameters",
                description=f"URL包含{len(query_params)}个查询参数，过多参数可能导致爬取问题。",
                priority="low",
                issue_type="warnings"
            )
        
        # 检查GA Tracking Parameters
        ga_params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']
        has_ga_params = any(param in query_params for param in ga_params)
        if has_ga_params:
            self.add_issue(
                category="URL",
                issue="GA Tracking Parameters",
                description="URL包含Google Analytics或社交媒体跟踪参数，应确保正确处理这些参数以避免内容重复。",
                priority="low",
                issue_type="warnings"
            )
        
        # 检查Underscores
        if '_' in path:
            self.add_issue(
                category="URL",
                issue="Underscores",
                description="URL路径使用下划线(_)而非连字符(-)，搜索引擎建议使用连字符分隔单词。",
                priority="low",
                issue_type="opportunities"
            )