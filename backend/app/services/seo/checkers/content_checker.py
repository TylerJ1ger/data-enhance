from .base_checker import BaseChecker
from typing import Dict, Any, List, Optional
import re
from bs4 import Tag, BeautifulSoup
import importlib.util
import logging
import traceback


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
            "grammar_errors": [],
            "title": "",             # 新增：页面标题
            "description": "",       # 新增：页面描述
            "structure": []          # 新增：结构化内容
        }
        
        # 初始化日志
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger('ContentChecker')
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """执行所有内容相关检查"""
        # 修改为使用新的提取方法
        self.extract_content_with_structure()
        self.check_content()
        self.check_images()
        self.check_mobile()
        
        return self.get_issues()
    
    def extract_structure_info(self):
        """
        提取页面的结构化信息，包括标题、描述和HTML结构标签
        """
        self.logger.info("开始提取页面结构化信息...")
        
        # 1. 提取页面标题
        title_tag = self.soup.find('title')
        if title_tag and title_tag.string:
            self.extracted_content["title"] = title_tag.string.strip()
            self.logger.info(f"提取到页面标题: {self.extracted_content['title']}")
    
        # 2. 提取页面描述
        meta_desc = self.soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            self.extracted_content["description"] = meta_desc.get('content').strip()
            self.logger.info(f"提取到页面描述: {self.extracted_content['description'][:50]}...")
        
        # 3. 提取OG标题和描述作为备选
        og_title = self.soup.find('meta', attrs={'property': 'og:title'})
        if og_title and og_title.get('content') and not self.extracted_content["title"]:
            self.extracted_content["title"] = og_title.get('content').strip()
            self.logger.info(f"提取到OG标题: {self.extracted_content['title']}")
            
        og_desc = self.soup.find('meta', attrs={'property': 'og:description'})
        if og_desc and og_desc.get('content') and not self.extracted_content["description"]:
            self.extracted_content["description"] = og_desc.get('content').strip()
            self.logger.info(f"提取到OG描述: {self.extracted_content['description'][:50]}...")
        
        # 4. 提取Twitter卡片标题和描述作为备选
        twitter_title = self.soup.find('meta', attrs={'name': 'twitter:title'})
        if twitter_title and twitter_title.get('content') and not self.extracted_content["title"]:
            self.extracted_content["title"] = twitter_title.get('content').strip()
            self.logger.info(f"提取到Twitter标题: {self.extracted_content['title']}")
            
        twitter_desc = self.soup.find('meta', attrs={'name': 'twitter:description'})
        if twitter_desc and twitter_desc.get('content') and not self.extracted_content["description"]:
            self.extracted_content["description"] = twitter_desc.get('content').strip()
            self.logger.info(f"提取到Twitter描述: {self.extracted_content['description'][:50]}...")
        
        # 5. 如果仍未找到title，尝试找h1
        if not self.extracted_content["title"]:
            h1_tag = self.soup.find('h1')
            if h1_tag:
                self.extracted_content["title"] = h1_tag.get_text(strip=True)
                self.logger.info(f"使用H1作为标题: {self.extracted_content['title']}")

    def extract_content_with_structure(self):
        """
        提取内容并保留结构信息
        """
        # 先提取标题和描述等元数据
        self.extract_structure_info()
        
        # 提取主要内容文本
        main_text = self.extract_main_content()
        self.extracted_content["text"] = main_text
        
        # 现在提取HTML结构标签
        self.extract_html_structure()
        
        return main_text

    def extract_html_structure(self):
        """
        从页面中提取HTML结构标签（如h1-h6）及其在纯文本中的位置
        """
        self.logger.info("提取HTML结构标签...")
        
        # 检测当前纯文本内容
        text_content = self.extracted_content["text"]
        if not text_content:
            self.logger.warning("没有提取到文本内容，无法标记结构")
            return
        
        # 结构标签列表
        structure = []
        
        # 使用更智能的方法提取标题标签
        # 1. 查找可能的主内容区域
        main_content = None
        for selector in ['article', 'main', '[role="main"]', '.content', '#content', '.post', '.entry', '.body']:
            elements = self.soup.select(selector)
            if elements:
                main_content = elements[0]
                self.logger.info(f"找到可能的主内容区域: {selector}")
                break
        
        # 如果没找到主内容区域，使用整个body
        if not main_content:
            main_content = self.soup.body
        
        if not main_content:
            self.logger.warning("无法找到主内容区域")
            return
        
        # 2. 从主内容区域中提取标题标签
        heading_tags = main_content.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        self.logger.info(f"找到 {len(heading_tags)} 个标题标签")
        
        # 3. 将标题标签文本与纯文本内容对应
        for htag in heading_tags:
            heading_text = htag.get_text(strip=True)
            if not heading_text:
                continue
                
            tag_type = htag.name  # h1, h2, etc.
            
            # 检查这个标题文本是否出现在提取的纯文本中
            if heading_text in text_content:
                # 找到标题在纯文本中的位置
                start_pos = text_content.find(heading_text)
                end_pos = start_pos + len(heading_text)
                
                # 添加到结构信息中
                structure.append({
                    "type": tag_type,
                    "text": heading_text,
                    "start": start_pos,
                    "end": end_pos
                })
                self.logger.info(f"找到{tag_type}标签: {heading_text[:30]}...")
        
        # 4. 添加其他需要突出显示的元素（如强调文本）
        for tag_name, type_name in [('strong', 'strong'), ('em', 'emphasis'), ('b', 'bold'), ('i', 'italic')]:
            emphasis_tags = main_content.find_all(tag_name)
            for tag in emphasis_tags:
                tag_text = tag.get_text(strip=True)
                if not tag_text or len(tag_text) < 5:  # 忽略过短的强调文本
                    continue
                    
                if tag_text in text_content:
                    start_pos = text_content.find(tag_text)
                    end_pos = start_pos + len(tag_text)
                    
                    structure.append({
                        "type": type_name,
                        "text": tag_text,
                        "start": start_pos,
                        "end": end_pos
                    })
        
        # 保存结构信息
        self.extracted_content["structure"] = structure
        self.logger.info(f"总共提取了 {len(structure)} 个结构元素")
    
    def extract_json_content_from_scripts(self, soup):
        """
        从页面中的脚本标签中提取JSON内容
        特别针对现代前端框架（如Next.js、React等）将内容存储在脚本标签中的情况
        """
        self.logger.info("尝试从脚本标签中提取JSON内容...")
        extracted_text = ""
        
        # 查找可能包含内容的脚本标签
        script_tags = soup.find_all('script', {'type': 'application/json'})
        if not script_tags:
            # 也查找可能没有指定type的__NEXT_DATA__标签
            script_tags = soup.find_all('script', {'id': '__NEXT_DATA__'})

        for script in script_tags:
            try:
                import json
                script_content = script.string
                if not script_content:
                    continue
                    
                # 解析JSON内容
                json_data = json.loads(script_content)
                
                # 递归提取所有字符串值
                def extract_strings(obj, min_length=15):
                    texts = []
                    if isinstance(obj, dict):
                        for key, value in obj.items():
                            # 排除一些常见的非内容键
                            if key.lower() in ['url', 'href', 'src', 'alt', 'id', 'class', 'style', 'type']:
                                continue
                            texts.extend(extract_strings(value, min_length))
                    elif isinstance(obj, list):
                        for item in obj:
                            texts.extend(extract_strings(item, min_length))
                    elif isinstance(obj, str) and len(obj) > min_length:
                        # 排除URL和短文本
                        if not obj.startswith(('http://', 'https://', '/', '#')):
                            texts.append(obj)
                    return texts
                
                # 提取JSON中的所有可能内容
                text_candidates = extract_strings(json_data)
                
                # 按长度排序并选择最长的几个文本
                text_candidates.sort(key=len, reverse=True)
                top_candidates = text_candidates[:10]  # 取最长的10段文本
                
                if top_candidates:
                    self.logger.info(f"从脚本标签中提取到 {len(top_candidates)} 段可能的内容")
                    extracted_text = "\n\n".join(top_candidates)
                    
            except Exception as e:
                self.logger.warning(f"从脚本中提取JSON内容失败: {str(e)}")
        
        if extracted_text:
            self.logger.info(f"从脚本中提取的JSON内容长度: {len(extracted_text)}")
        
        return extracted_text

    def extract_main_content(self) -> str:
        """
        智能提取页面主要内容区域的文本
        基于用户选择的提取引擎
        """
        html_content = str(self.soup)
        content = ""
        
        # 首先尝试从脚本标签中提取JSON内容，适用于所有引擎的前置处理
        script_content = self.extract_json_content_from_scripts(self.soup)
        if script_content and len(script_content) > 500:
            self.logger.info(f"使用脚本标签中的JSON内容作为主要内容，长度: {len(script_content)}")
            return script_content
        
        # 根据选择的提取引擎选择不同的提取方法
        if self.content_extractor == "auto" or self.content_extractor == "trafilatura":
            if self._check_library_available('trafilatura'):
                try:
                    import trafilatura
                    content = trafilatura.extract(html_content)
                    if content and len(content) > 100:
                        self.logger.info("成功使用Trafilatura提取内容，长度: %d", len(content))
                        return content
                except Exception as e:
                    self.logger.warning("Trafilatura内容提取失败: %s", str(e))
            
            # 如果是auto模式，继续尝试其他引擎
            if self.content_extractor != "auto":
                self.logger.warning("指定的Trafilatura提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
                return content
        
        if self.content_extractor == "auto" or self.content_extractor == "newspaper":
            if self._check_library_available('newspaper'):
                try:
                    import newspaper
                    from newspaper import fulltext
                    content = fulltext(html_content)
                    if content and len(content) > 100:
                        self.logger.info("成功使用Newspaper提取内容，长度: %d", len(content))
                        return content
                except Exception as e:
                    self.logger.warning("Newspaper3k内容提取失败: %s", str(e))
                    # 尝试备用方法
                    try:
                        from newspaper import Article
                        article = Article(url='')
                        article.download(input_html=html_content)
                        article.parse()
                        content = article.text
                        if content and len(content) > 100:
                            self.logger.info("成功使用Newspaper Article提取内容，长度: %d", len(content))
                            return content
                    except Exception as e2:
                        self.logger.warning("Newspaper3k备用方法提取失败: %s", str(e2))
                        self.logger.debug("详细错误: %s", traceback.format_exc())
            
            if self.content_extractor != "auto":
                self.logger.warning("指定的Newspaper提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
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
                        self.logger.info("成功使用Readability提取内容，长度: %d", len(text_content))
                        return text_content
                except Exception as e:
                    self.logger.warning("Readability-lxml内容提取失败: %s", str(e))
                    self.logger.debug("详细错误: %s", traceback.format_exc())
            
            if self.content_extractor != "auto":
                self.logger.warning("指定的Readability提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
                return content
        
        # Goose3 处理部分的增强版本
        if self.content_extractor == "auto" or self.content_extractor == "goose3":
            self.logger.info("开始尝试使用Goose3提取内容...")
            # 先检查goose3是否可用
            if not self._check_library_available('goose3'):
                self.logger.warning("Goose3库不可用")
                if self.content_extractor != "auto":
                    content = self._fallback_extract_content()
                    return content
            else:
                try:
                    # 导入必要的模块
                    import goose3
                    from goose3 import Goose
                    
                    # 尝试记录Goose3版本
                    try:
                        version = goose3.__version__
                        self.logger.info(f"Goose3版本: {version}")
                    except AttributeError:
                        self.logger.info("无法获取Goose3版本")
                    
                    # 使用默认配置
                    self.logger.info("使用默认配置创建Goose实例")
                    g = Goose()
                    
                    # 对HTML进行预处理，确保有足够的内容标记
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(html_content, 'html.parser')
                    
                    # 更强的内容区域标记 - 添加更多可能的内容区域标识
                    potential_content_areas = []
                    
                    # 1. 查找常见内容标签
                    for selector in ['article', 'main', '[role="main"]', '.content', '#content', '.post', '.entry', '.body', '.article', '.post-content']:
                        elements = soup.select(selector)
                        potential_content_areas.extend(elements)
                    
                    # 2. 根据段落密度找到可能的内容区域
                    if not potential_content_areas:
                        div_elements = soup.find_all('div')
                        for div in div_elements:
                            # 计算段落数量和文本长度
                            paragraphs = div.find_all('p')
                            if len(paragraphs) >= 3:  # 至少有3个段落
                                text_length = len(div.get_text(strip=True))
                                if text_length > 500:  # 文本长度超过500个字符
                                    div['data-goose-article'] = 'true'
                                    self.logger.info(f"根据内容密度为元素添加了标记")
                                    potential_content_areas.append(div)
                                    break
                    
                    # 3. 为找到的内容区域添加明确的文章标记
                    for area in potential_content_areas:
                        area['data-goose-article'] = 'true'
                        self.logger.info(f"为内容区域添加了标记: {area.name}")
                    
                    # 重新生成HTML
                    enhanced_html = str(soup)
                    
                    # 提取内容
                    self.logger.info("使用Goose3提取内容...")
                    article = g.extract(raw_html=enhanced_html)
                    
                    # 检查提取结果
                    self.logger.info(f"Goose3提取结果 - 标题: {article.title}")
                    self.logger.info(f"Goose3提取结果 - 元描述: {article.meta_description}")
                    self.logger.info(f"Goose3提取结果 - 内容长度: {len(article.cleaned_text) if article.cleaned_text else 0}")
                    
                    # 检查是否有top_node，这是Goose3识别的主要内容节点
                    has_top_node = hasattr(article, 'top_node') and article.top_node is not None
                    if has_top_node:
                        self.logger.info("Goose3成功识别了top_node")
                    
                    # 组合内容方式重写
                    content_parts = []
                    
                    # 1. 首先添加标题和描述
                    if article.title:
                        content_parts.append(article.title)
                    if article.meta_description:
                        content_parts.append(article.meta_description)
                    
                    # 2. 添加Goose3提取的正文内容
                    if article.cleaned_text and len(article.cleaned_text) > 100:
                        content_parts.append(article.cleaned_text)
                        self.logger.info(f"使用Goose3提取的正文，长度: {len(article.cleaned_text)}")
                    
                    # 修复后的top_node处理部分
                    elif has_top_node:
                        try:
                            # 不使用Parser模块，直接尝试从top_node获取文本
                            # 先尝试获取top_node的HTML内容
                            if hasattr(article.top_node, 'text_content'):
                                # lxml Element对象
                                node_text = article.top_node.text_content()
                                if node_text and len(node_text) > 100:
                                    content_parts.append(node_text)
                                    self.logger.info(f"从top_node直接提取的文本，长度: {len(node_text)}")
                            elif hasattr(article.top_node, 'get_text'):
                                # BeautifulSoup对象
                                node_text = article.top_node.get_text(separator='\n\n', strip=True)
                                if node_text and len(node_text) > 100:
                                    content_parts.append(node_text)
                                    self.logger.info(f"从top_node提取的BeautifulSoup文本，长度: {len(node_text)}")
                            else:
                                # 其他类型，尝试直接转换为字符串
                                try:
                                    node_str = str(article.top_node)
                                    # 使用BeautifulSoup解析这个字符串
                                    from bs4 import BeautifulSoup
                                    node_soup = BeautifulSoup(node_str, 'html.parser')
                                    node_text = node_soup.get_text(separator='\n\n', strip=True)
                                    if node_text and len(node_text) > 100:
                                        content_parts.append(node_text)
                                        self.logger.info(f"从top_node字符串转换后提取的文本，长度: {len(node_text)}")
                                except Exception as e:
                                    self.logger.warning(f"从top_node字符串转换提取文本失败: {str(e)}")
                        except Exception as e:
                            self.logger.warning(f"从top_node提取文本失败: {str(e)}")
                    
                    # 4. 如果Goose3提取的内容不足，先尝试从脚本中提取，再使用自定义提取方法
                    if not content_parts or len("\n\n".join(content_parts)) < 500:  # 如果总内容少于500个字符
                        self.logger.info("Goose3提取内容不足，尝试从脚本标签和自定义方法提取内容")
                        
                        # 首先尝试从脚本标签中提取JSON内容
                        script_content = self.extract_json_content_from_scripts(soup)
                        
                        if script_content and len(script_content) > 500:
                            self.logger.info(f"使用脚本标签中的JSON内容，长度: {len(script_content)}")
                            content = script_content
                            
                            # 清理资源
                            g.close()
                            
                            return content
                        
                        # 如果从脚本中提取内容不足，再使用自定义方法提取主要内容
                        fallback_content = self._extract_content_direct(soup)
                        
                        # 如果自定义方法提取的内容更多，则使用它
                        if len(fallback_content) > len("\n\n".join(content_parts)) or len(fallback_content) > 500:
                            self.logger.info(f"使用直接提取方法提取的内容，长度: {len(fallback_content)}")
                            content = fallback_content
                            
                            # 清理资源
                            g.close()
                            
                            return content
                    
                    # 组合所有部分
                    content = "\n\n".join(content_parts)
                    
                    # 清理资源
                    g.close()
                    
                    # 如果内容仍然不足，使用自定义方法
                    if not content or len(content) < 500:
                        self.logger.warning(f"Goose3提取的内容仍然不足，使用自定义方法")
                        content = self._fallback_extract_content()
                        self.logger.info(f"自定义方法提取的内容长度: {len(content)}")
                    
                    self.logger.info(f"最终内容长度: {len(content)}")
                    return content
                    
                except Exception as e:
                    self.logger.error(f"使用Goose3提取内容时出错: {str(e)}")
                    self.logger.debug(f"详细错误: {traceback.format_exc()}")
            
            if self.content_extractor != "auto":
                self.logger.warning("指定的Goose3提取引擎不可用或提取内容为空，回退到自定义算法")
                content = self._fallback_extract_content()
                return content

        # 如果所有引擎都失败或用户选择自定义算法
        if self.content_extractor == "custom" or not content:
            content = self._fallback_extract_content()
            return content
        
        return content
    
    def _extract_content_direct(self, soup: BeautifulSoup) -> str:
        """直接从BeautifulSoup对象提取内容，不依赖于特定容器"""
        self.logger.info("使用直接内容提取方法")
        
        # 移除所有非内容元素
        for tag in soup.find_all(['script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav']):
            tag.decompose()
        
        # 提取所有段落文本
        paragraphs = []
        
        # 查找所有段落元素
        for p in soup.find_all('p'):
            text = p.get_text(strip=True)
            if text and len(text) > 20:
                paragraphs.append(text)
        
        # 如果找到足够的段落，直接使用
        if len(paragraphs) >= 3:
            content = '\n\n'.join(paragraphs)
            self.logger.info(f"直接提取到 {len(paragraphs)} 个段落，总长度: {len(content)}")
            return content
        
        # 否则，尝试从主体内容中提取所有文本
        body = soup.find('body')
        if body:
            all_text = body.get_text('\n', strip=True)
            # 按行分割并过滤掉太短的行
            lines = [line.strip() for line in all_text.split('\n') if len(line.strip()) > 30]
            if lines:
                content = '\n\n'.join(lines)
                self.logger.info(f"从页面主体提取到 {len(lines)} 个文本行，总长度: {len(content)}")
                return content
        
        # 最后的回退 - 使用整个页面的文本
        all_text = soup.get_text(separator=' ', strip=True)
        self.logger.info(f"使用整个页面文本作为回退，长度: {len(all_text)}")
        return all_text
    
    def check_content(self):
        """检查内容相关问题"""
        # 智能提取主要内容区域文本
        text_content = self.extracted_content["text"]
        
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
        """
        检查指定的库是否可用
        不仅检查库是否已安装，还尝试导入以确保真正可用
        """
        try:
            # 简化检查，只验证导入
            if library_name == 'goose3':
                import goose3
                # 不在此方法中创建Goose实例，仅验证可导入
                return True
            elif library_name == 'newspaper':
                import newspaper
                return True
            elif library_name == 'trafilatura':
                import trafilatura
                return True
            elif library_name == 'readability':
                import readability
                return True
            else:
                return importlib.util.find_spec(library_name) is not None
        except ImportError:
            self.logger.warning(f"库{library_name}未安装或无法导入")
            return False
        except Exception as e:
            self.logger.warning(f"库{library_name}检查时出现问题: {str(e)}")
            return False
    
    def _fallback_extract_content(self) -> str:
        """
        增强的自定义算法提取页面主要内容，在没有第三方库可用时使用
        """
        self.logger.info("使用增强的自定义内容提取算法")
        
        # 新增：尝试从脚本标签中提取JSON内容
        script_content = self.extract_json_content_from_scripts(self.soup)
        if script_content and len(script_content) > 500:
            self.logger.info(f"从脚本标签提取JSON内容成功，内容长度: {len(script_content)}")
            return script_content
        
        # 新增：直接从整个文档提取内容，不尝试识别特定容器
        direct_content = self._extract_content_direct(self.soup)
        if direct_content and len(direct_content) > 500:
            self.logger.info(f"使用直接内容提取方法成功，内容长度: {len(direct_content)}")
            return direct_content
        
        # 如果直接提取方法不成功，尝试更精细的内容提取
        
        # 1. 首先尝试通过常见的内容容器标签和类名定位主要内容
        content_selectors = [
            'article', 'main', '[role="main"]', '#main-content', '.content', '#content', 
            '.post', '.entry', '.post-content', '.article-content', '.entry-content', 
            '.page-content', '.story', '.blog-post', '.article-body', '.cms-content',
            '.main-content', '[itemprop="articleBody"]', '.post-body', '.story-body', 
            '#article', '#post', '#story', '.story-content', '.article-text'
        ]
        
        # 尝试定位主要内容区域
        main_content_element = None
        for selector in content_selectors:
            elements = self.soup.select(selector)
            if elements:
                main_content_element = elements[0]
                self.logger.info(f"通过选择器 '{selector}' 找到内容区域")
                
                # 检查这个元素是否包含足够的文本
                text = main_content_element.get_text(strip=True)
                if len(text) > 500:
                    self.logger.info(f"选择的内容区域包含 {len(text)} 个字符")
                    break
                else:
                    self.logger.info(f"选择的内容区域文本太少 ({len(text)} 字符)，继续查找")
                    main_content_element = None
                
        # 2. 如果没有找到明确的内容容器，使用增强的启发式方法
        if not main_content_element:
            # 排除这些明显的非内容区域
            excluded_tags = ['nav', 'header', 'footer', 'aside', 'menu', 'style', 'script', 'meta', 'link', 'noscript']
            excluded_classes = ['menu', 'nav', 'navigation', 'header', 'footer', 'sidebar', 'widget', 'banner', 'ad', 'popup', 'modal']
            
            # 收集所有可能的内容块
            potential_content_blocks = []
            
            # 查找所有可能包含文章内容的容器
            containers = self.soup.find_all(['div', 'section', 'article', 'main'])
            self.logger.info(f"找到 {len(containers)} 个可能的容器元素")
            
            for element in containers:
                # 跳过被排除的标签
                if element.name in excluded_tags:
                    continue
                
                # 跳过被排除的类
                element_classes = element.get('class', [])
                if isinstance(element_classes, str):
                    element_classes = [element_classes]
                    
                skip = False
                for cls in element_classes:
                    if isinstance(cls, str) and any(excluded in cls.lower() for excluded in excluded_classes):
                        skip = True
                        break
                
                if skip:
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
                
                # 计算段落数量和链接数量
                paragraphs = element.find_all('p')
                paragraph_count = len(paragraphs)
                links = element.find_all('a')
                link_count = len(links)
                
                # 计算段落中的平均文本长度
                if paragraph_count > 0:
                    avg_paragraph_length = sum(len(p.get_text(strip=True)) for p in paragraphs) / paragraph_count
                else:
                    avg_paragraph_length = 0
                
                # 内容分数计算 - 考虑更多因素
                # 1. 文本长度越长越好
                # 2. 内容密度越高越好
                # 3. 段落数量越多越好
                # 4. 平均段落长度越长越好
                # 5. 链接密度适中（太多可能是导航，太少可能缺乏引用）
                content_score = (
                    text_length * 1.0 +                                  # 文本长度权重
                    content_density * 30.0 +                             # 内容密度权重
                    paragraph_count * 25.0 +                             # 段落数量权重
                    avg_paragraph_length * 0.5 +                         # 平均段落长度权重
                    (50.0 if 5 <= link_count <= 25 else 0.0)            # 适中的链接数量加分
                )
                
                # 收集潜在内容块信息
                potential_content_blocks.append({
                    'element': element,
                    'text_length': text_length,
                    'content_density': content_density,
                    'paragraph_count': paragraph_count,
                    'avg_paragraph_length': avg_paragraph_length,
                    'link_count': link_count,
                    'score': content_score
                })
            
            # 如果找到了潜在内容块，选择评分最高的
            if potential_content_blocks:
                potential_content_blocks.sort(key=lambda x: x['score'], reverse=True)
                top_block = potential_content_blocks[0]
                main_content_element = top_block['element']
                self.logger.info(f"基于启发式方法选择内容块，分数: {top_block['score']:.1f}, 段落数: {top_block['paragraph_count']}, 文本长度: {top_block['text_length']}")
            else:
                # 如果没有找到任何合适的内容块，使用body但排除header/footer等
                self.logger.info("未找到合适的内容块，使用整个body并排除明显的非内容元素")
                main_content_element = self.soup.body
        
        # 3. 从选定的内容区域中提取文本
        if main_content_element:
            # 记录主要内容元素的基本信息
            self.logger.info(f"内容元素: {main_content_element.name}, ID: {main_content_element.get('id', '无')}, 类: {main_content_element.get('class', '无')}")
            
            # 直接获取所有文本，不删除任何元素，以便进行检查
            all_text = main_content_element.get_text(separator='\n', strip=True)
            self.logger.info(f"内容元素中的全部文本长度: {len(all_text)}")
            
            # 提取所有段落元素
            paragraphs = []
            
            # 1. 首先检查直接的p标签
            p_tags = main_content_element.find_all('p')
            self.logger.info(f"找到 {len(p_tags)} 个<p>标签")
            
            for p in p_tags:
                text = p.get_text(strip=True)
                if text and len(text) > 15:  # 较低的门槛，确保捕获短段落
                    paragraphs.append(text)
            
            # 2. 如果找不到足够的段落，尝试其他可能包含文本的元素
            if len(paragraphs) < 3:
                self.logger.info("段落数量不足，尝试查找其他文本元素")
                
                # 尝试更多的文本容器元素
                for tag_name in ['div', 'section', 'span', 'li', 'td', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    for element in main_content_element.find_all(tag_name):
                        # 只考虑那些直接包含文本的元素
                        if element.find('p') is None:  # 不包含段落的元素
                            text = element.get_text(strip=True)
                            if text and len(text) > 30:  # 略高的门槛，避免捕获太多小片段
                                # 检查这个文本是否已经被包含在现有段落中
                                if not any(text in p for p in paragraphs):
                                    paragraphs.append(text)
            
            # 3. 如果仍然没有足够的段落，尝试更激进的方法 - 提取所有直接文本节点
            if len(paragraphs) < 2:
                self.logger.info("仍然找不到足够的段落，尝试提取所有文本节点")
                
                # 收集所有非空文本节点
                text_nodes = []
                
                def extract_text_nodes(element):
                    for child in element.children:
                        if isinstance(child, str) and child.strip():
                            text_nodes.append(child.strip())
                        elif hasattr(child, 'children'):
                            extract_text_nodes(child)
                
                extract_text_nodes(main_content_element)
                
                # 将所有文本节点合并为段落
                if text_nodes:
                    # 只保留长度超过25个字符的文本
                    filtered_nodes = [t for t in text_nodes if len(t) > 25]
                    if filtered_nodes:
                        paragraphs.extend(filtered_nodes)
                        self.logger.info(f"从文本节点提取了 {len(filtered_nodes)} 个片段")
            
            # 4. 最后的方案 - 如果所有方法都失败，使用整个文本内容
            if not paragraphs and all_text:
                self.logger.info("无法提取段落，使用整个内容区域的文本")
                
                # 尝试按行分割
                lines = all_text.split('\n')
                
                # 过滤掉太短的行
                valid_lines = [line for line in lines if len(line.strip()) > 30]
                
                if valid_lines:
                    paragraphs = valid_lines
                    self.logger.info(f"通过行分割提取了 {len(valid_lines)} 个片段")
                else:
                    # 实在没有办法，直接使用整个文本
                    content_text = all_text
                    self.logger.info(f"使用完整文本作为内容，长度: {len(content_text)}")
                    return content_text
            
            # 组合段落，保留段落结构
            if paragraphs:
                # 记录找到的段落数量和样本
                self.logger.info(f"最终找到 {len(paragraphs)} 个段落")
                if paragraphs:
                    sample = paragraphs[0][:100] + ('...' if len(paragraphs[0]) > 100 else '')
                    self.logger.info(f"段落样本: {sample}")
                    
                content_text = '\n\n'.join(paragraphs)
                self.logger.info(f"提取的总内容长度: {len(content_text)}")
                return content_text
            else:
                # 如果仍然没有找到段落，回退到整个元素的文本
                content_text = main_content_element.get_text(separator=' ', strip=True)
                self.logger.info(f"无法提取段落，使用元素的整体文本，长度: {len(content_text)}")
                return content_text
        
        # 4. 如果所有方法都失败，回退到使用整个页面文本并更智能地过滤
        # 如果我们到了这一步，表示前面的所有方法都失败了
        if not self.soup:
            self.logger.warning("无法获取页面内容")
            return ""
            
        self.logger.info("使用页面全文，并尝试智能过滤")
        
        # 1. 移除明显的非内容元素
        clean_soup = BeautifulSoup(str(self.soup), 'html.parser')
        
        for tag in clean_soup.find_all(['script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav']):
            tag.decompose()
        
        # 2. 提取所有文本并按行分割
        all_text = clean_soup.get_text(separator='\n', strip=True)
        lines = all_text.split('\n')
        
        # 3. 过滤掉短行和可能是导航/菜单的行
        content_lines = []
        nav_patterns = ['home', 'about', 'contact', 'menu', 'login', 'sign', 'cart', 'copyright', '©', 'all rights', 'terms', 'privacy']
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # 忽略太短的行
            if len(line) < 30:
                continue
                
            # 忽略可能是导航/菜单的行
            if any(pattern in line.lower() for pattern in nav_patterns):
                continue
                
            content_lines.append(line)
        
        # 4. 组合过滤后的内容
        if content_lines:
            content_text = '\n\n'.join(content_lines)
            self.logger.info(f"从全文提取并过滤后的内容长度: {len(content_text)}")
            return content_text
        
        # 5. 最后的回退 - 使用完整文本，不过滤
        content_text = all_text
        self.logger.info(f"使用完整文本作为最终回退，长度: {len(content_text)}")
        return content_text
    
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