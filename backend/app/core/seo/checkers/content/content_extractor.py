import html
import re
import logging
import traceback
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup, Tag


class ContentExtractor:
    """Handles content extraction from HTML documents using various engines."""
    
    def __init__(self, soup: BeautifulSoup, content_extractor: str = "auto"):
        self.soup = soup
        self.content_extractor = content_extractor
        self.extracted_content = {
            "text": "",
            "title": "",
            "description": "",
            "structure": []
        }
        
        # Initialize logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger('ContentExtractor')
    
    def extract_structure_info(self):
        """
        Extract structured information from the page, including title, description and HTML structure tags.
        """
        self.logger.info("开始提取页面结构化信息...")
        
        # 1. Extract page title
        title_tag = self.soup.find('title')
        if title_tag and title_tag.string:
            self.extracted_content["title"] = title_tag.string.strip()
            self.logger.info(f"提取到页面标题: {self.extracted_content['title']}")

        # 2. Extract page description
        meta_desc = self.soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            self.extracted_content["description"] = meta_desc.get('content').strip()
            self.logger.info(f"提取到页面描述: {self.extracted_content['description'][:50]}...")
        
        # 3. Extract OG title and description as alternatives
        og_title = self.soup.find('meta', attrs={'property': 'og:title'})
        if og_title and og_title.get('content') and not self.extracted_content["title"]:
            self.extracted_content["title"] = og_title.get('content').strip()
            self.logger.info(f"提取到OG标题: {self.extracted_content['title']}")
            
        og_desc = self.soup.find('meta', attrs={'property': 'og:description'})
        if og_desc and og_desc.get('content') and not self.extracted_content["description"]:
            self.extracted_content["description"] = og_desc.get('content').strip()
            self.logger.info(f"提取到OG描述: {self.extracted_content['description'][:50]}...")
        
        # 4. Extract Twitter card title and description as alternatives
        twitter_title = self.soup.find('meta', attrs={'name': 'twitter:title'})
        if twitter_title and twitter_title.get('content') and not self.extracted_content["title"]:
            self.extracted_content["title"] = twitter_title.get('content').strip()
            self.logger.info(f"提取到Twitter标题: {self.extracted_content['title']}")
            
        twitter_desc = self.soup.find('meta', attrs={'name': 'twitter:description'})
        if twitter_desc and twitter_desc.get('content') and not self.extracted_content["description"]:
            self.extracted_content["description"] = twitter_desc.get('content').strip()
            self.logger.info(f"提取到Twitter描述: {self.extracted_content['description'][:50]}...")
        
        # 5. If still no title found, try to find h1
        if not self.extracted_content["title"]:
            h1_tag = self.soup.find('h1')
            if h1_tag:
                self.extracted_content["title"] = h1_tag.get_text(strip=True)
                self.logger.info(f"使用H1作为标题: {self.extracted_content['title']}")

    def extract_content_with_structure(self):
        """
        Extract content and retain structural information.
        """
        # First extract title and description metadata
        self.extract_structure_info()
        
        # Extract main content text
        main_text = self.extract_main_content()
        self.extracted_content["text"] = main_text
        
        # Now extract HTML structure tags
        self.extract_html_structure()
        
        return main_text

    def extract_html_structure(self):
        """
        Extract HTML structure tags (like h1-h6) from the page and their positions in plain text.
        """
        self.logger.info("提取HTML结构标签...")
        
        # Check current plain text content
        text_content = self.extracted_content["text"]
        if not text_content:
            self.logger.warning("没有提取到文本内容，无法标记结构")
            return
        
        # Structure tags list
        structure = []
        
        # Use smarter method to extract title tags
        # 1. Find possible main content areas
        main_content = None
        for selector in ['article', 'main', '[role="main"]', '.content', '#content', '.post', '.entry', '.body']:
            elements = self.soup.select(selector)
            if elements:
                main_content = elements[0]
                self.logger.info(f"找到可能的主内容区域: {selector}")
                break
        
        # If no main content area found, use the entire body
        if not main_content:
            main_content = self.soup.body
        
        if not main_content:
            self.logger.warning("无法找到主内容区域")
            return
        
        # 2. Extract title tags from main content area
        heading_tags = main_content.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        self.logger.info(f"找到 {len(heading_tags)} 个标题标签")
        
        # 3. Match title tags text with plain text content
        for htag in heading_tags:
            heading_text = htag.get_text(strip=True)
            if not heading_text:
                continue
                
            tag_type = htag.name  # h1, h2, etc.
            
            # Check if this title text appears in the extracted plain text
            if heading_text in text_content:
                # Find the position of title in plain text
                start_pos = text_content.find(heading_text)
                end_pos = start_pos + len(heading_text)
                
                # Add to structure information
                structure.append({
                    "type": tag_type,
                    "text": heading_text,
                    "start": start_pos,
                    "end": end_pos
                })
                self.logger.info(f"找到{tag_type}标签: {heading_text[:30]}...")
        
        # 4. Add other elements that need highlighting (like emphasized text)
        for tag_name, type_name in [('strong', 'strong'), ('em', 'emphasis'), ('b', 'bold'), ('i', 'italic')]:
            emphasis_tags = main_content.find_all(tag_name)
            for tag in emphasis_tags:
                tag_text = tag.get_text(strip=True)
                if not tag_text or len(tag_text) < 5:  # Ignore too short emphasized text
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
        
        # Save structure information
        self.extracted_content["structure"] = structure
        self.logger.info(f"总共提取了 {len(structure)} 个结构元素")
    
    def extract_json_content_from_scripts(self, soup):
        """
        Extract JSON content from script tags in the page.
        Especially for modern frontend frameworks (like Next.js, React etc.) that store content in script tags.
        """
        self.logger.info("尝试从脚本标签中提取JSON内容...")
        extracted_text = ""
        
        # Find script tags that might contain content
        script_tags = soup.find_all('script', {'type': 'application/json'})
        if not script_tags:
            # Also look for __NEXT_DATA__ tags that might not have type specified
            script_tags = soup.find_all('script', {'id': '__NEXT_DATA__'})

        for script in script_tags:
            try:
                import json
                script_content = script.string
                if not script_content:
                    continue
                    
                # Parse JSON content
                json_data = json.loads(script_content)
                
                # Recursively extract all string values
                def extract_strings(obj, min_length=15):
                    texts = []
                    if isinstance(obj, dict):
                        for key, value in obj.items():
                            # Exclude some common non-content keys
                            if key.lower() in ['url', 'href', 'src', 'alt', 'id', 'class', 'style', 'type']:
                                continue
                            texts.extend(extract_strings(value, min_length))
                    elif isinstance(obj, list):
                        for item in obj:
                            texts.extend(extract_strings(item, min_length))
                    elif isinstance(obj, str) and len(obj) > min_length:
                        # Exclude URLs and short text
                        if not obj.startswith(('http://', 'https://', '/', '#')):
                            texts.append(obj)
                    return texts
                
                # Extract all possible content from JSON
                text_candidates = extract_strings(json_data)
                
                # Sort by length and select the longest few texts
                text_candidates.sort(key=len, reverse=True)
                top_candidates = text_candidates[:10]  # Take the longest 10 texts
                
                if top_candidates:
                    self.logger.info(f"从脚本标签中提取到 {len(top_candidates)} 段可能的内容")
                    extracted_text = "\n\n".join(top_candidates)
                    
            except Exception as e:
                self.logger.warning(f"从脚本中提取JSON内容失败: {str(e)}")
        
        if extracted_text:
            self.logger.info(f"从脚本中提取的JSON内容长度: {len(extracted_text)}")
        
        return extracted_text

    def normalize_text(self, text: str) -> str:
        if not text:
            return ""
        
        # 1. Decode HTML entities
        text = html.unescape(text)
        
        # 2. Handle common HTML entities and special characters
        html_entities_map = {
            '&mdash;': '—',
            '&ndash;': '–',
            '&ldquo;': '"',
            '&rdquo;': '"',
            '&lsquo;': ''',
            '&rsquo;': ''',
            '&quot;': '"',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&nbsp;': ' ',
            '&hellip;': '…',
            '&bull;': '•',
        }
        
        for entity, replacement in html_entities_map.items():
            text = text.replace(entity, replacement)
        
        # 3. Clean excess whitespace characters
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        # 4. Remove zero-width characters and other invisible characters
        text = re.sub(r'[\u200b-\u200f\u2028-\u202f\u205f-\u206f\ufeff]', '', text)
        
        return text

    def extract_main_content(self) -> str:
        """
        Intelligently extract main content area text from the page.
        Based on user selected extraction engine.
        """
        html_content = str(self.soup)
        content = ""
        
        # First try to extract JSON content from script tags, applicable to all engines as preprocessing
        script_content = self.extract_json_content_from_scripts(self.soup)
        if script_content and len(script_content) > 500:
            self.logger.info(f"使用脚本标签中的JSON内容作为主要内容，长度: {len(script_content)}")
            return self.normalize_text(script_content)
        
        # Choose different extraction methods based on selected extraction engine
        if self.content_extractor == "auto" or self.content_extractor == "trafilatura":
            if self._check_library_available('trafilatura'):
                try:
                    import trafilatura
                    content = trafilatura.extract(html_content)
                    if content and len(content) > 100:
                        self.logger.info("成功使用Trafilatura提取内容，长度: %d", len(content))
                        return self.normalize_text(content)
                except Exception as e:
                    self.logger.warning("Trafilatura内容提取失败: %s", str(e))
            
            # If auto mode, continue trying other engines
            if self.content_extractor != "auto":
                self.logger.warning("指定的Trafilatura提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
                return self.normalize_text(content)
        
        if self.content_extractor == "auto" or self.content_extractor == "newspaper":
            if self._check_library_available('newspaper'):
                try:
                    import newspaper
                    from newspaper import fulltext
                    content = fulltext(html_content)
                    if content and len(content) > 100:
                        self.logger.info("成功使用Newspaper提取内容，长度: %d", len(content))
                        return self.normalize_text(content)
                except Exception as e:
                    self.logger.warning("Newspaper3k内容提取失败: %s", str(e))
                    # Try backup method
                    try:
                        from newspaper import Article
                        article = Article(url='')
                        article.download(input_html=html_content)
                        article.parse()
                        content = article.text
                        if content and len(content) > 100:
                            self.logger.info("成功使用Newspaper Article提取内容，长度: %d", len(content))
                            return self.normalize_text(content)
                    except Exception as e2:
                        self.logger.warning("Newspaper3k备用方法提取失败: %s", str(e2))
                        self.logger.debug("详细错误: %s", traceback.format_exc())
            
            if self.content_extractor != "auto":
                self.logger.warning("指定的Newspaper提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
                return self.normalize_text(content)
        
        if self.content_extractor == "auto" or self.content_extractor == "readability":
            if self._check_library_available('readability'):
                try:
                    from readability import Document
                    doc = Document(html_content)
                    content_html = doc.summary()
                    # Extract plain text from HTML
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(content_html, 'html.parser')
                    text_content = soup.get_text(separator=' ', strip=True)
                    if text_content and len(text_content) > 100:
                        self.logger.info("成功使用Readability提取内容，长度: %d", len(text_content))
                        return self.normalize_text(text_content)
                except Exception as e:
                    self.logger.warning("Readability-lxml内容提取失败: %s", str(e))
                    self.logger.debug("详细错误: %s", traceback.format_exc())
            
            if self.content_extractor != "auto":
                self.logger.warning("指定的Readability提取引擎不可用，回退到自定义算法")
                content = self._fallback_extract_content()
                return self.normalize_text(content)
        
        # Enhanced Goose3 handling section
        if self.content_extractor == "auto" or self.content_extractor == "goose3":
            self.logger.info("开始尝试使用Goose3提取内容...")
            # First check if goose3 is available
            if not self._check_library_available('goose3'):
                self.logger.warning("Goose3库不可用")
                if self.content_extractor != "auto":
                    content = self._fallback_extract_content()
                    return self.normalize_text(content)
            else:
                try:
                    # Import necessary modules
                    import goose3
                    from goose3 import Goose
                    
                    # Try to log Goose3 version
                    try:
                        version = goose3.__version__
                        self.logger.info(f"Goose3版本: {version}")
                    except AttributeError:
                        self.logger.info("无法获取Goose3版本")
                    
                    # Use default configuration
                    self.logger.info("使用默认配置创建Goose实例")
                    g = Goose()
                    
                    # Preprocess HTML to ensure sufficient content marking
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(html_content, 'html.parser')
                    
                    # Stronger content area marking - add more possible content area identifiers
                    potential_content_areas = []
                    
                    # 1. Find common content tags
                    for selector in ['article', 'main', '[role="main"]', '.content', '#content', '.post', '.entry', '.body', '.article', '.post-content']:
                        elements = soup.select(selector)
                        potential_content_areas.extend(elements)
                    
                    # 2. Find possible content areas based on paragraph density
                    if not potential_content_areas:
                        div_elements = soup.find_all('div')
                        for div in div_elements:
                            # Calculate number of paragraphs and text length
                            paragraphs = div.find_all('p')
                            if len(paragraphs) >= 3:  # At least 3 paragraphs
                                text_length = len(div.get_text(strip=True))
                                if text_length > 500:  # Text length over 500 characters
                                    div['data-goose-article'] = 'true'
                                    self.logger.info(f"根据内容密度为元素添加了标记")
                                    potential_content_areas.append(div)
                                    break
                    
                    # 3. Add explicit article marking for found content areas
                    for area in potential_content_areas:
                        area['data-goose-article'] = 'true'
                        self.logger.info(f"为内容区域添加了标记: {area.name}")
                    
                    # Regenerate HTML
                    enhanced_html = str(soup)
                    
                    # Extract content
                    self.logger.info("使用Goose3提取内容...")
                    article = g.extract(raw_html=enhanced_html)
                    
                    # Check extraction results
                    self.logger.info(f"Goose3提取结果 - 标题: {article.title}")
                    self.logger.info(f"Goose3提取结果 - 元描述: {article.meta_description}")
                    self.logger.info(f"Goose3提取结果 - 内容长度: {len(article.cleaned_text) if article.cleaned_text else 0}")
                    
                    # Check if there's top_node, which is the main content node identified by Goose3
                    has_top_node = hasattr(article, 'top_node') and article.top_node is not None
                    if has_top_node:
                        self.logger.info("Goose3成功识别了top_node")
                    
                    # Rewrite content combination method
                    content_parts = []
                    
                    # 1. First add title and description
                    if article.title:
                        content_parts.append(article.title)
                    if article.meta_description:
                        content_parts.append(article.meta_description)
                    
                    # 2. Add Goose3 extracted body content
                    if article.cleaned_text and len(article.cleaned_text) > 100:
                        content_parts.append(article.cleaned_text)
                        self.logger.info(f"使用Goose3提取的正文，长度: {len(article.cleaned_text)}")
                    
                    # Fixed top_node handling section
                    elif has_top_node:
                        try:
                            # Don't use Parser module, try to get text directly from top_node
                            # First try to get HTML content from top_node
                            if hasattr(article.top_node, 'text_content'):
                                # lxml Element object
                                node_text = article.top_node.text_content()
                                if node_text and len(node_text) > 100:
                                    content_parts.append(node_text)
                                    self.logger.info(f"从top_node直接提取的文本，长度: {len(node_text)}")
                            elif hasattr(article.top_node, 'get_text'):
                                # BeautifulSoup object
                                node_text = article.top_node.get_text(separator='\n\n', strip=True)
                                if node_text and len(node_text) > 100:
                                    content_parts.append(node_text)
                                    self.logger.info(f"从top_node提取的BeautifulSoup文本，长度: {len(node_text)}")
                            else:
                                # Other types, try to convert directly to string
                                try:
                                    node_str = str(article.top_node)
                                    # Use BeautifulSoup to parse this string
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
                    
                    # 4. If Goose3 extracted content is insufficient, first try to extract from scripts, then use custom extraction method
                    if not content_parts or len("\n\n".join(content_parts)) < 500:  # If total content is less than 500 characters
                        self.logger.info("Goose3提取内容不足，尝试从脚本标签和自定义方法提取内容")
                        
                        # First try to extract JSON content from script tags
                        script_content = self.extract_json_content_from_scripts(soup)
                        
                        if script_content and len(script_content) > 500:
                            self.logger.info(f"使用脚本标签中的JSON内容，长度: {len(script_content)}")
                            content = script_content
                            
                            # Clean up resources
                            g.close()
                            
                            return self.normalize_text(content)
                        
                        # If content extracted from scripts is insufficient, use custom method to extract main content
                        fallback_content = self._extract_content_direct(soup)
                        
                        # If custom method extracted more content, use it
                        if len(fallback_content) > len("\n\n".join(content_parts)) or len(fallback_content) > 500:
                            self.logger.info(f"使用直接提取方法提取的内容，长度: {len(fallback_content)}")
                            content = fallback_content
                            
                            # Clean up resources
                            g.close()
                            
                            return self.normalize_text(content)
                    
                    # Combine all parts
                    content = "\n\n".join(content_parts)
                    
                    # Clean up resources
                    g.close()
                    
                    # If content is still insufficient, use custom method
                    if not content or len(content) < 500:
                        self.logger.warning(f"Goose3提取的内容仍然不足，使用自定义方法")
                        content = self._fallback_extract_content()
                        self.logger.info(f"自定义方法提取的内容长度: {len(content)}")
                    
                    self.logger.info(f"最终内容长度: {len(content)}")
                    return self.normalize_text(content)
                    
                except Exception as e:
                    self.logger.error(f"使用Goose3提取内容时出错: {str(e)}")
                    self.logger.debug(f"详细错误: {traceback.format_exc()}")
            
            if self.content_extractor != "auto":
                self.logger.warning("指定的Goose3提取引擎不可用或提取内容为空，回退到自定义算法")
                content = self._fallback_extract_content()
                return self.normalize_text(content)

        # If all engines fail or user chooses custom algorithm
        if self.content_extractor == "custom" or not content:
            content = self._fallback_extract_content()
            return self.normalize_text(content)
        
        return self.normalize_text(content)
    
    def _extract_content_direct(self, soup: BeautifulSoup) -> str:
        """Extract content directly from BeautifulSoup object, not dependent on specific containers"""
        self.logger.info("使用直接内容提取方法")
        
        # Remove all non-content elements
        for tag in soup.find_all(['script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav']):
            tag.decompose()
        
        # Extract all paragraph text
        paragraphs = []
        
        # Find all paragraph elements
        for p in soup.find_all('p'):
            text = p.get_text(strip=True)
            if text and len(text) > 20:
                paragraphs.append(text)
        
        # If enough paragraphs found, use directly
        if len(paragraphs) >= 3:
            content = '\n\n'.join(paragraphs)
            self.logger.info(f"直接提取到 {len(paragraphs)} 个段落，总长度: {len(content)}")
            return content
        
        # Otherwise, try to extract all text from main body content
        body = soup.find('body')
        if body:
            all_text = body.get_text('\n', strip=True)
            # Split by lines and filter out too short lines
            lines = [line.strip() for line in all_text.split('\n') if len(line.strip()) > 30]
            if lines:
                content = '\n\n'.join(lines)
                self.logger.info(f"从页面主体提取到 {len(lines)} 个文本行，总长度: {len(content)}")
                return content
        
        # Final fallback - use entire page text
        all_text = soup.get_text(separator=' ', strip=True)
        self.logger.info(f"使用整个页面文本作为回退，长度: {len(all_text)}")
        return all_text
    
    def _fallback_extract_content(self) -> str:
        """
        Enhanced custom algorithm to extract main page content, used when no third-party libraries are available.
        """
        self.logger.info("使用增强的自定义内容提取算法")
        
        # New: Try to extract JSON content from script tags
        script_content = self.extract_json_content_from_scripts(self.soup)
        if script_content and len(script_content) > 500:
            self.logger.info(f"从脚本标签提取JSON内容成功，内容长度: {len(script_content)}")
            return script_content
        
        # New: Extract content directly from entire document, don't try to identify specific containers
        direct_content = self._extract_content_direct(self.soup)
        if direct_content and len(direct_content) > 500:
            self.logger.info(f"使用直接内容提取方法成功，内容长度: {len(direct_content)}")
            return direct_content
        
        # If direct extraction method is not successful, try more refined content extraction
        
        # 1. First try to locate main content through common content container tags and class names
        content_selectors = [
            'article', 'main', '[role="main"]', '#main-content', '.content', '#content', 
            '.post', '.entry', '.post-content', '.article-content', '.entry-content', 
            '.page-content', '.story', '.blog-post', '.article-body', '.cms-content',
            '.main-content', '[itemprop="articleBody"]', '.post-body', '.story-body', 
            '#article', '#post', '#story', '.story-content', '.article-text'
        ]
        
        # Try to locate main content area
        main_content_element = None
        for selector in content_selectors:
            elements = self.soup.select(selector)
            if elements:
                main_content_element = elements[0]
                self.logger.info(f"通过选择器 '{selector}' 找到内容区域")
                
                # Check if this element contains sufficient text
                text = main_content_element.get_text(strip=True)
                if len(text) > 500:
                    self.logger.info(f"选择的内容区域包含 {len(text)} 个字符")
                    break
                else:
                    self.logger.info(f"选择的内容区域文本太少 ({len(text)} 字符)，继续查找")
                    main_content_element = None
                
        # 2. If no explicit content container found, use enhanced heuristic method
        if not main_content_element:
            # Exclude these obvious non-content areas
            excluded_tags = ['nav', 'header', 'footer', 'aside', 'menu', 'style', 'script', 'meta', 'link', 'noscript']
            excluded_classes = ['menu', 'nav', 'navigation', 'header', 'footer', 'sidebar', 'widget', 'banner', 'ad', 'popup', 'modal']
            
            # Collect all possible content blocks
            potential_content_blocks = []
            
            # Find all containers that might contain article content
            containers = self.soup.find_all(['div', 'section', 'article', 'main'])
            self.logger.info(f"找到 {len(containers)} 个可能的容器元素")
            
            for element in containers:
                # Skip excluded tags
                if element.name in excluded_tags:
                    continue
                
                # Skip excluded classes
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
                
                # Get text and its length
                text = element.get_text(strip=True)
                text_length = len(text)
                
                # Calculate content density (ratio of text length to HTML length)
                html_length = len(str(element))
                if html_length == 0:
                    continue
                
                content_density = text_length / html_length
                
                # Exclude particularly short text blocks
                if text_length < 100:
                    continue
                
                # Calculate number of paragraphs and links
                paragraphs = element.find_all('p')
                paragraph_count = len(paragraphs)
                links = element.find_all('a')
                link_count = len(links)
                
                # Calculate average paragraph length
                if paragraph_count > 0:
                    avg_paragraph_length = sum(len(p.get_text(strip=True)) for p in paragraphs) / paragraph_count
                else:
                    avg_paragraph_length = 0
                
                # Content score calculation - consider more factors
                # 1. Longer text length is better
                # 2. Higher content density is better
                # 3. More paragraphs is better
                # 4. Longer average paragraph length is better
                # 5. Moderate link density (too many might be navigation, too few might lack references)
                content_score = (
                    text_length * 1.0 +                                  # Text length weight
                    content_density * 30.0 +                             # Content density weight
                    paragraph_count * 25.0 +                             # Paragraph count weight
                    avg_paragraph_length * 0.5 +                         # Average paragraph length weight
                    (50.0 if 5 <= link_count <= 25 else 0.0)            # Moderate link count bonus
                )
                
                # Collect potential content block information
                potential_content_blocks.append({
                    'element': element,
                    'text_length': text_length,
                    'content_density': content_density,
                    'paragraph_count': paragraph_count,
                    'avg_paragraph_length': avg_paragraph_length,
                    'link_count': link_count,
                    'score': content_score
                })
            
            # If potential content blocks found, select the highest scoring one
            if potential_content_blocks:
                potential_content_blocks.sort(key=lambda x: x['score'], reverse=True)
                top_block = potential_content_blocks[0]
                main_content_element = top_block['element']
                self.logger.info(f"基于启发式方法选择内容块，分数: {top_block['score']:.1f}, 段落数: {top_block['paragraph_count']}, 文本长度: {top_block['text_length']}")
            else:
                # If no suitable content blocks found, use body but exclude header/footer etc.
                self.logger.info("未找到合适的内容块，使用整个body并排除明显的非内容元素")
                main_content_element = self.soup.body
        
        # 3. Extract text from selected content area
        if main_content_element:
            # Log basic information about main content element
            self.logger.info(f"内容元素: {main_content_element.name}, ID: {main_content_element.get('id', '无')}, 类: {main_content_element.get('class', '无')}")
            
            # Get all text directly, don't delete any elements for inspection
            all_text = main_content_element.get_text(separator='\n', strip=True)
            self.logger.info(f"内容元素中的全部文本长度: {len(all_text)}")
            
            # Extract all paragraph elements
            paragraphs = []
            
            # 1. First check direct p tags
            p_tags = main_content_element.find_all('p')
            self.logger.info(f"找到 {len(p_tags)} 个<p>标签")
            
            for p in p_tags:
                text = p.get_text(strip=True)
                if text and len(text) > 15:  # Lower threshold to ensure capturing short paragraphs
                    paragraphs.append(text)
            
            # 2. If insufficient paragraphs found, try other elements that might contain text
            if len(paragraphs) < 3:
                self.logger.info("段落数量不足，尝试查找其他文本元素")
                
                # Try more text container elements
                for tag_name in ['div', 'section', 'span', 'li', 'td', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    for element in main_content_element.find_all(tag_name):
                        # Only consider elements that directly contain text
                        if element.find('p') is None:  # Elements that don't contain paragraphs
                            text = element.get_text(strip=True)
                            if text and len(text) > 30:  # Slightly higher threshold to avoid capturing too many small fragments
                                # Check if this text is already included in existing paragraphs
                                if not any(text in p for p in paragraphs):
                                    paragraphs.append(text)
            
            # 3. If still not enough paragraphs, try more aggressive method - extract all direct text nodes
            if len(paragraphs) < 2:
                self.logger.info("仍然找不到足够的段落，尝试提取所有文本节点")
                
                # Collect all non-empty text nodes
                text_nodes = []
                
                def extract_text_nodes(element):
                    for child in element.children:
                        if isinstance(child, str) and child.strip():
                            text_nodes.append(child.strip())
                        elif hasattr(child, 'children'):
                            extract_text_nodes(child)
                
                extract_text_nodes(main_content_element)
                
                # Merge all text nodes into paragraphs
                if text_nodes:
                    # Only keep text longer than 25 characters
                    filtered_nodes = [t for t in text_nodes if len(t) > 25]
                    if filtered_nodes:
                        paragraphs.extend(filtered_nodes)
                        self.logger.info(f"从文本节点提取了 {len(filtered_nodes)} 个片段")
            
            # 4. Final solution - if all methods fail, use entire text content
            if not paragraphs and all_text:
                self.logger.info("无法提取段落，使用整个内容区域的文本")
                
                # Try to split by lines
                lines = all_text.split('\n')
                
                # Filter out too short lines
                valid_lines = [line for line in lines if len(line.strip()) > 30]
                
                if valid_lines:
                    paragraphs = valid_lines
                    self.logger.info(f"通过行分割提取了 {len(valid_lines)} 个片段")
                else:
                    # Really no choice, use entire text directly
                    content_text = all_text
                    self.logger.info(f"使用完整文本作为内容，长度: {len(content_text)}")
                    return content_text
            
            # Combine paragraphs, retain paragraph structure
            if paragraphs:
                # Log number of paragraphs found and sample
                self.logger.info(f"最终找到 {len(paragraphs)} 个段落")
                if paragraphs:
                    sample = paragraphs[0][:100] + ('...' if len(paragraphs[0]) > 100 else '')
                    self.logger.info(f"段落样本: {sample}")
                    
                content_text = '\n\n'.join(paragraphs)
                self.logger.info(f"提取的总内容长度: {len(content_text)}")
                return content_text
            else:
                # If still no paragraphs found, fall back to entire element text
                content_text = main_content_element.get_text(separator=' ', strip=True)
                self.logger.info(f"无法提取段落，使用元素的整体文本，长度: {len(content_text)}")
                return content_text
        
        # 4. If all methods fail, fall back to using entire page text and filter intelligently
        # If we reach this step, all previous methods have failed
        if not self.soup:
            self.logger.warning("无法获取页面内容")
            return ""
            
        self.logger.info("使用页面全文，并尝试智能过滤")
        
        # 1. Remove obvious non-content elements
        clean_soup = BeautifulSoup(str(self.soup), 'html.parser')
        
        for tag in clean_soup.find_all(['script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav']):
            tag.decompose()
        
        # 2. Extract all text and split by lines
        all_text = clean_soup.get_text(separator='\n', strip=True)
        lines = all_text.split('\n')
        
        # 3. Filter out short lines and lines that might be navigation/menu
        content_lines = []
        nav_patterns = ['home', 'about', 'contact', 'menu', 'login', 'sign', 'cart', 'copyright', '©', 'all rights', 'terms', 'privacy']
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Ignore too short lines
            if len(line) < 30:
                continue
                
            # Ignore lines that might be navigation/menu
            if any(pattern in line.lower() for pattern in nav_patterns):
                continue
                
            content_lines.append(line)
        
        # 4. Combine filtered content
        if content_lines:
            content_text = '\n\n'.join(content_lines)
            self.logger.info(f"从全文提取并过滤后的内容长度: {len(content_text)}")
            return content_text
        
        # 5. Final fallback - use complete text, no filtering
        content_text = all_text
        self.logger.info(f"使用完整文本作为最终回退，长度: {len(content_text)}")
        return content_text
    
    def _check_library_available(self, library_name: str) -> bool:
        try:
            # Simplified check, only verify import
            if library_name == 'goose3':
                import goose3
                # Don't create Goose instance in this method, only verify importability
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
                import importlib.util
                return importlib.util.find_spec(library_name) is not None
        except ImportError:
            self.logger.warning(f"库{library_name}未安装或无法导入")
            return False
        except Exception as e:
            self.logger.warning(f"库{library_name}检查时出现问题: {str(e)}")
            return False

    def get_extracted_content(self) -> Dict[str, Any]:
        """Get extracted content and marked errors for frontend display."""
        return self.extracted_content