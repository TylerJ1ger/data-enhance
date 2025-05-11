import os
import tempfile
from typing import List, Dict, Any, Optional, Set, Tuple
import re
from bs4 import BeautifulSoup
from fastapi import UploadFile
import validators

class SEOProcessor:
    def __init__(self):
        self.html_content = None
        self.soup = None
        self.issues = {
            "issues": [],      # 问题 - 需要修复的错误
            "warnings": [],    # 警告 - 需要检查但不一定是问题的项目
            "opportunities": [] # 机会 - 可以优化的部分
        }
        self.page_url = None  # 存储页面URL，如果在HTML中找到
        
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
        
        # 运行所有检查函数
        self.check_response_codes()
        self.check_security()
        self.check_url()
        self.check_page_titles()
        self.check_meta_description()
        self.check_h1()
        self.check_h2()
        self.check_content()
        self.check_images()
        self.check_canonicals()
        self.check_pagination()
        self.check_hreflang()
        self.check_javascript()
        self.check_links()
        self.check_structured_data()
        self.check_mobile()
        self.check_accessibility()
    
    def check_response_codes(self):
        """检查响应码相关问题"""
        # 由于只有HTML文件，无法完全检查响应码
        # 但可以检查HTML内部的meta刷新重定向
        meta_refresh = self.soup.find('meta', attrs={'http-equiv': re.compile('^refresh$', re.I)})
        if meta_refresh:
            self.issues["warnings"].append({
                "category": "Response Codes",
                "issue": "Internal Redirection (Meta Refresh)",
                "description": "页面使用meta refresh进行重定向，建议改用HTTP 301/302重定向。",
                "priority": "low"
            })
    
    def check_security(self):
        """检查安全相关问题"""
        # 检查是否使用HTTPS
        if self.page_url and self.page_url.startswith('http://'):
            self.issues["issues"].append({
                "category": "Security",
                "issue": "HTTP URLs",
                "description": "网站使用不安全的HTTP协议。建议迁移到HTTPS以提高安全性和SEO表现。",
                "priority": "high"
            })
        
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
                self.issues["issues"].append({
                    "category": "Security",
                    "issue": "Mixed Content",
                    "description": f"HTTPS页面加载了{len(insecure_resources)}个HTTP资源，可能导致混合内容警告。",
                    "affected_resources": insecure_resources[:5],  # 只显示前5个
                    "priority": "high"
                })
        
        # 检查表单安全
        forms = self.soup.find_all('form')
        for form in forms:
            action = form.get('action', '')
            if action.startswith('http://'):
                self.issues["issues"].append({
                    "category": "Security",
                    "issue": "Form URL Insecure",
                    "description": "表单提交到不安全的HTTP URL，可能导致用户数据被拦截。",
                    "priority": "high"
                })
            
            if not action.startswith('https://') and self.page_url and self.page_url.startswith('http://'):
                self.issues["issues"].append({
                    "category": "Security",
                    "issue": "Form On HTTP URL",
                    "description": "表单位于HTTP页面上，用户提交的数据可能不安全。",
                    "priority": "high"
                })
    
    def check_url(self):
        """检查URL相关问题"""
        if not self.page_url:
            return
        
        # 检查URL是否包含多个斜杠
        if '//' in self.page_url.replace('://', ''):
            self.issues["issues"].append({
                "category": "URL",
                "issue": "Multiple Slashes",
                "description": "URL包含多个连续斜杠，可能导致规范化问题。",
                "priority": "low"
            })
        
        # 检查URL是否包含空格
        if ' ' in self.page_url:
            self.issues["issues"].append({
                "category": "URL",
                "issue": "Contains A Space",
                "description": "URL包含空格，应使用%20或'-'替代。",
                "priority": "low"
            })
        
        # 检查URL是否包含大写字母 - 添加URL格式检查
        if '://' in self.page_url:  # 确保URL包含协议部分
            try:
                path = self.page_url.split('://', 1)[1].split('/', 1)
                if len(path) > 1 and any(c.isupper() for c in path[1]):
                    self.issues["warnings"].append({
                        "category": "URL",
                        "issue": "Uppercase",
                        "description": "URL路径包含大写字母。建议使用全小写以避免重复内容问题。",
                        "priority": "low"
                    })
            except IndexError:
                # 处理URL格式异常的情况
                pass
        
        # 检查URL长度
        if len(self.page_url) > 115:
            self.issues["opportunities"].append({
                "category": "URL",
                "issue": "Over 115 Characters",
                "description": "URL长度超过115个字符，可能影响用户体验和搜索引擎处理。",
                "priority": "low"
            })
    
    def check_page_titles(self):
        """检查页面标题相关问题"""
        titles = self.soup.find_all('title')
        
        # 检查title标签是否存在
        if not titles:
            self.issues["issues"].append({
                "category": "Page Titles",
                "issue": "Missing",
                "description": "页面缺少<title>标签，这是SEO的基本要求。",
                "priority": "high"
            })
            return
        
        # 检查多个title标签
        if len(titles) > 1:
            self.issues["issues"].append({
                "category": "Page Titles",
                "issue": "Multiple",
                "description": f"页面包含{len(titles)}个<title>标签，应该只有一个。",
                "priority": "high"
            })
        
        # 获取第一个title的内容
        title = titles[0].text.strip()
        
        # 检查title长度
        if len(title) > 60:
            self.issues["opportunities"].append({
                "category": "Page Titles",
                "issue": "Over 60 Characters",
                "description": f"标题长度为{len(title)}个字符，超过了60个字符的建议长度。",
                "priority": "medium"
            })
        elif len(title) < 30 and len(title) > 0:
            self.issues["opportunities"].append({
                "category": "Page Titles",
                "issue": "Below 30 Characters",
                "description": f"标题长度为{len(title)}个字符，低于30个字符的建议最小长度。",
                "priority": "medium"
            })
        
        # 检查title是否与h1相同
        h1_tags = self.soup.find_all('h1')
        if h1_tags and title == h1_tags[0].text.strip():
            self.issues["opportunities"].append({
                "category": "Page Titles",
                "issue": "Same as H1",
                "description": "页面标题与H1标题完全相同，建议适当区分以提供更多信息。",
                "priority": "low"
            })
    
    def check_meta_description(self):
        """检查元描述相关问题"""
        descriptions = self.soup.find_all('meta', attrs={'name': 'description'})
        
        # 检查是否存在元描述
        if not descriptions:
            self.issues["opportunities"].append({
                "category": "Meta Description",
                "issue": "Missing",
                "description": "页面缺少元描述标签，这可能影响搜索结果中的显示内容。",
                "priority": "low"
            })
            return
        
        # 检查多个元描述
        if len(descriptions) > 1:
            self.issues["issues"].append({
                "category": "Meta Description",
                "issue": "Multiple",
                "description": f"页面包含{len(descriptions)}个元描述标签，应该只有一个。",
                "priority": "medium"
            })
        
        # 检查元描述长度
        description = descriptions[0].get('content', '').strip()
        if len(description) > 155:
            self.issues["opportunities"].append({
                "category": "Meta Description",
                "issue": "Over 155 Characters",
                "description": f"元描述长度为{len(description)}个字符，超过了155个字符的建议长度。",
                "priority": "low"
            })
        elif len(description) < 70 and len(description) > 0:
            self.issues["opportunities"].append({
                "category": "Meta Description",
                "issue": "Below 70 Characters",
                "description": f"元描述长度为{len(description)}个字符，低于70个字符的建议最小长度。",
                "priority": "low"
            })
    
    def check_h1(self):
        """检查H1标题相关问题"""
        h1_tags = self.soup.find_all('h1')
        
        # 检查是否存在H1标签
        if not h1_tags:
            self.issues["issues"].append({
                "category": "H1",
                "issue": "Missing",
                "description": "页面缺少H1标题标签，这是SEO的重要因素。",
                "priority": "medium"
            })
            return
        
        # 检查多个H1标签
        if len(h1_tags) > 1:
            self.issues["warnings"].append({
                "category": "H1",
                "issue": "Multiple",
                "description": f"页面包含{len(h1_tags)}个H1标签，建议只使用一个主要H1标签。",
                "priority": "medium"
            })
        
        # 检查H1长度
        h1_text = h1_tags[0].text.strip()
        if len(h1_text) > 70:
            self.issues["opportunities"].append({
                "category": "H1",
                "issue": "Over 70 Characters",
                "description": f"H1标题长度为{len(h1_text)}个字符，超过了70个字符的建议长度。",
                "priority": "low"
            })
        
        # 检查重复的H1内容
        if len(h1_tags) > 1:
            h1_texts = [tag.text.strip() for tag in h1_tags]
            if len(set(h1_texts)) < len(h1_texts):
                self.issues["opportunities"].append({
                    "category": "H1",
                    "issue": "Duplicate",
                    "description": "页面包含内容重复的H1标签。",
                    "priority": "low"
                })
    
    def check_h2(self):
        """检查H2标题相关问题"""
        h2_tags = self.soup.find_all('h2')
        
        # 检查是否存在H2标签
        if not h2_tags:
            self.issues["warnings"].append({
                "category": "H2",
                "issue": "Missing",
                "description": "页面缺少H2标题标签，这可能影响内容结构化。",
                "priority": "low"
            })
            return
        
        # 检查H2长度
        for h2 in h2_tags:
            h2_text = h2.text.strip()
            if len(h2_text) > 70:
                self.issues["opportunities"].append({
                    "category": "H2",
                    "issue": "Over 70 Characters",
                    "description": f"H2标题长度为{len(h2_text)}个字符，超过了70个字符的建议长度。",
                    "priority": "low"
                })
                break  # 只报告一次
        
        # 检查重复的H2内容
        h2_texts = [tag.text.strip() for tag in h2_tags]
        if len(set(h2_texts)) < len(h2_texts):
            self.issues["opportunities"].append({
                "category": "H2",
                "issue": "Duplicate",
                "description": "页面包含内容重复的H2标签。",
                "priority": "low"
            })
    
    def check_content(self):
        """检查内容相关问题"""
        # 获取页面可见文本内容
        text_content = self.soup.get_text(strip=True)
        
        # 检查内容长度
        if len(text_content) < 300:
            self.issues["opportunities"].append({
                "category": "Content",
                "issue": "Low Content Pages",
                "description": f"页面内容过少，仅有约{len(text_content)}个字符，可能被视为薄内容。",
                "priority": "medium"
            })
        
        # 检查Lorem Ipsum占位文本
        if 'lorem ipsum' in text_content.lower():
            self.issues["warnings"].append({
                "category": "Content",
                "issue": "Lorem Ipsum Placeholder",
                "description": "页面包含Lorem Ipsum占位文本，这应该在发布前替换为实际内容。",
                "priority": "high"
            })
    
    def check_images(self):
        """检查图片相关问题"""
        img_tags = self.soup.find_all('img')
        
        # 检查所有图片是否有alt属性
        for img in img_tags:
            if not img.has_attr('alt'):
                self.issues["issues"].append({
                    "category": "Images",
                    "issue": "Missing Alt Attribute",
                    "description": "图片缺少alt属性，这对于SEO和无障碍访问至关重要。",
                    "affected_element": str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    "priority": "low"
                })
                break  # 只报告一次
            elif img['alt'].strip() == '':
                self.issues["issues"].append({
                    "category": "Images",
                    "issue": "Missing Alt Text",
                    "description": "图片的alt属性是空的，应该提供描述性的替代文本。",
                    "affected_element": str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    "priority": "low"
                })
                break  # 只报告一次
            elif len(img['alt']) > 100:
                self.issues["opportunities"].append({
                    "category": "Images",
                    "issue": "Alt Text Over 100 Characters",
                    "description": f"图片的alt文本长度为{len(img['alt'])}个字符，超过了100个字符的建议长度。",
                    "affected_element": str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    "priority": "low"
                })
                break  # 只报告一次
        
        # 检查图片是否有尺寸属性
        for img in img_tags:
            if not (img.has_attr('width') and img.has_attr('height')):
                self.issues["opportunities"].append({
                    "category": "Images",
                    "issue": "Missing Size Attributes",
                    "description": "图片缺少宽度和高度属性，这可能导致页面加载时的布局偏移(CLS)。",
                    "affected_element": str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    "priority": "low"
                })
                break  # 只报告一次
    
    def check_canonicals(self):
        """检查规范链接相关问题"""
        canonical_tags = self.soup.find_all('link', rel='canonical')
        
        # 检查是否存在规范链接
        if not canonical_tags:
            self.issues["warnings"].append({
                "category": "Canonicals",
                "issue": "Missing",
                "description": "页面缺少规范链接标签，这可能导致重复内容问题。",
                "priority": "medium"
            })
            return
        
        # 检查多个规范链接
        if len(canonical_tags) > 1:
            self.issues["warnings"].append({
                "category": "Canonicals",
                "issue": "Multiple",
                "description": f"页面包含{len(canonical_tags)}个规范链接标签，应该只有一个。",
                "priority": "low"
            })
        
        # 检查规范链接是否为相对URL
        canonical_href = canonical_tags[0].get('href', '')
        if canonical_href and not canonical_href.startswith(('http://', 'https://')):
            self.issues["warnings"].append({
                "category": "Canonicals",
                "issue": "Canonical Is Relative",
                "description": "规范链接使用相对URL，最佳做法是使用绝对URL。",
                "priority": "low"
            })
    
    def check_pagination(self):
        """检查分页相关问题"""
        # 检查rel="next"和rel="prev"链接
        next_links = self.soup.find_all('link', rel='next')
        prev_links = self.soup.find_all('link', rel='prev')
        
        if (next_links or prev_links) and not self.soup.find('link', rel='canonical'):
            self.issues["warnings"].append({
                "category": "Pagination",
                "issue": "Missing Canonical",
                "description": "分页页面应该有规范链接标签，以避免重复内容问题。",
                "priority": "medium"
            })
    
    def check_hreflang(self):
        """检查hreflang相关问题"""
        hreflang_tags = self.soup.find_all('link', attrs={'rel': 'alternate', 'hreflang': True})
        
        if not hreflang_tags:
            return  # 没有hreflang标签，不需要检查
        
        # 检查是否有x-default
        if not any(tag.get('hreflang') == 'x-default' for tag in hreflang_tags):
            self.issues["warnings"].append({
                "category": "Hreflang",
                "issue": "Missing X-Default",
                "description": "使用hreflang时建议包含x-default标签，用于不匹配任何语言的用户。",
                "priority": "low"
            })
        
        # 检查是否有自引用
        page_lang = None
        for tag in hreflang_tags:
            if tag.get('href') == self.page_url:
                page_lang = tag.get('hreflang')
                break
        
        if page_lang and not any(tag.get('hreflang') == page_lang for tag in hreflang_tags):
            self.issues["warnings"].append({
                "category": "Hreflang",
                "issue": "Missing Self Reference",
                "description": "当前页面的语言没有在hreflang标签中自我引用。",
                "priority": "low"
            })
    
    def check_javascript(self):
        """检查JavaScript相关问题"""
        # 由于静态分析限制，只能做基本检查
        
        # 检查是否有内联JavaScript
        inline_scripts = self.soup.find_all('script', src=None)
        if inline_scripts and any(len(script.string or '') > 500 for script in inline_scripts):
            self.issues["warnings"].append({
                "category": "JavaScript",
                "issue": "Contains JavaScript Content",
                "description": "页面包含大量内联JavaScript，这可能影响页面加载性能。",
                "priority": "medium"
            })
    
    def check_links(self):
        """检查链接相关问题"""
        links = self.soup.find_all('a', href=True)
        
        # 检查是否有内部链接
        internal_links = []
        for link in links:
            href = link['href']
            # 判断是否为内部链接
            if not href.startswith(('http://', 'https://', 'mailto:', 'tel:', '#')) or \
               (self.page_url and href.startswith(self.page_url)):
                internal_links.append(link)
        
        if not internal_links:
            self.issues["warnings"].append({
                "category": "Links",
                "issue": "Pages Without Internal Outlinks",
                "description": "页面没有内部链接，这可能不利于搜索引擎爬行和用户导航。",
                "priority": "high"
            })
        
        # 检查空锚文本
        for link in internal_links:
            if not link.text.strip() and not link.find('img'):
                self.issues["opportunities"].append({
                    "category": "Links",
                    "issue": "Internal Outlinks With No Anchor Text",
                    "description": "内部链接缺少锚文本，这对SEO不利。",
                    "affected_element": str(link)[:100] + ('...' if len(str(link)) > 100 else ''),
                    "priority": "low"
                })
                break  # 只报告一次
            
            if link.text.strip() in ['点击这里', '查看更多', '了解详情', 'click here', 'read more', 'learn more']:
                self.issues["opportunities"].append({
                    "category": "Links",
                    "issue": "Non-Descriptive Anchor Text In Internal Outlinks",
                    "description": "内部链接使用非描述性锚文本，应使用更有意义的文本。",
                    "affected_element": str(link)[:100] + ('...' if len(str(link)) > 100 else ''),
                    "priority": "low"
                })
                break  # 只报告一次
    
    def check_structured_data(self):
        """检查结构化数据相关问题"""
        # 查找JSON-LD结构化数据
        ld_script = self.soup.find('script', attrs={'type': 'application/ld+json'})
        
        # 查找Microdata结构化数据
        microdata = self.soup.find(attrs={'itemtype': True})
        
        # 查找RDFa结构化数据
        rdfa = self.soup.find(attrs={'vocab': True}) or self.soup.find(attrs={'property': re.compile('^og:|^article:')})
        
        if not (ld_script or microdata or rdfa):
            self.issues["opportunities"].append({
                "category": "Structured Data",
                "issue": "Missing",
                "description": "页面没有使用结构化数据，添加结构化数据可以帮助搜索引擎更好地理解内容。",
                "priority": "low"
            })
    
    def check_mobile(self):
        """检查移动端相关问题"""
        # 检查viewport
        viewport = self.soup.find('meta', attrs={'name': 'viewport'})
        if not viewport:
            self.issues["issues"].append({
                "category": "Mobile",
                "issue": "Viewport Not Set",
                "description": "页面缺少viewport元标签，这对于移动端响应式显示至关重要。",
                "priority": "high"
            })
        else:
            viewport_content = viewport.get('content', '').lower()
            if 'user-scalable=no' in viewport_content or 'maximum-scale=1' in viewport_content:
                self.issues["warnings"].append({
                    "category": "Mobile",
                    "issue": "Viewport Prevents Scaling",
                    "description": "Viewport设置阻止了用户缩放，这会影响无障碍访问。",
                    "priority": "medium"
                })
    
    def check_accessibility(self):
        """检查无障碍访问相关问题"""
        # 检查语言属性
        html_tag = self.soup.find('html')
        if not html_tag or not html_tag.has_attr('lang'):
            self.issues["warnings"].append({
                "category": "Accessibility",
                "issue": "HTML Element Requires Lang Attribute",
                "description": "HTML标签缺少lang属性，这对屏幕阅读器和搜索引擎很重要。",
                "priority": "high"
            })
        
        # 检查表单标签
        forms = self.soup.find_all('form')
        for form in forms:
            inputs = form.find_all('input', attrs={'type': lambda t: t not in ['hidden', 'submit', 'button', 'image']})
            for input_tag in inputs:
                if not input_tag.has_attr('id'):
                    continue
                
                # 检查是否有相关联的label
                input_id = input_tag['id']
                label = self.soup.find('label', attrs={'for': input_id})
                if not label:
                    self.issues["warnings"].append({
                        "category": "Accessibility",
                        "issue": "Form Input Elements Require Labels",
                        "description": "表单输入元素缺少关联的label标签，这影响无障碍访问。",
                        "affected_element": str(input_tag)[:100] + ('...' if len(str(input_tag)) > 100 else ''),
                        "priority": "high"
                    })
                    break  # 只报告一次