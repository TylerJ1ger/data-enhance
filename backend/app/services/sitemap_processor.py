import os
import tempfile
from typing import List, Dict, Any, Optional, Set, Tuple
import xml.etree.ElementTree as ET
import urllib.parse
import re
from fastapi import UploadFile
import pandas as pd
import requests
from io import BytesIO
import copy

from app.utils.xml_helpers import (
    parse_xml_file,
    extract_urls_from_sitemap,
    merge_sitemaps,
    create_url_hierarchy,
    validate_sitemap,
    extract_urls_from_csv
)

class SitemapProcessor:
    def __init__(self):
        self.sitemaps = []  # 存储上传的sitemap文件信息
        self.merged_urls = set()  # 合并后的所有URL
        self.filtered_urls = set()  # 筛选后的URLs集合，初始为空
        self.url_hierarchy = {}  # URL的分层结构
        self.filename_mapping = {}  # 文件名到内容的映射，用于处理引用
    
    async def process_files(self, files: List[UploadFile]) -> Dict[str, Any]:
        """处理上传的Sitemap文件"""
        sitemap_files = []
        file_stats = []
        
        # 清空之前的数据
        self.sitemaps = []
        self.merged_urls = set()
        self.filtered_urls = set()  # 重置筛选后的URLs
        self.url_hierarchy = {}
        self.filename_mapping = {}
        
        for file in files:
            # 创建临时文件存储上传内容
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                # 写入上传文件内容到临时文件
                content = await file.read()
                temp_file.write(content)
                temp_file.flush()
                
                # 解析文件
                file_info = {
                    "filename": file.filename,
                    "path": temp_file.name,
                    "content": content,
                }

                # 根据文件类型处理
                if file.filename.lower().endswith('.xml'):
                    try:
                        # 解析XML
                        root, urls = parse_xml_file(temp_file.name)
                        file_info["type"] = "xml"
                        file_info["root"] = root
                        file_info["urls"] = urls
                        file_info["is_sitemap_index"] = root.tag.endswith('sitemapindex')
                        
                        # 存储文件名与内容的映射关系，用于处理引用
                        base_filename = os.path.basename(file.filename)
                        self.filename_mapping[base_filename] = content
                        
                        # 如果是sitemap索引，提取引用的sitemap文件
                        if file_info["is_sitemap_index"]:
                            for child in root.findall('.//*[local-name()="sitemap"]'):
                                loc = child.find('.//*[local-name()="loc"]')
                                if loc is not None:
                                    sitemap_url = loc.text.strip()
                                    # 提取引用的sitemap文件名
                                    parsed_url = urllib.parse.urlparse(sitemap_url)
                                    referenced_file = os.path.basename(parsed_url.path)
                                    file_info["referenced_files"] = file_info.get("referenced_files", []) + [referenced_file]
                    except Exception as e:
                        file_info["error"] = str(e)
                        file_info["type"] = "error"
                elif file.filename.lower().endswith(('.csv', '.xlsx')):
                    try:
                        # 解析CSV/XLSX
                        df = pd.read_csv(temp_file.name) if file.filename.lower().endswith('.csv') else pd.read_excel(temp_file.name)
                        file_info["type"] = "csv"
                        
                        # 检查是否包含URL列
                        url_column = None
                        possible_url_columns = ["Address", "URL", "Loc", "Location", "Link", "Page URL"]
                        for col in possible_url_columns:
                            if col in df.columns:
                                url_column = col
                                break
                        
                        if url_column:
                            file_info["urls"] = extract_urls_from_csv(df, url_column)
                        else:
                            file_info["error"] = "No URL column found in CSV/XLSX file"
                    except Exception as e:
                        file_info["error"] = str(e)
                        file_info["type"] = "error"
                else:
                    file_info["type"] = "unsupported"
                
                sitemap_files.append(file_info)
                
                # 收集统计信息
                stats = {
                    "filename": file.filename,
                    "type": file_info.get("type", "unknown"),
                    "url_count": len(file_info.get("urls", [])),
                    "is_sitemap_index": file_info.get("is_sitemap_index", False)
                }
                file_stats.append(stats)
                
                # 关闭并保留临时文件以供后续处理
                temp_file.close()
        
        # 存储处理后的文件
        self.sitemaps = sitemap_files
        
        # 合并所有URL
        self.merged_urls = merge_sitemaps(self.sitemaps, self.filename_mapping)
        
        # 初始化筛选后的URLs为所有URLs
        self.filtered_urls = self.merged_urls.copy() 
        
        # 生成URL层次结构
        self.url_hierarchy = create_url_hierarchy(self.merged_urls)
        
        # 返回处理结果
        return {
            "file_stats": file_stats,
            "total_urls": len(self.merged_urls),
            "top_level_domains": self._get_top_level_domains(),
            "url_structure": self._get_structure_summary()
        }
    
    def _get_top_level_domains(self) -> List[str]:
        """获取所有URL中的顶级域名"""
        domains = set()
        for url in self.merged_urls:
            parsed = urllib.parse.urlparse(url)
            if parsed.netloc:
                domains.add(parsed.netloc)
        return list(domains)
    
    def _get_structure_summary(self) -> Dict[str, int]:
        """获取URL结构的摘要信息"""
        depth_counts = {}
        for url in self.merged_urls:
            parsed = urllib.parse.urlparse(url)
            path = parsed.path
            # 计算URL路径的深度（/分隔的层级数）
            depth = len([p for p in path.split('/') if p])
            depth_counts[depth] = depth_counts.get(depth, 0) + 1
        return depth_counts
    
    def get_visualization_data(self, visualization_type: str = "tree", max_depth: int = 3, max_nodes: int = 500) -> Dict[str, Any]:
        """获取用于可视化的数据结构，增加深度和最大节点数限制
        
        支持的可视化类型:
        - tree: 标准树形图
        - tree-radial: 径向树形图
        - graph-label-overlap: 标签网络图
        - graph-circular-layout: 环形布局图
        - graph-webkit-dep: 依赖关系图
        - graph-npm: 箭头流向图
        """
        # 判断可视化类型，将前端支持的所有类型映射到后端处理函数
        if visualization_type.startswith("tree"):
            # 所有树形图类型都使用相同的数据结构，前端会处理不同的布局
            data = self._get_tree_visualization_data()
            # 如果节点数超过限制，执行数据简化
            if self._count_nodes(data) > max_nodes:
                data = self._simplify_tree_data(data, max_depth, max_nodes)
            return data
        elif visualization_type.startswith("graph"):
            # 所有图形图表类型都使用相同的数据结构，前端会处理不同的布局
            raw_data = self._get_tree_visualization_data()
            # 先简化树形数据，再转换为图形数据
            if self._count_nodes(raw_data) > max_nodes:
                simplified_data = self._simplify_tree_data(raw_data, max_depth, max_nodes)
                return self._get_graph_data_from_tree(simplified_data)
            else:
                return self._get_graph_visualization_data()
        else:
            # 默认返回树形图数据
            data = self._get_tree_visualization_data()
            if self._count_nodes(data) > max_nodes:
                data = self._simplify_tree_data(data, max_depth, max_nodes)
            return data
    
    def get_filtered_visualization_data(self, visualization_type: str = "tree", urls: List[str] = None, max_depth: int = 3, max_nodes: int = 500) -> Dict[str, Any]:
        """获取筛选后的URL的可视化数据，增加深度和最大节点数限制
        
        支持的可视化类型:
        - tree: 标准树形图
        - tree-radial: 径向树形图
        - graph-label-overlap: 标签网络图
        - graph-circular-layout: 环形布局图
        - graph-webkit-dep: 依赖关系图
        - graph-npm: 箭头流向图
        """
        if not urls or len(urls) == 0:
            # 如果没有提供URLs，返回所有URL的可视化
            return self.get_visualization_data(visualization_type, max_depth, max_nodes)
        
        # 将URL列表转换为集合以进行可视化处理
        url_set = set(urls)
        
        # 判断可视化类型，将前端支持的所有类型映射到后端处理函数
        if visualization_type.startswith("tree"):
            # 所有树形图类型都使用相同的数据结构，前端会处理不同的布局
            data = self._get_filtered_tree_visualization_data(url_set)
            # 如果节点数超过限制，执行数据简化
            if self._count_nodes(data) > max_nodes:
                data = self._simplify_tree_data(data, max_depth, max_nodes)
            return data
        elif visualization_type.startswith("graph"):
            # 所有图形图表类型都使用相同的数据结构，前端会处理不同的布局
            raw_data = self._get_filtered_tree_visualization_data(url_set)
            # 先简化树形数据，再转换为图形数据
            if self._count_nodes(raw_data) > max_nodes:
                simplified_data = self._simplify_tree_data(raw_data, max_depth, max_nodes)
                return self._get_graph_data_from_tree(simplified_data)
            else:
                return self._get_filtered_graph_visualization_data(url_set)
        else:
            # 默认返回树形图数据
            data = self._get_filtered_tree_visualization_data(url_set)
            if self._count_nodes(data) > max_nodes:
                data = self._simplify_tree_data(data, max_depth, max_nodes)
            return data
    
    def _get_tree_visualization_data(self) -> Dict[str, Any]:
        """获取树形结构的可视化数据"""
        # 从URL层次结构构建树
        tree_data = {
            "name": "root",
            "children": []
        }
        
        # 按照域名分组
        domains = {}
        for url in self.merged_urls:
            parsed = urllib.parse.urlparse(url)
            domain = parsed.netloc
            if domain not in domains:
                domains[domain] = {
                    "name": domain,
                    "children": []
                }
            
            # 分解路径
            path_parts = [p for p in parsed.path.split('/') if p]
            
            # 将此URL添加到相应的域名中
            current_level = domains[domain]["children"]
            current_path = ""
            
            # 构建目录结构
            for i, part in enumerate(path_parts):
                current_path += f"/{part}"
                
                # 检查这个路径是否已经存在
                exists = False
                for node in current_level:
                    if node["name"] == part:
                        exists = True
                        # 确保 node 有 children 键，并且它不是 None
                        if "children" in node and node["children"] is not None:
                            current_level = node["children"]
                        else:
                            # 如果节点标记为叶子节点，但现在需要添加子节点，则更新它
                            node["children"] = []
                            node["isLeaf"] = False
                            current_level = node["children"]
                        break
                
                if not exists:
                    new_node = {
                        "name": part,
                        "path": f"{domain}{current_path}",
                        "children": [] if i < len(path_parts) - 1 else None,
                        "isLeaf": i == len(path_parts) - 1
                    }
                    current_level.append(new_node)
                    if new_node["children"] is not None:
                        current_level = new_node["children"]
                    else:
                        # 如果是叶子节点，不再继续迭代
                        break
        
        # 特殊处理：如果只有一个域名，直接返回该域名节点，不显示root
        if len(domains) == 1:
            domain_node = list(domains.values())[0]
            return domain_node
        
        # 将所有域名添加为根节点的子节点
        tree_data["children"] = list(domains.values())
        
        return tree_data
    
    def _get_filtered_tree_visualization_data(self, urls: Set[str]) -> Dict[str, Any]:
        """获取筛选后URL的树形结构可视化数据"""
        # 从URL层次结构构建树
        tree_data = {
            "name": "root",
            "children": []
        }
        
        # 按照域名分组
        domains = {}
        for url in urls:
            parsed = urllib.parse.urlparse(url)
            domain = parsed.netloc
            if domain not in domains:
                domains[domain] = {
                    "name": domain,
                    "children": []
                }
            
            # 分解路径
            path_parts = [p for p in parsed.path.split('/') if p]
            
            # 将此URL添加到相应的域名中
            current_level = domains[domain]["children"]
            current_path = ""
            
            # 构建目录结构
            for i, part in enumerate(path_parts):
                current_path += f"/{part}"
                
                # 检查这个路径是否已经存在
                exists = False
                for node in current_level:
                    if node["name"] == part:
                        exists = True
                        # 确保 node 有 children 键，并且它不是 None
                        if "children" in node and node["children"] is not None:
                            current_level = node["children"]
                        else:
                            # 如果节点标记为叶子节点，但现在需要添加子节点，则更新它
                            node["children"] = []
                            node["isLeaf"] = False
                            current_level = node["children"]
                        break
                
                if not exists:
                    new_node = {
                        "name": part,
                        "path": f"{domain}{current_path}",
                        "children": [] if i < len(path_parts) - 1 else None,
                        "isLeaf": i == len(path_parts) - 1
                    }
                    current_level.append(new_node)
                    if new_node["children"] is not None:
                        current_level = new_node["children"]
                    else:
                        # 如果是叶子节点，不再继续迭代
                        break
        
        # 特殊处理：如果只有一个域名，直接返回该域名节点，不显示root
        if len(domains) == 1:
            domain_node = list(domains.values())[0]
            return domain_node
        
        # 将所有域名添加为根节点的子节点
        tree_data["children"] = list(domains.values())
        
        return tree_data
    
    def _get_graph_visualization_data(self) -> Dict[str, Any]:
        """获取图形结构的可视化数据"""
        nodes = []
        links = []
        
        # 为每个URL创建节点
        url_to_id = {}
        id_counter = 0
        
        for url in self.merged_urls:
            parsed = urllib.parse.urlparse(url)
            domain = parsed.netloc
            path = parsed.path
            
            # 域名节点
            if domain not in url_to_id:
                url_to_id[domain] = id_counter
                nodes.append({
                    "id": id_counter,
                    "name": domain,
                    "category": 0,  # 域名类别
                    "symbolSize": 30  # 较大的节点
                })
                id_counter += 1
            
            # 分解路径并创建每个部分的节点
            current_path = ""
            parent_id = url_to_id[domain]
            
            path_parts = [p for p in path.split('/') if p]
            for i, part in enumerate(path_parts):
                current_path += f"/{part}"
                full_path = f"{domain}{current_path}"
                
                if full_path not in url_to_id:
                    url_to_id[full_path] = id_counter
                    nodes.append({
                        "id": id_counter,
                        "name": part,
                        "category": 1,  # 路径类别
                        "symbolSize": 20 if i == len(path_parts) - 1 else 15  # 页面节点大一些
                    })
                    
                    # 创建与父节点的连接
                    links.append({
                        "source": parent_id,
                        "target": id_counter
                    })
                    
                    id_counter += 1
                
                parent_id = url_to_id[full_path]
        
        return {
            "nodes": nodes,
            "links": links
        }
    
    def _get_graph_data_from_tree(self, tree_data: Dict[str, Any]) -> Dict[str, Any]:
        """从树形数据生成图形数据结构"""
        nodes = []
        links = []
        id_counter = 0
        node_map = {}  # 用于映射节点路径到ID
        
        # 递归处理树形节点
        def process_node(node, parent_id=None, category=0):
            nonlocal id_counter
            
            if not node:
                return
            
            # 生成当前节点ID
            current_id = id_counter
            id_counter += 1
            
            # 保存节点路径到ID的映射
            path = node.get("path", node.get("name", f"node_{current_id}"))
            node_map[path] = current_id
            
            # 添加节点
            nodes.append({
                "id": current_id,
                "name": node.get("name", "Unnamed"),
                "path": path,
                "category": category,
                "symbolSize": 30 if category == 0 else (20 if node.get("isLeaf", False) else 15)
            })
            
            # 如果有父节点，创建连接
            if parent_id is not None:
                links.append({
                    "source": parent_id,
                    "target": current_id
                })
            
            # 处理子节点
            if node.get("children") and isinstance(node["children"], list):
                for child in node["children"]:
                    process_node(child, current_id, 1)
        
        # 开始处理根节点
        if "name" in tree_data:
            # 单个树
            process_node(tree_data, None, 0)
        elif "children" in tree_data and isinstance(tree_data["children"], list):
            # 多个根节点
            for child in tree_data["children"]:
                process_node(child, None, 0)
        
        return {
            "nodes": nodes,
            "links": links
        }
    
    def _get_filtered_graph_visualization_data(self, urls: Set[str]) -> Dict[str, Any]:
        """获取筛选后URL的图形结构可视化数据"""
        nodes = []
        links = []
        
        # 为每个URL创建节点
        url_to_id = {}
        id_counter = 0
        
        for url in urls:
            parsed = urllib.parse.urlparse(url)
            domain = parsed.netloc
            path = parsed.path
            
            # 域名节点
            if domain not in url_to_id:
                url_to_id[domain] = id_counter
                nodes.append({
                    "id": id_counter,
                    "name": domain,
                    "category": 0,  # 域名类别
                    "symbolSize": 30  # 较大的节点
                })
                id_counter += 1
            
            # 分解路径并创建每个部分的节点
            current_path = ""
            parent_id = url_to_id[domain]
            
            path_parts = [p for p in path.split('/') if p]
            for i, part in enumerate(path_parts):
                current_path += f"/{part}"
                full_path = f"{domain}{current_path}"
                
                if full_path not in url_to_id:
                    url_to_id[full_path] = id_counter
                    nodes.append({
                        "id": id_counter,
                        "name": part,
                        "category": 1,  # 路径类别
                        "symbolSize": 20 if i == len(path_parts) - 1 else 15  # 页面节点大一些
                    })
                    
                    # 创建与父节点的连接
                    links.append({
                        "source": parent_id,
                        "target": id_counter
                    })
                    
                    id_counter += 1
                
                parent_id = url_to_id[full_path]
        
        return {
            "nodes": nodes,
            "links": links
        }
    
    def generate_merged_sitemap(self, format: str = "xml") -> bytes:
        """生成合并后的Sitemap文件"""
        if format.lower() == "xml":
            # 创建XML sitemap
            root = ET.Element("{http://www.sitemaps.org/schemas/sitemap/0.9}urlset")
            root.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
            
            for url in sorted(self.merged_urls):
                url_elem = ET.SubElement(root, "url")
                loc = ET.SubElement(url_elem, "loc")
                loc.text = url
                
                # 可以添加其他元素如lastmod, changefreq, priority
                # 这里简化处理
            
            # 转换为字符串
            xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding='utf-8').decode('utf-8')
            return xml_str.encode('utf-8')
        
        elif format.lower() == "csv":
            # 创建CSV格式
            csv_data = "URL\n"
            for url in sorted(self.merged_urls):
                csv_data += f"{url}\n"
            return csv_data.encode('utf-8')
        
        else:
            return b"Unsupported format"
    
    def filter_urls(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """根据筛选条件过滤URL"""
        filtered_urls = set()
        
        domain_filter = filters.get("domain")
        path_filter = filters.get("path")
        paths_filter = filters.get("paths", [])  # 新增多路径筛选支持
        path_filter_type = filters.get("path_filter_type", "contains")
        depth_filter = filters.get("depth")
        
        # 如果同时提供了旧的path和新的paths，将旧的path添加到paths中
        if path_filter and path_filter not in paths_filter:
            paths_filter.append(path_filter)
        
        # 确保paths_filter是一个列表，即使是空的
        if paths_filter is None:
            paths_filter = []
        
        # 预处理路径，过滤空路径
        paths_filter = [p for p in paths_filter if p and p.strip()]
        
        # 如果没有有效的筛选条件，返回所有URL
        if not domain_filter and not paths_filter and depth_filter is None:
            filtered_urls = self.merged_urls.copy()
            self.filtered_urls = filtered_urls
            filtered_hierarchy = create_url_hierarchy(filtered_urls)
            return {
                "filtered_urls": list(filtered_urls),
                "total_filtered": len(filtered_urls),
                "url_hierarchy": filtered_hierarchy
            }
        
        for url in self.merged_urls:
            parsed = urllib.parse.urlparse(url)
            
            # 域名筛选
            if domain_filter and domain_filter not in parsed.netloc:
                continue
            
            # 深度筛选 - 修改此处
            if depth_filter is not None:
                depth = len([p for p in parsed.path.split('/') if p])
                if depth > depth_filter:  # 只过滤掉深度大于指定值的URL
                    continue
            
            # 路径筛选 - 支持多路径
            if paths_filter:
                # 默认不匹配任何路径
                path_matched = False
                
                for path in paths_filter:
                    if not path:  # 跳过空路径
                        continue
                    
                    # 确保路径以斜杠开头，便于更精确的匹配
                    if not path.startswith('/'):
                        path = '/' + path
                    
                    # 根据筛选类型进行匹配
                    if path_filter_type == "contains":
                        # 使用更精确的匹配方式
                        if path in parsed.path:
                            path_matched = True
                            break  # 只需匹配任一路径即可
                    elif path_filter_type == "not_contains":
                        # 对于not_contains类型，一旦有一个路径包含在URL中，就不匹配
                        if path in parsed.path:
                            path_matched = False
                            break  # 出现一个包含的路径就排除
                        else:
                            path_matched = True  # 至少有一个路径不包含
                
                # 如果没有匹配到任何路径，则跳过该URL
                if not path_matched:
                    continue
            
            filtered_urls.add(url)
        
        # 保存筛选后的URLs
        self.filtered_urls = filtered_urls
        
        # 更新URL层次结构
        filtered_hierarchy = create_url_hierarchy(filtered_urls)
        
        return {
            "filtered_urls": list(filtered_urls),
            "total_filtered": len(filtered_urls),
            "url_hierarchy": filtered_hierarchy
        }
    
    def get_common_paths(self, min_count: int = 5) -> List[str]:
        """提取常见路径，至少出现min_count次的路径"""
        if not self.merged_urls:
            return []
        
        path_counts = {}
        
        for url in self.merged_urls:
            parsed = urllib.parse.urlparse(url)
            path = parsed.path
            
            # 分割路径并逐级构建
            parts = [p for p in path.split('/') if p]
            current_path = ""
            
            for part in parts:
                current_path += f"/{part}"
                path_counts[current_path] = path_counts.get(current_path, 0) + 1
        
        # 筛选常见路径
        common_paths = [
            path for path, count in path_counts.items() 
            if count >= min_count
        ]
        
        # 按出现频率排序
        common_paths.sort(key=lambda p: path_counts[p], reverse=True)
        
        return common_paths[:50]  # 限制返回数量
    
    def analyze_sitemap(self) -> Dict[str, Any]:
        """分析Sitemap的结构和特性"""
        if not self.merged_urls:
            return {"error": "No URLs to analyze"}
        
        # 分析URL长度
        url_lengths = [len(url) for url in self.merged_urls]
        avg_url_length = sum(url_lengths) / len(url_lengths) if url_lengths else 0
        
        # 分析URL深度
        depths = []
        extensions = {}
        url_patterns = {}
        
        for url in self.merged_urls:
            parsed = urllib.parse.urlparse(url)
            
            # 计算深度
            path = parsed.path
            depth = len([p for p in path.split('/') if p])
            depths.append(depth)
            
            # 计算扩展名
            if '.' in path.split('/')[-1]:
                ext = path.split('/')[-1].split('.')[-1].lower()
                extensions[ext] = extensions.get(ext, 0) + 1
            
            # 识别URL模式
            parts = [p for p in path.split('/') if p]
            for i, part in enumerate(parts):
                # 检测参数模式 (如 product-123, product-456)
                if i > 0 and parts[i-1] in url_patterns:
                    pattern = re.match(r'([a-zA-Z-]+)-\d+', part)
                    if pattern:
                        base = pattern.group(1)
                        key = f"{parts[i-1]}/{base}-*"
                        url_patterns[key] = url_patterns.get(key, 0) + 1
                
                # 直接记录路径部分
                if i < len(parts) - 1:  # 不包括最后一个部分（可能是文件名）
                    url_patterns[part] = url_patterns.get(part, 0) + 1
        
        avg_depth = sum(depths) / len(depths) if depths else 0
        
        # 返回分析结果
        return {
            "total_urls": len(self.merged_urls),
            "avg_url_length": avg_url_length,
            "avg_depth": avg_depth,
            "max_depth": max(depths) if depths else 0,
            "depth_distribution": {depth: depths.count(depth) for depth in set(depths)},
            "extensions": extensions,
            "top_url_patterns": sorted(url_patterns.items(), key=lambda x: x[1], reverse=True)[:10]
        }
    
    def analyze_url_structure(self, detailed: bool = False) -> Dict[str, Any]:
        """分析URL的结构并提供可视化数据"""
        if not self.merged_urls:
            return {"error": "No URLs to analyze"}
        
        # 基础分析
        domains = {}
        path_segments = {}
        parameters = {}
        
        for url in self.merged_urls:
            parsed = urllib.parse.urlparse(url)
            
            # 域名分析
            domain = parsed.netloc
            domains[domain] = domains.get(domain, 0) + 1
            
            # 路径段分析
            path_parts = [p for p in parsed.path.split('/') if p]
            for i, part in enumerate(path_parts):
                depth_key = f"depth_{i+1}"
                if depth_key not in path_segments:
                    path_segments[depth_key] = {}
                path_segments[depth_key][part] = path_segments[depth_key].get(part, 0) + 1
            
            # 参数分析
            if parsed.query:
                query_params = urllib.parse.parse_qs(parsed.query)
                for param, values in query_params.items():
                    if param not in parameters:
                        parameters[param] = 0
                    parameters[param] += 1
        
        # 基础结果
        result = {
            "total_urls": len(self.merged_urls),
            "domains": domains,
            "top_path_segments": {
                depth: sorted(segments.items(), key=lambda x: x[1], reverse=True)[:5] 
                for depth, segments in path_segments.items()
            },
            "path_segment_counts": {
                depth: len(segments) for depth, segments in path_segments.items()
            },
            "parameters": sorted(parameters.items(), key=lambda x: x[1], reverse=True)[:10],
        }
        
        # 详细分析
        if detailed:
            try:
                # URL模式分析
                patterns = self._analyze_url_patterns()
                result["url_patterns"] = patterns
                
                # 层次结构可视化数据
                if self.merged_urls:  # 确保有URL数据
                    vis_data = self._get_tree_visualization_data()
                    # 如果节点数过多，简化数据
                    if self._count_nodes(vis_data) > 500:
                        vis_data = self._simplify_tree_data(vis_data, 3, 500)
                    result["visualization_data"] = vis_data
            except Exception as e:
                # 记录详细错误信息
                import traceback
                error_details = traceback.format_exc()
                result["error"] = f"Error generating detailed analysis: {str(e)}"
                result["error_details"] = error_details
        
        return result
    
    def _analyze_url_patterns(self) -> List[Dict[str, Any]]:
        """分析URL模式，识别常见结构"""
        if not self.merged_urls:
            return []
        
        patterns = []
        url_groups = {}
        
        for url in self.merged_urls:
            parsed = urllib.parse.urlparse(url)
            path = parsed.path
            
            # 替换数字为 {id}
            pattern = re.sub(r'/\d+(?=/|$)', '/{id}', path)
            
            # 替换像 product-123 这样的模式为 product-{id}
            pattern = re.sub(r'([-_])\d+(?=/|$)', r'\1{id}', pattern)
            
            # 归类
            if pattern not in url_groups:
                url_groups[pattern] = []
            url_groups[pattern].append(url)
        
        # 过滤和排序模式
        for pattern, urls in url_groups.items():
            if len(urls) >= 2:  # 至少出现两次才考虑是模式
                patterns.append({
                    "pattern": pattern,
                    "count": len(urls),
                    "examples": urls[:3]
                })
        
        # 按出现频率排序
        patterns.sort(key=lambda x: x["count"], reverse=True)
        
        return patterns
    
    def _count_nodes(self, node: Dict[str, Any]) -> int:
        """递归计算节点总数"""
        if not node:
            return 0
        
        count = 1  # 当前节点
        
        if "children" in node and node["children"]:
            for child in node["children"]:
                count += self._count_nodes(child)
        
        return count
    
    def _is_hash_like(self, name: str) -> bool:
        """检查节点名称是否看起来像哈希值"""
        # 识别常见的哈希格式: 长度超过12且包含随机字符
        if not name or not isinstance(name, str):
            return False
            
        return (len(name) >= 12 and 
                re.match(r'^[a-zA-Z0-9_-]+$', name) and
                # 增加熵检测 - 如果有连续的字母和数字则更可能是哈希
                re.search(r'[0-9]{2,}', name) and 
                re.search(r'[a-zA-Z]{2,}', name))
    
    def _simplify_tree_data(self, data: Dict[str, Any], max_depth: int = 3, max_nodes: int = 500) -> Dict[str, Any]:
        """简化树形数据，优先保留重要节点，限制深度，处理哈希路径"""
        # 深拷贝避免修改原始数据
        result = copy.deepcopy(data)
        
        # 如果节点数已经在限制范围内，直接返回
        current_count = self._count_nodes(result)
        if current_count <= max_nodes:
            return result
        
        # 递归处理节点树，限制深度和处理哈希路径
        self._process_node_tree(result, 0, max_depth, max_nodes)
        
        return result
    
    def _process_node_tree(self, node: Dict[str, Any], current_depth: int = 0, max_depth: int = 3, max_nodes: int = 500) -> int:
        """递归处理节点树，返回处理后的节点计数"""
        if not node:
            return 0
            
        # 如果没有子节点或已达到最大深度，返回1（当前节点）
        if not node.get("children") or current_depth >= max_depth:
            # 如果超过最大深度，删除children以减小数据量
            if current_depth >= max_depth and "children" in node and node["children"]:
                # 保存子节点数量以便显示
                child_count = len(node["children"])
                node["name"] = f"{node['name']} (+{child_count})"
                node["children"] = None
                node["isLeaf"] = True
            return 1
        
        # 如果子节点中有很多看起来像哈希值的节点，只保留部分
        hash_children = [c for c in node["children"] if self._is_hash_like(c.get("name", ""))]
        if len(hash_children) > 5:
            # 保留的非哈希值节点
            normal_children = [c for c in node["children"] if not self._is_hash_like(c.get("name", ""))]
            
            # 选择5个哈希值节点
            sample_hash_children = hash_children[:5]
            
            # 创建一个"更多..."节点
            more_node = {
                "name": f"更多 ({len(hash_children) - 5} 个)",
                "path": f"{node.get('path', '')}/more",
                "children": None,
                "isLeaf": True,
                "itemStyle": {
                    "color": "#cccccc"
                }
            }
            
            # 更新节点的子节点
            node["children"] = normal_children + sample_hash_children + [more_node]
        
        # 递归处理每个子节点
        node_count = 1  # 当前节点
        
        if node["children"]:
            processed_children = []
            for child in node["children"]:
                # 递归处理子节点，累计节点数
                child_count = self._process_node_tree(child, current_depth + 1, max_depth, max_nodes)
                node_count += child_count
                processed_children.append(child)
            
            # 如果子节点过多，可能需要进一步简化
            if len(processed_children) > 20:
                # 按照重要性（通常是子节点数量）排序
                processed_children.sort(key=lambda x: self._count_nodes(x), reverse=True)
                
                # 保留前15个最重要的节点
                important_children = processed_children[:15]
                other_children = processed_children[15:]
                
                if other_children:
                    # 创建"其他"节点
                    other_node = {
                        "name": f"其他 ({len(other_children)} 项)",
                        "path": f"{node.get('path', '')}/others",
                        "children": None,
                        "isLeaf": True,
                        "itemStyle": {
                            "color": "#aaaaaa"
                        }
                    }
                    important_children.append(other_node)
                
                node["children"] = important_children
        
        return node_count