"""
Sitemap XML处理工具函数

该模块提供处理XML sitemap文件的核心功能，包括：
- XML文件解析和URL提取
- CSV/Excel文件中URL的提取
- 多个sitemap文件的合并
- URL层次结构的创建
- Sitemap验证和可视化数据生成

迁移自: utils/xml_helpers.py
作者: 项目团队
更新时间: 2024
"""

import os
import xml.etree.ElementTree as ET
import urllib.parse
from typing import List, Dict, Any, Tuple, Set, Optional
import pandas as pd
import re


def parse_xml_file(file_path: str) -> Tuple[ET.Element, List[str]]:
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    # 去除命名空间以简化处理
    for elem in root.iter():
        if '}' in elem.tag:
            elem.tag = elem.tag.split('}', 1)[1]
    
    urls = extract_urls_from_sitemap(root)
    return root, urls


def extract_urls_from_sitemap(root: ET.Element) -> List[str]:
    urls = []
    
    # 处理urlset（常规sitemap）
    if root.tag == 'urlset':
        for url_elem in root.findall('.//url'):
            loc_elem = url_elem.find('loc')
            if loc_elem is not None and loc_elem.text:
                urls.append(loc_elem.text.strip())
    
    # 处理sitemapindex（sitemap索引）
    elif root.tag == 'sitemapindex':
        for sitemap_elem in root.findall('.//sitemap'):
            loc_elem = sitemap_elem.find('loc')
            if loc_elem is not None and loc_elem.text:
                # 这些是引用的其他sitemap文件URL，不是网站页面URL
                # 我们将它们存储，但不计入页面URL列表
                pass
    
    return urls


def extract_urls_from_csv(df: pd.DataFrame, url_column: str) -> List[str]:
    urls = []
    
    if url_column in df.columns:
        # 提取URL列中的所有值
        for url in df[url_column]:
            if pd.notna(url) and isinstance(url, str) and url.strip():
                # 验证是否为有效URL
                if url.startswith(('http://', 'https://')):
                    urls.append(url.strip())
                elif not url.startswith(('javascript:', 'mailto:', 'tel:')):
                    # 尝试补全URL
                    if url.startswith('/'):
                        # 相对URL，但我们没有基础URL，只能存储
                        urls.append(url.strip())
                    else:
                        # 可能缺少协议
                        urls.append(f"https://{url.strip()}")
    
    return urls


def merge_sitemaps(sitemaps: List[Dict[str, Any]], filename_mapping: Dict[str, bytes]) -> Set[str]:
    all_urls = set()
    queue = list(sitemaps)  # 使用队列处理嵌套的sitemap
    processed_files = set()
    
    while queue:
        sitemap = queue.pop(0)
        
        # 跳过已处理的文件
        if sitemap["filename"] in processed_files:
            continue
        
        processed_files.add(sitemap["filename"])
        
        # 处理XML sitemap
        if sitemap["type"] == "xml":
            # 添加直接URL
            if "urls" in sitemap:
                all_urls.update(sitemap["urls"])
            
            # 处理引用的sitemap
            if sitemap.get("is_sitemap_index") and "referenced_files" in sitemap:
                for ref_file in sitemap["referenced_files"]:
                    # 检查是否有这个文件的映射
                    if ref_file in filename_mapping:
                        try:
                            # 解析引用的sitemap
                            with open(sitemap["path"], 'rb') as f:
                                # 创建内存中的引用sitemap对象
                                ref_sitemap = {
                                    "filename": ref_file,
                                    "path": sitemap["path"],  # 复用原文件路径
                                    "type": "xml"
                                }
                                
                                # 解析内容
                                tree = ET.parse(BytesIO(filename_mapping[ref_file]))
                                root = tree.getroot()
                                
                                # 去除命名空间
                                for elem in root.iter():
                                    if '}' in elem.tag:
                                        elem.tag = elem.tag.split('}', 1)[1]
                                
                                ref_sitemap["root"] = root
                                ref_sitemap["urls"] = extract_urls_from_sitemap(root)
                                ref_sitemap["is_sitemap_index"] = root.tag == 'sitemapindex'
                                
                                # 添加到队列
                                queue.append(ref_sitemap)
                        except Exception as e:
                            print(f"Error processing referenced sitemap {ref_file}: {str(e)}")
        
        # 处理CSV文件
        elif sitemap["type"] == "csv" and "urls" in sitemap:
            all_urls.update(sitemap["urls"])
    
    return all_urls


def create_url_hierarchy(urls: Set[str]) -> Dict[str, Any]:
    hierarchy = {}
    
    for url in urls:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc
        
        # 确保域名节点存在
        if domain not in hierarchy:
            hierarchy[domain] = {}
        
        # 分解路径
        path_parts = [p for p in parsed.path.split('/') if p]
        
        # 在层次结构中添加路径
        current_level = hierarchy[domain]
        for part in path_parts:
            if part not in current_level:
                current_level[part] = {}
            current_level = current_level[part]
        
        # 标记叶子节点
        if not path_parts:
            hierarchy[domain][''] = 1
    
    return hierarchy


def validate_sitemap(content: bytes) -> Dict[str, Any]:
    try:
        root = ET.fromstring(content)
        
        # 检查根元素
        if root.tag.endswith(('urlset', 'sitemapindex')):
            # 基本结构正确
            is_index = root.tag.endswith('sitemapindex')
            
            # 计数
            url_count = 0
            sitemap_count = 0
            
            if is_index:
                for sitemap in root.findall('.//*[local-name()="sitemap"]'):
                    sitemap_count += 1
            else:
                for url in root.findall('.//*[local-name()="url"]'):
                    url_count += 1
            
            return {
                "valid": True,
                "is_index": is_index,
                "url_count": url_count,
                "sitemap_count": sitemap_count
            }
        else:
            return {
                "valid": False,
                "error": f"Root element should be urlset or sitemapindex, found {root.tag}"
            }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }


def generate_url_tree(urls: Set[str]) -> Dict[str, Any]:
    tree = {"name": "root", "children": []}
    domains = {}
    
    for url in urls:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc
        
        # 确保域名节点存在
        if domain not in domains:
            domains[domain] = {
                "name": domain,
                "children": []
            }
        
        # 分解路径
        path_parts = [p for p in parsed.path.split('/') if p]
        
        # 处理查询参数
        if parsed.query:
            path_parts.append(f"?{parsed.query}")
        
        # 在树中添加路径
        current_level = domains[domain]["children"]
        current_path = ""
        
        for i, part in enumerate(path_parts):
            current_path += f"/{part}"
            
            # 查找是否已存在此路径
            found = False
            for child in current_level:
                if child["name"] == part:
                    found = True
                    current_level = child["children"]
                    break
            
            if not found:
                new_node = {
                    "name": part,
                    "path": current_path,
                    "children": [] if i < len(path_parts) - 1 else None
                }
                current_level.append(new_node)
                if i < len(path_parts) - 1:
                    current_level = new_node["children"]
    
    # 将域名添加到根节点
    for domain_data in domains.values():
        tree["children"].append(domain_data)
    
    return tree


def normalize_sitemap_url(url: str, base_url: Optional[str] = None) -> str:
    if not url:
        return ""
    
    url = url.strip()
    
    # 如果已经是完整URL，直接返回
    if url.startswith(('http://', 'https://')):
        return url
    
    # 处理相对URL
    if base_url and url.startswith('/'):
        parsed_base = urllib.parse.urlparse(base_url)
        return f"{parsed_base.scheme}://{parsed_base.netloc}{url}"
    
    # 处理没有协议的URL
    if '.' in url and not url.startswith('/'):
        return f"https://{url}"
    
    return url


def extract_sitemap_metadata(root: ET.Element) -> Dict[str, Any]:
    metadata = {
        "type": root.tag,
        "urls_with_metadata": [],
        "total_urls": 0,
        "has_lastmod": False,
        "has_changefreq": False,
        "has_priority": False
    }
    
    if root.tag == 'urlset':
        url_elements = root.findall('.//url')
        metadata["total_urls"] = len(url_elements)
        
        for url_elem in url_elements:
            url_data = {}
            
            # 提取URL
            loc_elem = url_elem.find('loc')
            if loc_elem is not None and loc_elem.text:
                url_data["loc"] = loc_elem.text.strip()
            
            # 提取最后修改时间
            lastmod_elem = url_elem.find('lastmod')
            if lastmod_elem is not None and lastmod_elem.text:
                url_data["lastmod"] = lastmod_elem.text.strip()
                metadata["has_lastmod"] = True
            
            # 提取更新频率
            changefreq_elem = url_elem.find('changefreq')
            if changefreq_elem is not None and changefreq_elem.text:
                url_data["changefreq"] = changefreq_elem.text.strip()
                metadata["has_changefreq"] = True
            
            # 提取优先级
            priority_elem = url_elem.find('priority')
            if priority_elem is not None and priority_elem.text:
                url_data["priority"] = priority_elem.text.strip()
                metadata["has_priority"] = True
            
            if url_data:
                metadata["urls_with_metadata"].append(url_data)
    
    return metadata


class BytesIO:
    def __init__(self, content: bytes):
        self.content = content
        self._position = 0
    
    def read(self, size: int = -1) -> bytes:
        if size == -1:
            result = self.content[self._position:]
            self._position = len(self.content)
        else:
            result = self.content[self._position:self._position + size]
            self._position += len(result)
        
        return result
    
    def seek(self, position: int) -> None:
        self._position = max(0, min(position, len(self.content)))
    
    def tell(self) -> int:
        return self._position


# 兼容性别名，保持向后兼容
parse_xml = parse_xml_file
extract_urls = extract_urls_from_sitemap
merge_sitemap_files = merge_sitemaps
create_hierarchy = create_url_hierarchy
validate_xml = validate_sitemap