from typing import Dict, Any, List
import re
from .base_checker import BaseChecker

class MetaChecker(BaseChecker):
    """检查页面元数据相关的SEO问题"""
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """执行所有元数据相关检查"""
        self.check_page_titles()
        self.check_meta_description()
        self.check_h1()
        self.check_h2()
        self.check_heading_hierarchy()
        self.check_robots_directives()
        
        return self.get_issues()
    
    def estimate_pixel_width(self, text: str) -> int:
        """
        估算文本的像素宽度
        这是一个简单的启发式方法，假设:
        - 英文字母、数字、标点平均约7像素宽
        - 中文字符约14像素宽
        - 空格约3像素宽
        """
        if not text:
            return 0
            
        pixel_width = 0
        for char in text:
            if ord(char) > 127:  # 非ASCII字符(如中文、日文等)
                pixel_width += 14
            elif char.isspace():  # 空格
                pixel_width += 3
            else:  # ASCII字符(英文字母、数字、标点)
                pixel_width += 7
                
        return pixel_width
    
    def check_page_titles(self):
        """检查页面标题相关问题"""
        titles = self.soup.find_all('title')
        
        # 检查title标签是否存在
        if not titles:
            self.add_issue(
                category="Page Titles",
                issue="Missing",
                description="页面缺少<title>标签，这是SEO的基本要求。",
                priority="high",
                issue_type="issues"
            )
            return
        
        # 检查多个title标签
        if len(titles) > 1:
            self.add_issue(
                category="Page Titles",
                issue="Multiple",
                description=f"页面包含{len(titles)}个<title>标签，应该只有一个。",
                priority="high",
                issue_type="issues"
            )
        
        # 检查title标签是否在head内
        head_tag = self.soup.find('head')
        title_in_head = False
        
        if head_tag:
            head_titles = head_tag.find_all('title')
            if not head_titles or len(head_titles) != len(titles):
                self.add_issue(
                    category="Page Titles",
                    issue="Outside <head>",
                    description="页面的<title>标签应该位于<head>元素内。",
                    priority="high",
                    issue_type="issues"
                )
            else:
                title_in_head = True
        
        # 获取第一个title的内容
        title = titles[0].text.strip()
        
        # 检查title字符长度
        if len(title) > 60:
            self.add_issue(
                category="Page Titles",
                issue="Over 60 Characters",
                description=f"标题长度为{len(title)}个字符，超过了60个字符的建议长度。",
                priority="medium",
                issue_type="opportunities"
            )
        elif len(title) < 30 and len(title) > 0:
            self.add_issue(
                category="Page Titles",
                issue="Below 30 Characters",
                description=f"标题长度为{len(title)}个字符，低于30个字符的建议最小长度。",
                priority="medium",
                issue_type="opportunities"
            )
        
        # 估算标题的像素宽度
        # 这是一个启发式估算，假设平均每个英文字符14px，数字13px，其他字符20px
        pixel_width = 0
        for char in title:
            if char.isalpha() and ord(char) < 128:  # 英文字母
                pixel_width += 14
            elif char.isdigit():  # 数字
                pixel_width += 13
            else:  # 其他字符(包括中文、标点等)
                pixel_width += 20
        
        # 检查像素宽度
        if pixel_width > 561:
            self.add_issue(
                category="Page Titles",
                issue="Over 561 Pixels",
                description=f"标题估计宽度约为{pixel_width}像素，超过了561像素的建议最大宽度。这可能导致在搜索结果中被截断。",
                priority="medium",
                issue_type="opportunities"
            )
        elif pixel_width < 200:
            self.add_issue(
                category="Page Titles",
                issue="Below 200 Pixels",
                description=f"标题估计宽度约为{pixel_width}像素，低于200像素的建议最小宽度。标题可能过短，未充分利用展示空间。",
                priority="low",
                issue_type="opportunities"
            )
        
        # 检查title是否与h1相同
        h1_tags = self.soup.find_all('h1')
        if h1_tags and title == h1_tags[0].text.strip():
            self.add_issue(
                category="Page Titles",
                issue="Same as H1",
                description="页面标题与H1标题完全相同，建议适当区分以提供更多信息。",
                priority="low",
                issue_type="opportunities"
            )

    def check_meta_description(self):
        """检查元描述相关问题"""
        # 查找所有元描述标签，不限于位置
        all_descriptions = self.soup.find_all('meta', attrs={'name': 'description'})
        
        # 检查是否存在元描述
        if not all_descriptions:
            self.add_issue(
                category="Meta Description",
                issue="Missing",
                description="页面缺少元描述标签，这可能影响搜索结果中的显示内容。",
                priority="low",
                issue_type="opportunities"
            )
            return
        
        # 检查多个元描述
        if len(all_descriptions) > 1:
            self.add_issue(
                category="Meta Description",
                issue="Multiple",
                description=f"页面包含{len(all_descriptions)}个元描述标签，应该只有一个。",
                priority="medium",
                issue_type="issues"
            )
        
        # 检查元描述是否位于head标签内
        head_tag = self.soup.find('head')
        if head_tag:
            head_descriptions = head_tag.find_all('meta', attrs={'name': 'description'})
            if len(head_descriptions) < len(all_descriptions):
                # 有些元描述标签不在head内
                outside_head = [desc for desc in all_descriptions if desc not in head_descriptions]
                self.add_issue(
                    category="Meta Description",
                    issue="Outside <head>",
                    description="有元描述标签位于<head>标签外，这不符合HTML规范且可能不被搜索引擎识别。",
                    priority="high",
                    affected_element=str(outside_head[0])[:100] + ('...' if len(str(outside_head[0])) > 100 else ''),
                    issue_type="issues"
                )
        
        # 检查元描述长度和估计像素宽度
        # 取第一个元描述进行分析
        description = all_descriptions[0].get('content', '').strip()
        
        # 字符长度检查
        if len(description) > 155:
            self.add_issue(
                category="Meta Description",
                issue="Over 155 Characters",
                description=f"元描述长度为{len(description)}个字符，超过了155个字符的建议长度。",
                priority="low",
                issue_type="opportunities"
            )
        elif len(description) < 70 and len(description) > 0:
            self.add_issue(
                category="Meta Description",
                issue="Below 70 Characters",
                description=f"元描述长度为{len(description)}个字符，低于70个字符的建议最小长度。",
                priority="low",
                issue_type="opportunities"
            )
        
        # 估算像素宽度
        estimated_pixel_width = self.estimate_pixel_width(description)
        
        # 像素宽度检查
        if estimated_pixel_width > 985:
            self.add_issue(
                category="Meta Description",
                issue="Over 985 Pixels",
                description=f"元描述估计宽度约为{estimated_pixel_width}像素，超过985像素可能在搜索结果中被截断。",
                priority="low",
                issue_type="opportunities"
            )
        elif estimated_pixel_width < 400 and len(description) > 0:
            self.add_issue(
                category="Meta Description",
                issue="Below 400 Pixels",
                description=f"元描述估计宽度约为{estimated_pixel_width}像素，短于400像素可能未充分利用搜索结果展示空间。",
                priority="low",
                issue_type="opportunities"
            )

    def check_h1(self):
        """检查H1标题相关问题"""
        h1_tags = self.soup.find_all('h1')
        
        # 检查是否存在H1标签
        if not h1_tags:
            self.add_issue(
                category="H1",
                issue="Missing",
                description="页面缺少H1标题标签，这是SEO的重要因素。",
                priority="medium",
                issue_type="issues"
            )
            return
        
        # 检查多个H1标签
        if len(h1_tags) > 1:
            self.add_issue(
                category="H1",
                issue="Multiple",
                description=f"页面包含{len(h1_tags)}个H1标签，建议只使用一个主要H1标签。",
                priority="medium",
                issue_type="warnings"
            )
        
        # 检查H1中是否包含图片或其他非文本元素
        for h1 in h1_tags:
            if h1.find('img') or len(h1.find_all()) > 0:
                self.add_issue(
                    category="H1",
                    issue="Alt Text in h1",
                    description="H1标签中包含图片或其他HTML元素，这不是SEO的最佳实践。H1应该是纯文本。",
                    priority="medium",
                    affected_element=str(h1)[:100] + ('...' if len(str(h1)) > 100 else ''),
                    issue_type="warnings"
                )
                break  # 只报告一次
        
        # 检查H1长度
        h1_text = h1_tags[0].text.strip()
        if len(h1_text) > 70:
            self.add_issue(
                category="H1",
                issue="Over 70 Characters",
                description=f"H1标题长度为{len(h1_text)}个字符，超过了70个字符的建议长度。",
                priority="low",
                issue_type="opportunities"
            )
        
        # 检查重复的H1内容
        if len(h1_tags) > 1:
            h1_texts = [tag.text.strip() for tag in h1_tags]
            if len(set(h1_texts)) < len(h1_texts):
                self.add_issue(
                    category="H1",
                    issue="Duplicate",
                    description="页面包含内容重复的H1标签。",
                    priority="low",
                    issue_type="opportunities"
                )

    def check_heading_hierarchy(self):
        """检查标题层级结构是否顺序合理"""
        # 获取所有标题标签
        all_headings = self.soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        
        # 如果少于2个标题，则不需要检查顺序
        if len(all_headings) < 2:
            return
        
        # 记录标题顺序
        heading_sequence = []
        for heading in all_headings:
            heading_level = int(heading.name[1])  # 提取h1, h2, h3等中的数字
            heading_sequence.append(heading_level)
        
        # 检查顺序问题
        has_sequence_issue = False
        
        # 检查第一个标题是否为h1
        if heading_sequence[0] != 1:
            has_sequence_issue = True
        
        # 检查是否有跳跃超过一级的情况
        for i in range(1, len(heading_sequence)):
            curr_level = heading_sequence[i]
            prev_level = heading_sequence[i-1]
            
            # 不允许的跳级: h1->h3, h1->h4等跳过中间级别
            # 不允许的逆序: h1->h3->h2等不符合层级的顺序
            if curr_level > prev_level + 1 or (prev_level > 1 and curr_level < prev_level - 1):
                has_sequence_issue = True
                break
        
        if has_sequence_issue:
            self.add_issue(
                category="H1",
                issue="Non-sequential",
                description="页面的标题层级结构不合理。标题应按h1->h2->h3的顺序出现，不应跳跃级别(如h1->h3)或出现不符合层级的顺序(如h2->h1->h3)。",
                priority="medium",
                issue_type="warnings"
            )

    def check_h2(self):
        """检查H2标题相关问题"""
        h2_tags = self.soup.find_all('h2')
        
        # 检查是否存在H2标签
        if not h2_tags:
            self.add_issue(
                category="H2",
                issue="Missing",
                description="页面缺少H2标题标签，这可能影响内容结构化。",
                priority="low",
                issue_type="warnings"
            )
            return
        
        # 检查H2长度
        for h2 in h2_tags:
            h2_text = h2.text.strip()
            if len(h2_text) > 70:
                self.add_issue(
                    category="H2",
                    issue="Over 70 Characters",
                    description=f"H2标题长度为{len(h2_text)}个字符，超过了70个字符的建议长度。",
                    priority="low",
                    issue_type="opportunities"
                )
                break  # 只报告一次
        
        # 检查重复的H2内容
        h2_texts = [tag.text.strip() for tag in h2_tags]
        if len(set(h2_texts)) < len(h2_texts):
            self.add_issue(
                category="H2",
                issue="Duplicate",
                description="页面包含内容重复的H2标签。",
                priority="low",
                issue_type="opportunities"
            )

    def check_robots_directives(self):
        """检查robots指令相关问题"""
        import re
        
        # 查找所有robots meta标签
        all_robots_meta = self.soup.find_all('meta', attrs={'name': re.compile('^robots$|^googlebot$', re.I)})
        
        if not all_robots_meta:
            return  # 没有robots标签，不需要进一步检查
        
        # 检查robots meta标签是否在head标签内
        head_tag = self.soup.find('head')
        if head_tag:
            head_robots_meta = head_tag.find_all('meta', attrs={'name': re.compile('^robots$|^googlebot$', re.I)})
            outside_head_tags = [tag for tag in all_robots_meta if tag not in head_robots_meta]
            
            if outside_head_tags:
                self.add_issue(
                    category="Robots Directives",
                    issue="Outside <head>",
                    description="有robots meta标签位于<head>标签外，这不符合HTML规范且可能不被搜索引擎识别。",
                    priority="high",
                    affected_element=str(outside_head_tags[0])[:100] + ('...' if len(str(outside_head_tags[0])) > 100 else ''),
                    issue_type="issues"
                )
        
        # 分析所有robots meta标签的内容
        for meta in all_robots_meta:
            content = meta.get('content', '').lower()
            directives = [directive.strip() for directive in content.split(',')]
            
            # 检查NoImageIndex指令
            if 'noimageindex' in directives:
                self.add_issue(
                    category="Robots Directives",
                    issue="NoImageIndex",
                    description="页面使用了noimageindex指令，这将阻止搜索引擎索引页面上的图片。",
                    priority="high",
                    affected_element=str(meta)[:100] + ('...' if len(str(meta)) > 100 else ''),
                    issue_type="issues"
                )
            
            # 检查Noindex指令
            if 'noindex' in directives:
                self.add_issue(
                    category="Robots Directives",
                    issue="Noindex",
                    description="页面使用了noindex指令，这将阻止搜索引擎索引此页面。确保这是有意的设置。",
                    priority="high",
                    affected_element=str(meta)[:100] + ('...' if len(str(meta)) > 100 else ''),
                    issue_type="warnings"
                )
            
            # 检查Nofollow指令
            if 'nofollow' in directives:
                self.add_issue(
                    category="Robots Directives",
                    issue="Nofollow",
                    description="页面使用了nofollow指令，这将阻止搜索引擎跟踪此页面上的链接。确保这是有意的设置。",
                    priority="medium",
                    affected_element=str(meta)[:100] + ('...' if len(str(meta)) > 100 else ''),
                    issue_type="warnings"
                )
            
            # 检查None指令
            if 'none' in directives:
                self.add_issue(
                    category="Robots Directives",
                    issue="None",
                    description="页面使用了none指令，这等同于同时使用noindex和nofollow，将阻止页面被索引和链接被跟踪。",
                    priority="high",
                    affected_element=str(meta)[:100] + ('...' if len(str(meta)) > 100 else ''),
                    issue_type="warnings"
                )
            
            # 检查Unavailable_After指令
            unavailable_match = re.search(r'unavailable_after:\s*(.*)', content)
            if unavailable_match:
                date_str = unavailable_match.group(1)
                self.add_issue(
                    category="Robots Directives",
                    issue="Unavailable_After",
                    description=f"页面设置了在{date_str}后不可用。到该日期后，搜索引擎将不再索引此页面。",
                    priority="medium",
                    affected_element=str(meta)[:100] + ('...' if len(str(meta)) > 100 else ''),
                    issue_type="warnings"
                )
            
            # 检查NoSnippet指令
            if 'nosnippet' in directives:
                self.add_issue(
                    category="Robots Directives",
                    issue="NoSnippet",
                    description="页面使用了nosnippet指令，这将阻止搜索引擎在搜索结果中显示页面摘要。",
                    priority="low",
                    affected_element=str(meta)[:100] + ('...' if len(str(meta)) > 100 else ''),
                    issue_type="warnings"
                )
            
            # 检查NoODP指令
            if 'noodp' in directives:
                self.add_issue(
                    category="Robots Directives",
                    issue="NoODP",
                    description="页面使用了noodp指令，这将阻止搜索引擎使用开放目录项目(ODP)的描述。",
                    priority="low",
                    affected_element=str(meta)[:100] + ('...' if len(str(meta)) > 100 else ''),
                    issue_type="warnings"
                )
            
            # 检查NoYDIR指令
            if 'noydir' in directives:
                self.add_issue(
                    category="Robots Directives",
                    issue="NoYDIR",
                    description="页面使用了noydir指令，这将阻止搜索引擎使用Yahoo目录的描述。注意，此指令已过时。",
                    priority="low",
                    affected_element=str(meta)[:100] + ('...' if len(str(meta)) > 100 else ''),
                    issue_type="warnings"
                )
            
            # 检查NoTranslate指令
            if 'notranslate' in directives:
                self.add_issue(
                    category="Robots Directives",
                    issue="NoTranslate",
                    description="页面使用了notranslate指令，这将阻止搜索引擎在搜索结果中提供此页面的翻译。",
                    priority="low",
                    affected_element=str(meta)[:100] + ('...' if len(str(meta)) > 100 else ''),
                    issue_type="warnings"
                )