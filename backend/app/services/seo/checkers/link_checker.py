from .base_checker import BaseChecker
from typing import Dict, Any, List
import re

class LinkChecker(BaseChecker):
    """检查页面链接相关的SEO问题"""
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """执行所有链接相关检查"""
        self.check_links()
        self.check_canonicals()
        self.check_pagination()
        self.check_hreflang()
        
        return self.get_issues()
    
    def is_nofollow_link(self, link):
        """检查链接是否带有nofollow属性"""
        if 'rel' not in link.attrs:
            return False
        
        rel_attr = link['rel']
        # rel属性可能是列表或字符串
        if isinstance(rel_attr, list):
            return 'nofollow' in rel_attr
        elif isinstance(rel_attr, str):
            return 'nofollow' in rel_attr.split()
        
        return False
        
    def check_links(self):
        """检查链接相关问题"""
        links = self.soup.find_all('a', href=True)
        
        # 分类链接
        internal_links = []
        external_links = []
        localhost_links = []
        nofollow_internal_links = []
        non_descriptive_links = []
        empty_anchor_links = []
        
        # 用于检查非描述性锚文本的关键词
        non_descriptive_terms = [
            '点击这里', '查看更多', '了解详情', '详情', '点击', '这里', '更多', 
            'click here', 'read more', 'learn more', 'more', 'click', 'here', 
            'details', 'view more', 'see more'
        ]
        
        base_url = self.page_url.split('://')[1].split('/')[0] if self.page_url else None
        
        for link in links:
            href = link['href'].strip()
            
            # 检查是否指向localhost
            if 'localhost' in href or '127.0.0.1' in href:
                localhost_links.append(link)
                continue
            
            # 判断是否为内部链接
            is_internal = (
                not href.startswith(('http://', 'https://', 'mailto:', 'tel:', '#')) or 
                (self.page_url and href.startswith(self.page_url)) or
                (base_url and href.startswith('/'))
            )
            
            if is_internal:
                internal_links.append(link)
                
                # 检查是否有nofollow属性
                if self.is_nofollow_link(link):
                    nofollow_internal_links.append(link)
                
                # 检查锚文本
                link_text = link.text.strip()
                if not link_text and not link.find('img'):
                    empty_anchor_links.append(link)
                elif any(term in link_text.lower() for term in non_descriptive_terms):
                    non_descriptive_links.append(link)
            else:
                # 外部链接
                external_links.append(link)
        
        # 检查是否有内部链接
        if not internal_links:
            self.add_issue(
                "Links",
                "Pages Without Internal Outlinks",
                "页面没有内部链接，这可能不利于搜索引擎爬行和用户导航。",
                "high",
                issue_type="warnings"
            )
        
        # 检查指向localhost的链接
        if localhost_links:
            self.add_issue(
                "Links",
                "Outlinks To Localhost",
                f"页面包含{len(localhost_links)}个指向localhost的链接，这在生产环境中是不适当的。",
                "high",
                affected_element=str(localhost_links[0])[:100] + ('...' if len(str(localhost_links[0])) > 100 else ''),
                issue_type="issues"
            )
        
        # 检查内部nofollow链接
        if nofollow_internal_links:
            self.add_issue(
                "Links",
                "Internal Nofollow Outlinks",
                f"页面包含{len(nofollow_internal_links)}个带nofollow属性的内部链接，这可能阻止权重传递。",
                "medium",
                affected_element=str(nofollow_internal_links[0])[:100] + ('...' if len(str(nofollow_internal_links[0])) > 100 else ''),
                issue_type="warnings"
            )
        
        # 检查外部链接数量
        if len(external_links) > 100:  # 设定阈值为100
            self.add_issue(
                "Links",
                "Pages With High External Outlinks",
                f"页面包含{len(external_links)}个外部链接，过多的外部链接可能分散页面权重。",
                "medium",
                issue_type="warnings"
            )
        
        # 检查内部链接数量
        if len(internal_links) > 150:  # 设定阈值为150
            self.add_issue(
                "Links",
                "Pages With High Internal Outlinks",
                f"页面包含{len(internal_links)}个内部链接，过多的内部链接可能稀释页面权重。",
                "low",
                issue_type="warnings"
            )
        
        # 检查空锚文本
        if empty_anchor_links:
            self.add_issue(
                "Links",
                "Internal Outlinks With No Anchor Text",
                f"页面包含{len(empty_anchor_links)}个缺少锚文本的内部链接，这对SEO不利。",
                "low",
                affected_element=str(empty_anchor_links[0])[:100] + ('...' if len(str(empty_anchor_links[0])) > 100 else ''),
                issue_type="opportunities"
            )
        
        # 检查非描述性锚文本
        if non_descriptive_links:
            self.add_issue(
                "Links",
                "Non-Descriptive Anchor Text In Internal Outlinks",
                f"页面包含{len(non_descriptive_links)}个使用非描述性锚文本的内部链接，应使用更有意义的文本。",
                "low",
                affected_element=str(non_descriptive_links[0])[:100] + ('...' if len(str(non_descriptive_links[0])) > 100 else ''),
                issue_type="opportunities"
            )
        
        # 添加解释性信息
        if len(links) > 0:
            self.add_issue(
                "Links",
                "Learn More About Links Warnings",
                f"页面共有{len(links)}个链接，其中{len(internal_links)}个内部链接和{len(external_links)}个外部链接。" + 
                            "链接结构对SEO至关重要，内部链接帮助搜索引擎理解网站架构并传递页面权重。",
                "low",
                issue_type="opportunities"
            )
    
    def check_canonicals(self):
        """检查规范链接相关问题"""
        # 查找所有规范链接标签，无论其位置
        all_canonical_tags = self.soup.find_all('link', rel='canonical')
        
        # 检查是否存在规范链接
        if not all_canonical_tags:
            self.add_issue(
                "Canonicals",
                "Missing",
                "页面缺少规范链接标签，这可能导致重复内容问题。",
                "medium",
                issue_type="warnings"
            )
            return
        
        # 检查规范链接标签是否位于head标签内
        head_tag = self.soup.find('head')
        if head_tag:
            head_canonical_tags = head_tag.find_all('link', rel='canonical')
            outside_head_tags = [tag for tag in all_canonical_tags if tag not in head_canonical_tags]
            
            if outside_head_tags:
                self.add_issue(
                    "Canonicals",
                    "Outside <head>",
                    "有规范链接标签位于<head>标签外，这不符合HTML规范且可能不被搜索引擎识别。",
                    "high",
                    affected_element=str(outside_head_tags[0])[:100] + ('...' if len(str(outside_head_tags[0])) > 100 else ''),
                    issue_type="issues"
                )
        
        # 检查多个规范链接
        if len(all_canonical_tags) > 1:
            self.add_issue(
                "Canonicals",
                "Multiple",
                f"页面包含{len(all_canonical_tags)}个规范链接标签，应该只有一个。",
                "medium",
                issue_type="warnings"
            )
            
            # 检查多个规范链接是否存在冲突（指向不同的URL）
            canonical_hrefs = [tag.get('href', '').strip() for tag in all_canonical_tags]
            if len(set(canonical_hrefs)) > 1:
                self.add_issue(
                    "Canonicals",
                    "Multiple Conflicting",
                    "页面包含指向不同URL的多个规范链接标签，这会使搜索引擎混淆。",
                    "high",
                    affected_resources=canonical_hrefs[:5],  # 只显示前5个
                    issue_type="issues"
                )
        
        # 获取第一个规范链接进行详细分析
        canonical_tag = all_canonical_tags[0]
        canonical_href = canonical_tag.get('href', '').strip()
        
        # 检查规范链接是否为相对URL
        if canonical_href and not canonical_href.startswith(('http://', 'https://')):
            self.add_issue(
                "Canonicals",
                "Canonical Is Relative",
                "规范链接使用相对URL，最佳做法是使用绝对URL。",
                "low",
                issue_type="warnings"
            )
        
        # 检查规范链接是否包含片段标识符（#）
        if '#' in canonical_href:
            self.add_issue(
                "Canonicals",
                "Contains Fragment URL",
                "规范链接包含片段标识符(#)，这可能导致规范化问题。搜索引擎通常会忽略URL中的片段部分。",
                "medium",
                affected_element=canonical_href,
                issue_type="issues"
            )
        
        # 检查规范链接标签中的无效属性
        valid_attributes = {'href', 'rel', 'type', 'title', 'hreflang', 'media'}
        invalid_attrs = [attr for attr in canonical_tag.attrs if attr.lower() not in valid_attributes]
        
        if invalid_attrs:
            self.add_issue(
                "Canonicals",
                "Invalid Attribute In Annotation",
                f"规范链接标签包含无效属性: {', '.join(invalid_attrs)}。这可能会影响规范链接的正确解析。",
                "low",
                affected_element=str(canonical_tag)[:100] + ('...' if len(str(canonical_tag)) > 100 else ''),
                issue_type="issues"
            )
    
    def check_pagination(self):
        """检查分页相关问题"""
        # 检查头部中的rel="next"和rel="prev"链接
        head_next_links = self.soup.find_all('link', rel='next')
        head_prev_links = self.soup.find_all('link', rel='prev')
        
        # 检查常见的分页链接模式，包括a标签中的分页链接
        # 使用常见的分页URL模式和类名进行检测
        pagination_anchors = self.soup.find_all('a', href=re.compile(r'[?&](page|p)=\d+|/page/\d+|_page=\d+'))
        pagination_anchors.extend(self.soup.find_all('a', class_=re.compile(r'pag|page')))
        
        # 使用常见的分页导航容器查找
        pagination_navs = self.soup.find_all(['nav', 'div'], class_=re.compile(r'pag|pagination'))
        pagination_uls = self.soup.find_all('ul', class_=re.compile(r'pag|pagination'))
        
        # 1. 检查是否缺少规范链接标签
        if (head_next_links or head_prev_links) and not self.soup.find('link', rel='canonical'):
            self.add_issue(
                "Pagination",
                "Missing Canonical",
                "分页页面应该有规范链接标签，以避免重复内容问题。",
                "medium",
                issue_type="warnings"
            )
        
        # 2. 检查Non-Indexable - 分页页面是否被设置为不可索引
        meta_robots = self.soup.find('meta', attrs={'name': 'robots'})
        if meta_robots and ('noindex' in meta_robots.get('content', '').lower()) and (head_next_links or head_prev_links or pagination_anchors):
            self.add_issue(
                "Pagination",
                "Non-Indexable",
                "分页页面被设置为noindex，这可能导致相关内容无法被索引。除非有明确的SEO策略，否则分页通常应保持可索引。",
                "medium",
                issue_type="warnings"
            )
        
        # 提取当前页面和所有分页链接
        all_pagination_urls = set()
        current_page_num = None
        
        # 从URL中提取当前页码
        if self.page_url:
            current_page_match = re.search(r'[?&](page|p)=(\d+)|/page/(\d+)|_page=(\d+)', self.page_url)
            if current_page_match:
                # 提取匹配组中的数字
                for group in current_page_match.groups():
                    if group and group.isdigit():
                        current_page_num = int(group)
                        break
        
        # 从分页锚点收集所有分页URL和页码
        page_numbers = {}
        for anchor in pagination_anchors:
            href = anchor.get('href', '')
            if not href or href.startswith('#'):
                continue
                
            all_pagination_urls.add(href)
            
            # 提取页码
            page_match = re.search(r'[?&](page|p)=(\d+)|/page/(\d+)|_page=(\d+)', href)
            if page_match:
                # 提取匹配组中的数字
                for group in page_match.groups():
                    if group and group.isdigit():
                        page_num = int(group)
                        page_numbers[href] = page_num
                        break
        
        # 3. Pagination URL Not In Anchor Tag - 如果头部有分页链接但页面中没有对应的a标签
        if (head_next_links or head_prev_links) and not pagination_anchors:
            self.add_issue(
                "Pagination",
                "Pagination URL Not In Anchor Tag",
                "页面头部有分页链接标记(rel=next/prev)，但在页面内容中没有找到对应的分页链接。用户无法通过可见导航浏览分页内容。",
                "medium",
                issue_type="issues"
            )
        
        # 4. Multiple Pagination URLs - 检查是否有重复指向同一页面的分页链接
        page_counts = {}
        for page_num in page_numbers.values():
            page_counts[page_num] = page_counts.get(page_num, 0) + 1
        
        duplicate_pages = {page: count for page, count in page_counts.items() if count > 1}
        if duplicate_pages:
            duplicates = ", ".join([f"页码{page}出现{count}次" for page, count in duplicate_pages.items()])
            self.add_issue(
                "Pagination",
                "Multiple Pagination URLs",
                f"检测到重复的分页链接: {duplicates}。这可能导致搜索引擎爬行预算浪费和用户体验问题。",
                "medium",
                issue_type="issues"
            )
        
        # 5. 检查Sequence Error - 分页序列中的错误
        if page_numbers and len(page_numbers) >= 2:
            # 获取所有页码并排序
            page_nums = sorted(page_numbers.values())
            
            # 检查序列是否连续
            expected_sequence = list(range(min(page_nums), max(page_nums) + 1))
            missing_pages = set(expected_sequence) - set(page_nums)
            
            if missing_pages:
                missing_str = ", ".join(map(str, sorted(missing_pages)))
                self.add_issue(
                    "Pagination",
                    "Sequence Error",
                    f"分页序列不完整，缺少页码: {missing_str}。这会使用户和搜索引擎无法访问所有内容。",
                    "high",
                    issue_type="issues"
                )
        
        # 6. 检查Pagination Loop - 分页链接是否形成循环
        if current_page_num is not None and page_numbers:
            next_page_expected = current_page_num + 1
            prev_page_expected = current_page_num - 1 if current_page_num > 1 else None
            
            # 检查头部的next/prev链接是否指向正确的页面
            if head_next_links:
                next_href = head_next_links[0].get('href', '')
                next_match = re.search(r'[?&](page|p)=(\d+)|/page/(\d+)|_page=(\d+)', next_href)
                if next_match:
                    next_actual = None
                    for group in next_match.groups():
                        if group and group.isdigit():
                            next_actual = int(group)
                            break
                    
                    if next_actual is not None and next_actual != next_page_expected:
                        self.add_issue(
                            "Pagination",
                            "Pagination Loop",
                            f"当前页面为{current_page_num}，但next链接指向页面{next_actual}，而非预期的{next_page_expected}。这可能创建分页循环或跳跃，影响爬虫和用户。",
                            "high",
                            issue_type="issues"
                        )
            
            if head_prev_links and prev_page_expected:
                prev_href = head_prev_links[0].get('href', '')
                prev_match = re.search(r'[?&](page|p)=(\d+)|/page/(\d+)|_page=(\d+)', prev_href)
                if prev_match:
                    prev_actual = None
                    for group in prev_match.groups():
                        if group and group.isdigit():
                            prev_actual = int(group)
                            break
                    
                    if prev_actual is not None and prev_actual != prev_page_expected:
                        self.add_issue(
                            "Pagination",
                            "Pagination Loop",
                            f"当前页面为{current_page_num}，但prev链接指向页面{prev_actual}，而非预期的{prev_page_expected}。这可能创建分页循环，影响爬虫和用户。",
                            "high",
                            issue_type="issues"
                        )
        
        # 7. 检查Unlinked Pagination URLs - 分页序列是否完整链接
        # 检查是否有分页导航但缺少"下一页"按钮
        has_pagination_nav = bool(pagination_navs) or bool(pagination_uls)
        has_next_button = False
        
        next_texts = ['下一页', '下页', 'next', 'Next', '>', '›', '»', 'Next Page']
        for anchor in pagination_anchors:
            anchor_text = anchor.text.strip()
            if anchor_text in next_texts or any(icon in str(anchor) for icon in ['fa-chevron-right', 'next-icon']):
                has_next_button = True
                break
        
        if has_pagination_nav and not has_next_button and not head_next_links:
            # 检查当前页是否最后一页
            if page_numbers and current_page_num is not None:
                max_page = max(page_numbers.values())
                if current_page_num < max_page:
                    self.add_issue(
                        "Pagination",
                        "Unlinked Pagination URLs",
                        "发现分页导航，但缺少\"下一页\"按钮或链接，这会使用户难以浏览所有内容页面。",
                        "medium",
                        issue_type="issues"
                    )
        
        # 8. 检查明显的Non-200 Pagination URLs (静态分析无法检查HTTP状态码，但可以检查明显无效的URL)
        for url in all_pagination_urls:
            if url.startswith(('javascript:', 'void(', '#')) or url.endswith(('.jpg', '.png', '.gif', '.pdf')):
                self.add_issue(
                    "Pagination",
                    "Non-200 Pagination URLs",
                    f"发现可能无效的分页URL: {url}。分页链接应指向有效的HTML页面。",
                    "high",
                    affected_resources=[url],
                    issue_type="issues"
                )
    
    def check_hreflang(self):
        """检查hreflang相关问题"""
        # 查找所有hreflang标签
        all_hreflang_tags = self.soup.find_all('link', attrs={'rel': 'alternate', 'hreflang': True})
        
        if not all_hreflang_tags:
            return  # 没有hreflang标签，不需要检查
        
        # 检查hreflang标签是否在<head>内
        head_tag = self.soup.find('head')
        if head_tag:
            head_hreflang_tags = head_tag.find_all('link', attrs={'rel': 'alternate', 'hreflang': True})
            outside_head_tags = [tag for tag in all_hreflang_tags if tag not in head_hreflang_tags]
            
            if outside_head_tags:
                self.add_issue(
                    "Hreflang",
                    "Outside <head>",
                    f"有{len(outside_head_tags)}个hreflang标签位于<head>标签外，这些标签可能不会被搜索引擎正确识别。",
                    "high",
                    affected_element=str(outside_head_tags[0])[:100] + ('...' if len(str(outside_head_tags[0])) > 100 else ''),
                    issue_type="issues"
                )
        
        # 检查是否使用了规范链接
        canonical_tag = self.soup.find('link', rel='canonical')
        if not canonical_tag:
            self.add_issue(
                "Hreflang",
                "Not Using Canonical",
                "使用hreflang的页面应该也使用canonical标签，以避免重复内容问题。",
                "medium",
                issue_type="issues"
            )
        
        # 检查是否有x-default
        if not any(tag.get('hreflang') == 'x-default' for tag in all_hreflang_tags):
            self.add_issue(
                "Hreflang",
                "Missing X-Default",
                "使用hreflang时建议包含x-default标签，用于不匹配任何语言的用户。",
                "low",
                issue_type="warnings"
            )
        
        # 检查hreflang值的正确性
        valid_language_pattern = re.compile(r'^([a-z]{2,3})(-[A-Z]{2})?$')
        for tag in all_hreflang_tags:
            hreflang_value = tag.get('hreflang')
            if hreflang_value != 'x-default' and not valid_language_pattern.match(hreflang_value):
                self.add_issue(
                    "Hreflang",
                    "Incorrect Language & Region Codes",
                    f"hreflang值 '{hreflang_value}' 不符合ISO语言和区域代码标准(例如'en'、'en-US'或'x-default')。",
                    "high",
                    affected_element=str(tag)[:100] + ('...' if len(str(tag)) > 100 else ''),
                    issue_type="issues"
                )
        
        # 检查重复的hreflang条目
        hreflang_values = [tag.get('hreflang') for tag in all_hreflang_tags]
        duplicates = set()
        for value in hreflang_values:
            if hreflang_values.count(value) > 1 and value not in duplicates:
                duplicates.add(value)
        
        if duplicates:
            duplicate_list = [f"'{code}'({hreflang_values.count(code)}次)" for code in duplicates]
            self.add_issue(
                "Hreflang",
                "Multiple Entries",
                f"存在重复的hreflang条目: {', '.join(duplicate_list)}。每种语言和区域组合应该只有一个hreflang条目。",
                "medium",
                issue_type="issues"
            )
        
        # 检查是否有自引用
        if self.page_url:
            # 尝试找到当前页面对应的hreflang值
            current_page_lang = None
            for tag in all_hreflang_tags:
                href = tag.get('href', '')
                if href == self.page_url or (href and self.page_url and href.rstrip('/') == self.page_url.rstrip('/')):
                    current_page_lang = tag.get('hreflang')
                    break
            
            # 如果找到了当前页面的语言但没有相应的自引用
            if current_page_lang:
                has_self_reference = False
                for tag in all_hreflang_tags:
                    if tag.get('hreflang') == current_page_lang and (
                        tag.get('href') == self.page_url or 
                        (tag.get('href') and self.page_url and tag.get('href').rstrip('/') == self.page_url.rstrip('/'))
                    ):
                        has_self_reference = True
                        break
                
                if not has_self_reference:
                    self.add_issue(
                        "Hreflang",
                        "Missing Self Reference",
                        f"当前页面的语言代码 '{current_page_lang}' 没有在hreflang标签中自我引用。",
                        "medium",
                        issue_type="warnings"
                    )
        
        # 尝试检测未链接的hreflang URLs (简单版本，仅检查href是否为空)
        for tag in all_hreflang_tags:
            href = tag.get('href', '')
            if not href or href.strip() == '':
                self.add_issue(
                    "Hreflang",
                    "Unlinked Hreflang URLs",
                    "存在href属性为空的hreflang标签，这些标签不会被搜索引擎识别。",
                    "high",
                    affected_element=str(tag)[:100] + ('...' if len(str(tag)) > 100 else ''),
                    issue_type="issues"
                )
                break  # 只报告一次