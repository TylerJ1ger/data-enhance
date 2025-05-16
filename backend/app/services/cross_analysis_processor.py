import pandas as pd
import tempfile
import os
from typing import List, Dict, Any, Set, Optional
from fastapi import UploadFile
from urllib.parse import urlparse
import asyncio
import concurrent.futures
from app.utils.helpers import read_file, merge_dataframes

class CrossAnalysisProcessor:
    """处理交叉分析功能的独立类"""
    
    def __init__(self):
        self.domain_cache: Set[str] = set()
        self.results: List[Dict[str, Any]] = []
        self.chunk_size = 1000  # 每个处理块的大小
        
    async def process_first_round(self, files: List[UploadFile]) -> Dict[str, Any]:
        """处理第一轮上传的域名文件"""
        # 清空之前的数据
        self.domain_cache = set()
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
        
        # 提取唯一域名
        domain_series = merged_df['Domain'].dropna()
        unique_domains = set()
        
        # 并行处理域名规范化
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [executor.submit(self._normalize_domain, domain) 
                      for domain in domain_series if isinstance(domain, str) and domain]
            
            for future in concurrent.futures.as_completed(futures):
                domain = future.result()
                if domain:
                    unique_domains.add(domain)
        
        self.domain_cache = unique_domains
        
        return {
            "success": True,
            "domains_count": len(unique_domains),
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
        
        return {
            "success": True,
            "results": filtered_results,
            "message": f"成功匹配 {len(filtered_results)} 条记录"
        }
    
    def export_results(self) -> bytes:
        """导出结果为CSV格式"""
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
            
            # 解析域名
            try:
                source_domain = self._extract_domain(source_url)
                target_domain = self._extract_domain(target_url)
            except:
                continue
            
            # 检查源域名是否在第一轮提取的域名列表中
            domain_match = self._check_domain_match(source_domain)
            
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
    
    def _normalize_domain(self, domain: str) -> str:
        """规范化域名格式"""
        if not isinstance(domain, str):
            return ""
            
        domain = domain.lower().strip()
        
        # 移除www前缀
        if domain.startswith('www.'):
            domain = domain[4:]
            
        return domain
    
    def _extract_domain(self, url: str) -> str:
        """从URL中提取域名"""
        domain = urlparse(url).netloc.lower()
        
        # 移除www前缀
        if domain.startswith('www.'):
            domain = domain[4:]
            
        return domain
    
    def _check_domain_match(self, source_domain: str) -> bool:
        """检查源域名是否与已缓存的域名匹配"""
        # 直接匹配
        if source_domain in self.domain_cache:
            return True
            
        # 子域名匹配
        for domain in self.domain_cache:
            if source_domain.endswith('.' + domain):
                return True
                
        return False