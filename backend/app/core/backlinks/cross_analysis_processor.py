import pandas as pd
import tempfile
import os
from typing import List, Dict, Any, Set, Optional
from fastapi import UploadFile
import asyncio
import concurrent.futures
from io import StringIO
import csv

# 更新后的导入路径
from app.shared.utils.data_utils import read_file, merge_dataframes
from app.shared.utils.url_utils import (
    normalize_domain,
    extract_domain,
    extract_root_domain,
    check_domain_match
)


class CrossAnalysisProcessor:
    """处理交叉分析功能的独立类"""
    
    def __init__(self):
        self.domain_cache: Set[str] = set()
        self.domain_scores: Dict[str, float] = {}  # 新增：存储域名对应的权重
        self.results: List[Dict[str, Any]] = []
        self.chunk_size = 1000  # 每个处理块的大小
        
    async def process_first_round(self, files: List[UploadFile]) -> Dict[str, Any]:
        """处理第一轮上传的域名文件"""
        # 清空之前的数据
        self.domain_cache = set()
        self.domain_scores = {}  # 重置域名权重
        self.results = []
        
        dataframes = []
        
        # 使用异步处理文件上传
        for file in files:
            df = await self._process_single_file(file)
            if df is not None:
                dataframes.append(df)
        
        # 合并DataFrame
        if not dataframes:
            return {
                "success": False,
                "message": "未能成功处理任何文件"
            }
                
        merged_df = merge_dataframes(dataframes)
        
        # 检查必要列
        if 'Domain' not in merged_df.columns:
            return {
                "success": False,
                "message": "上传的文件中缺少Domain列"
            }
        
        # 如果存在Domain ascore列，则读取域名权重
        domain_ascore_col = None
        if 'Domain ascore' in merged_df.columns:
            domain_ascore_col = 'Domain ascore'
        elif 'domain_ascore' in merged_df.columns:
            domain_ascore_col = 'domain_ascore'
        
        # 提取唯一域名
        domain_series = merged_df['Domain'].dropna()
        unique_domains = set()
        domain_scores = {}  # 存储域名对应的权重
        
        # 处理域名规范化
        for domain in domain_series:
            if isinstance(domain, str) and domain:
                normalized_domain = normalize_domain(domain)  # 使用新的工具函数
                if normalized_domain:
                    unique_domains.add(normalized_domain)
        
        # 如果有权重列，存储每个域名的权重
        if domain_ascore_col:
            for _, row in merged_df.iterrows():
                domain = row['Domain']
                if pd.notna(domain) and isinstance(domain, str) and domain:
                    normalized_domain = normalize_domain(domain)  # 使用新的工具函数
                    ascore = row[domain_ascore_col]
                    if pd.notna(ascore) and normalized_domain:
                        domain_scores[normalized_domain] = float(ascore)
        
        self.domain_cache = unique_domains
        self.domain_scores = domain_scores  # 保存域名权重
        
        # 创建域名数据列表
        domains_data = []
        for domain in unique_domains:
            domains_data.append({
                "domain": domain,
                "ascore": domain_scores.get(domain, 0)  # 获取域名权重，如果没有则为0
            })
        
        return {
            "success": True,
            "domains_count": len(unique_domains),
            "domains_data": domains_data,  # 返回域名数据列表
            "message": f"成功提取 {len(unique_domains)} 个唯一域名"
        }
    
    async def process_second_round(self, files: List[UploadFile]) -> Dict[str, Any]:
        """处理第二轮上传的链接文件并执行交叉分析"""
        if not self.domain_cache:
            return {
                "success": False,
                "message": "未找到第一轮上传的域名数据",
                "results": []
            }
        
        dataframes = []
        
        # 使用异步处理文件上传
        for file in files:
            df = await self._process_single_file(file)
            if df is not None:
                dataframes.append(df)
        
        # 合并DataFrame
        if not dataframes:
            return {
                "success": False,
                "message": "未能成功处理任何文件",
                "results": []
            }
                
        merged_df = merge_dataframes(dataframes)
        
        # 检查必要列
        required_columns = ['Source url', 'Target url']
        missing_columns = [col for col in required_columns if col not in merged_df.columns]
        
        if missing_columns:
            return {
                "success": False,
                "message": f"上传的文件中缺少以下必要列: {', '.join(missing_columns)}",
                "results": []
            }
        
        # 执行交叉分析 - 使用分块处理以提高性能
        self.results = []
        total_rows = len(merged_df)
        chunks = [merged_df[i:i + self.chunk_size] for i in range(0, total_rows, self.chunk_size)]
        
        # 使用线程池并行处理数据块
        with concurrent.futures.ThreadPoolExecutor() as executor:
            chunk_results = list(executor.map(self._process_dataframe_chunk, chunks))
            
        # 合并结果
        all_results = []
        for result in chunk_results:
            all_results.extend(result)
            
        # 应用源域名限制规则
        filtered_results = self._apply_domain_filtering(all_results)
        self.results = filtered_results
        
        # 准备域名数据列表
        domains_data = []
        for domain in self.domain_cache:
            domains_data.append({
                "domain": domain,
                "ascore": self.domain_scores.get(domain, 0)
            })
        
        return {
            "success": True,
            "results": filtered_results,
            "domains_data": domains_data,  # 返回域名数据
            "message": f"成功匹配 {len(filtered_results)} 条记录"
        }
    
    def export_results(self) -> bytes:
        """导出结果为CSV格式 (原始方法，保留向后兼容)"""
        if not self.results:
            return b"No data to export"
        
        # 创建DataFrame
        df = pd.DataFrame(self.results)
        
        # 列名首字母大写并添加空格
        column_rename = {
            'page_ascore': 'Page ascore',
            'source_title': 'Source title',
            'source_url': 'Source url',
            'target_url': 'Target url',
            'anchor': 'Anchor',
            'nofollow': 'Nofollow'
        }
        
        # 重命名列
        df = df.rename(columns={k: v for k, v in column_rename.items() if k in df.columns})
        
        # 转换为CSV
        csv_bytes = df.to_csv(index=False).encode('utf-8')
        return csv_bytes
    
    def export_filtered_results(self, display_mode="flat", search_term="", 
                               sort_column="page_ascore", sort_direction="desc",
                               comparison_data=None, cell_display_type="target_url") -> bytes:
        """根据筛选条件和表格类型导出结果"""
        if not self.results:
            return b"No data to export"
        
        # 筛选结果
        filtered_results = self.results
        if search_term:
            search_term_lower = search_term.lower()
            filtered_results = [
                r for r in filtered_results 
                if (search_term_lower in (r.get('source_url', '') or '').lower() or
                    search_term_lower in (r.get('target_url', '') or '').lower() or
                    search_term_lower in (r.get('source_title', '') or '').lower() or
                    search_term_lower in (r.get('anchor', '') or '').lower())
            ]
        
        # 对比视图模式
        if display_mode == "compare" and comparison_data:
            return self._export_comparison_data(filtered_results, comparison_data, sort_column, 
                                               sort_direction, cell_display_type)
            
        # 平铺视图模式 - 普通表格导出
        # 排序结果
        if sort_direction == "asc":
            reverse = False
        else:
            reverse = True
            
        # 针对不同类型的列使用不同的排序方式
        if sort_column in ['page_ascore']:
            # 数值排序
            filtered_results = sorted(
                filtered_results, 
                key=lambda x: float(x.get(sort_column, 0) or 0), 
                reverse=reverse
            )
        else:
            # 字符串排序
            filtered_results = sorted(
                filtered_results, 
                key=lambda x: str(x.get(sort_column, '') or '').lower(), 
                reverse=reverse
            )
        
        # 创建DataFrame
        df = pd.DataFrame(filtered_results)
        
        # 列名首字母大写并添加空格
        column_rename = {
            'page_ascore': 'Page ascore',
            'source_title': 'Source title',
            'source_url': 'Source url',
            'target_url': 'Target url',
            'anchor': 'Anchor',
            'nofollow': 'Nofollow'
        }
        
        # 重命名列
        if not df.empty:
            df = df.rename(columns={k: v for k, v in column_rename.items() if k in df.columns})
        
        # 转换为CSV
        csv_bytes = df.to_csv(index=False).encode('utf-8')
        return csv_bytes

    def _export_comparison_data(self, filtered_results, comparison_data, sort_column="ascore", 
                               sort_direction="desc", cell_display_type="target_url") -> bytes:
        """导出对比视图格式的数据"""
        # 从comparison_data中提取域名和目标域名信息
        domains = comparison_data.get("domains", [])
        target_domains = comparison_data.get("targetDomains", [])
        
        # 创建CSV内存流
        output = StringIO()
        writer = csv.writer(output)
        
        # 写入表头
        header = ["站点权重", "站点域名"]
        header.extend(target_domains)
        writer.writerow(header)
        
        # 写入数据行
        for domain_data in domains:
            row = [domain_data.get("ascore", ""), domain_data.get("domain", "")]
            
            # 为每个目标域名添加数据
            for i, target in enumerate(domain_data.get("targets", [])):
                if target:
                    # 根据cell_display_type确定要显示的字段
                    if cell_display_type == "source_title":
                        cell_value = target.get("source_title", "") or ""
                    elif cell_display_type == "source_url":
                        cell_value = target.get("source_url", "") or ""
                    elif cell_display_type == "anchor":
                        cell_value = target.get("anchor", "") or ""
                    elif cell_display_type == "nofollow":
                        cell_value = "是" if target.get("nofollow", False) else "否"
                    else:  # 默认为target_url
                        cell_value = target.get("target_url", "") or ""
                    
                    row.append(cell_value)
                else:
                    row.append("")
            
            writer.writerow(row)
        
        # 返回CSV数据
        return output.getvalue().encode('utf-8')
        
    async def _process_single_file(self, file: UploadFile) -> Optional[pd.DataFrame]:
        """处理单个上传文件"""
        # 创建临时文件存储上传内容
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            # 分块读取文件内容
            chunk_size = 1024 * 1024  # 1MB 块
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                temp_file.write(chunk)
            
            temp_file.flush()
            
            try:
                # 读取文件到DataFrame
                df = read_file(temp_file.name)
                return df
            except Exception as e:
                print(f"处理文件 {file.filename} 时出错: {str(e)}")
                return None
            finally:
                # 关闭并删除临时文件
                temp_file.close()
                os.unlink(temp_file.name)
    
    def _process_dataframe_chunk(self, df_chunk: pd.DataFrame) -> List[Dict[str, Any]]:
        """处理DataFrame的一个数据块"""
        results = []
        
        # 提取结果中需要的列
        columns_to_extract = [
            'Page ascore', 'Source title', 'Source url', 'Target url', 
            'Anchor', 'Nofollow'
        ]
        
        # 确保使用存在的列
        available_columns = [col for col in columns_to_extract if col in df_chunk.columns]
        
        # 处理每一行数据
        for _, row in df_chunk.iterrows():
            # 提取源URL和目标URL
            source_url = str(row['Source url']) if pd.notna(row['Source url']) else ''
            target_url = str(row['Target url']) if pd.notna(row['Target url']) else ''
            
            if not source_url or not target_url:
                continue
            
            # 解析域名 - 使用导入的工具函数
            try:
                source_domain = extract_root_domain(source_url)
                target_domain = extract_root_domain(target_url)
            except:
                continue
            
            # 检查源域名是否在第一轮提取的域名列表中 - 使用导入的工具函数
            domain_match = check_domain_match(source_domain, self.domain_cache)
            
            # 如果找到匹配，添加到结果中
            if domain_match:
                # 提取所需字段
                result = {}
                
                # 添加必要字段
                result['source_url'] = source_url
                result['target_url'] = target_url
                
                # 添加目标域名的信息用于后续过滤
                result['target_domain'] = target_domain
                result['source_domain'] = source_domain
                
                # 添加其他可用字段
                for col in available_columns:
                    if col == 'Source url' or col == 'Target url':
                        continue
                    
                    # 规范化字段名称
                    field_name = col.lower().replace(' ', '_')
                    value = row[col]
                    result[field_name] = value if pd.notna(value) else None
                    
                    # 处理布尔值
                    if field_name == 'nofollow' and isinstance(result[field_name], str):
                        result[field_name] = result[field_name].upper() == 'TRUE'
                
                results.append(result)
        
        return results
    
    def _apply_domain_filtering(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """应用源域名限制规则，每个目标域名对应的每个源域名最多保留3个结果"""
        if not results:
            return []
            
        # 创建目标域名到源域名的映射
        target_domain_to_source_domains = {}
        
        # 构建映射
        for result in results:
            target_domain = result.get('target_domain', '')
            source_domain = result.get('source_domain', '')
            
            if not target_domain or not source_domain:
                continue
                
            if target_domain not in target_domain_to_source_domains:
                target_domain_to_source_domains[target_domain] = {}
            
            if source_domain not in target_domain_to_source_domains[target_domain]:
                target_domain_to_source_domains[target_domain][source_domain] = []
            
            target_domain_to_source_domains[target_domain][source_domain].append(result)
        
        # 应用过滤规则
        filtered_results = []
        
        # 遍历每个目标域名
        for target_domain, source_domains in target_domain_to_source_domains.items():
            # 遍历每个源域名
            for source_domain, domain_results in source_domains.items():
                # 如果源域名对应的结果数量超过3个，只保留3个
                if len(domain_results) > 3:
                    # 按页面权重排序，保留权重最高的3个
                    sorted_results = sorted(
                        domain_results, 
                        key=lambda x: float(x.get('page_ascore', 0)) if x.get('page_ascore') is not None else 0, 
                        reverse=True
                    )
                    domain_results = sorted_results[:3]
                
                # 添加到最终结果
                filtered_results.extend(domain_results)
        
        # 删除中间字段
        for result in filtered_results:
            if 'target_domain' in result:
                del result['target_domain']
            if 'source_domain' in result:
                del result['source_domain']
        
        return filtered_results