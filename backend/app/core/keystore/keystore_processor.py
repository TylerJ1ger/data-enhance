"""
Keystore Analysis Processor - 关键词库处理器 (修复JSON序列化问题)
"""

import os
import pandas as pd
import tempfile
import numpy as np
from typing import List, Dict, Any, Tuple, Optional, Set
from fastapi import UploadFile
import logging
from collections import defaultdict

from app.shared.utils.data_utils import read_file, get_dataframe_stats
from app.shared.exceptions.custom_exceptions import (
    FileProcessingException, 
    DataProcessingException,
    MissingRequiredColumnsException
)

logger = logging.getLogger(__name__)

class KeystoreProcessor:
    def __init__(self):
        """初始化关键词库处理器"""
        self.raw_data = pd.DataFrame()  # 原始数据
        self.keywords_data = pd.DataFrame()  # 处理后的关键词数据
        self.groups_data = {}  # 关键词组数据 {group_name: {keywords: [], stats: {}}}
        self.clusters_data = {}  # 关键词族数据 {cluster_name: [group_names]}
        self.duplicate_keywords = {}  # 重复关键词 {keyword: [groups]}
        self._file_stats = []
    
    def _convert_to_python_types(self, obj: Any) -> Any:
        """将numpy和pandas类型转换为Python原生类型"""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Series):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: self._convert_to_python_types(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [self._convert_to_python_types(item) for item in obj]
        elif pd.isna(obj):
            return None
        elif isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        else:
            return obj
        
    async def process_files(self, files: List[UploadFile]) -> Dict[str, Any]:
        """处理上传的CSV文件"""
        dataframes = []
        file_stats = []
        
        for file in files:
            try:
                # 创建临时文件
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                    content = await file.read()
                    temp_file.write(content)
                    temp_file.flush()
                    
                    # 读取文件
                    df = read_file(temp_file.name)
                    
                    # 验证必需列
                    required_columns = ['Keywords', 'group_name_map', 'QPM', 'DIFF']
                    missing_columns = [col for col in required_columns if col not in df.columns]
                    
                    if missing_columns:
                        raise MissingRequiredColumnsException(
                            missing_columns=missing_columns,
                            available_columns=list(df.columns)
                        )
                    
                    # 数据清理和标准化
                    df = self._clean_dataframe(df)
                    
                    dataframes.append(df)
                    file_stats.append({
                        "filename": file.filename,
                        "rows": int(len(df)),  # 确保是Python int
                        "keywords": int(df['Keywords'].nunique()),  # 确保是Python int
                        "groups": int(df['group_name_map'].nunique())  # 确保是Python int
                    })
                    
                    # 清理临时文件
                    os.unlink(temp_file.name)
                    
            except Exception as e:
                logger.error(f"处理文件 {file.filename} 时出错: {str(e)}")
                raise FileProcessingException(
                    filename=file.filename,
                    parsing_error=str(e)
                )
        
        # 合并所有数据
        if dataframes:
            self.raw_data = pd.concat(dataframes, ignore_index=True)
            # 再次清理合并后的数据
            self.raw_data = self._clean_merged_data(self.raw_data)
            self._process_keywords_data()
            self._analyze_duplicates()
            self._file_stats = file_stats
            
        result = {
            "success": True,
            "file_stats": file_stats,
            "summary": self._get_summary(),
            "groups_overview": self._get_groups_overview()
        }
        
        # 确保所有返回数据都是Python原生类型
        return self._convert_to_python_types(result)
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """清理和标准化单个数据框"""
        # 移除空行
        df = df.dropna(subset=['Keywords', 'group_name_map'])
        
        # 移除Unnamed列和空列
        df = self._remove_unnamed_columns(df)
        df = self._remove_empty_columns(df)
        
        # 标准化列名和数据
        df['Keywords'] = df['Keywords'].astype(str).str.strip().str.lower()
        df['group_name_map'] = df['group_name_map'].astype(str).str.strip()
        
        # 转换数值列
        df['QPM'] = pd.to_numeric(df['QPM'], errors='coerce').fillna(0)
        df['DIFF'] = pd.to_numeric(df['DIFF'], errors='coerce').fillna(0)
        
        # 移除重复的关键词（保留QPM最高的）
        df = df.sort_values('QPM', ascending=False).drop_duplicates(subset=['Keywords'], keep='first')
        
        return df
    
    def _clean_merged_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """清理合并后的数据，处理可能产生的重复列和无效列"""
        # 再次移除Unnamed列
        df = self._remove_unnamed_columns(df)
        
        # 移除重复列（列名相同但内容可能不同）
        df = self._remove_duplicate_columns(df)
        
        # 移除完全为空的列
        df = self._remove_empty_columns(df)
        
        # 最终去重处理
        df = df.sort_values('QPM', ascending=False).drop_duplicates(subset=['Keywords', 'group_name_map'], keep='first')
        
        return df
    
    def _remove_unnamed_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """移除所有Unnamed列"""
        unnamed_columns = [col for col in df.columns if str(col).startswith('Unnamed:')]
        if unnamed_columns:
            logger.info(f"移除Unnamed列: {unnamed_columns}")
            df = df.drop(columns=unnamed_columns)
        return df
    
    def _remove_empty_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """移除完全为空的列"""
        # 移除完全为空的列
        df = df.dropna(axis=1, how='all')
        
        # 移除列名为空或NaN的列
        df = df.loc[:, df.columns.notna()]
        df = df.loc[:, df.columns != '']
        
        return df
    
    def _remove_duplicate_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """移除重复的列（列名相同）"""
        # 获取唯一的列名，保留第一次出现的列
        unique_columns = []
        seen_columns = set()
        
        for col in df.columns:
            if col not in seen_columns:
                unique_columns.append(col)
                seen_columns.add(col)
            else:
                logger.warning(f"发现重复列名，已移除: {col}")
        
        return df[unique_columns]
    
    def _process_keywords_data(self):
        """处理关键词数据，构建组结构"""
        if self.raw_data.empty:
            return
            
        self.keywords_data = self.raw_data.copy()
        self.groups_data = {}
        
        # 按组分组数据
        for group_name in self.keywords_data['group_name_map'].unique():
            group_df = self.keywords_data[self.keywords_data['group_name_map'] == group_name]
            
            self.groups_data[group_name] = {
                'keywords': group_df['Keywords'].tolist(),
                'keyword_count': int(len(group_df)),  # 确保是Python int
                'total_qpm': float(group_df['QPM'].sum()),  # 确保是Python float
                'avg_diff': float(group_df['DIFF'].mean()),  # 确保是Python float
                'avg_qpm': float(group_df['QPM'].mean()),  # 确保是Python float
                'max_qpm': float(group_df['QPM'].max()),  # 确保是Python float
                'min_qpm': float(group_df['QPM'].min()),  # 确保是Python float
                'data': [self._convert_to_python_types(record) for record in group_df.to_dict('records')]
            }
    
    def _analyze_duplicates(self):
        """分析重复关键词"""
        self.duplicate_keywords = {}
        
        if self.keywords_data.empty:
            return
            
        # 统计每个关键词出现在哪些组中
        keyword_groups = defaultdict(list)
        
        for _, row in self.keywords_data.iterrows():
            keyword = row['Keywords']
            group = row['group_name_map']
            if group not in keyword_groups[keyword]:
                keyword_groups[keyword].append(group)
        
        # 找出出现在多个组中的关键词
        for keyword, groups in keyword_groups.items():
            if len(groups) > 1:
                self.duplicate_keywords[keyword] = groups
    
    def get_groups_visualization_data(self) -> Dict[str, Any]:
        """获取关键词组可视化数据"""
        if not self.groups_data:
            return {"nodes": [], "links": [], "categories": []}
        
        nodes = []
        links = []
        categories = [
            {"name": "关键词组", "itemStyle": {"color": "#5470c6"}},
            {"name": "关键词族", "itemStyle": {"color": "#91cc75"}},
            {"name": "重复关键词", "itemStyle": {"color": "#fac858"}}
        ]
        
        # 添加组节点
        for i, (group_name, group_info) in enumerate(self.groups_data.items()):
            nodes.append({
                "id": group_name,
                "name": group_name,
                "category": 0,
                "value": int(group_info['keyword_count']),  # 确保是Python int
                "symbolSize": min(100, max(20, int(group_info['keyword_count']) * 2)),
                "itemStyle": {"color": self._get_group_color(i)},
                "label": {"show": True},
                "tooltip": {
                    "formatter": f"{group_name}<br/>关键词数: {group_info['keyword_count']}<br/>总QPM: {group_info['total_qpm']:,.0f}"
                }
            })
        
        # 添加族节点和连接
        for cluster_name, group_names in self.clusters_data.items():
            cluster_node_id = f"cluster_{cluster_name}"
            nodes.append({
                "id": cluster_node_id,
                "name": cluster_name,
                "category": 1,
                "value": len(group_names),
                "symbolSize": min(120, max(30, len(group_names) * 15)),
                "itemStyle": {"color": "#91cc75"},
                "label": {"show": True}
            })
            
            # 连接族和组
            for group_name in group_names:
                if group_name in self.groups_data:
                    links.append({
                        "source": cluster_node_id,
                        "target": group_name,
                        "lineStyle": {"width": 2}
                    })
        
        # 添加重复关键词节点和连接
        for keyword, groups in self.duplicate_keywords.items():
            if len(groups) > 1:  # 只处理真正的重复关键词
                keyword_node_id = f"keyword_{keyword}"
                nodes.append({
                    "id": keyword_node_id,
                    "name": keyword,
                    "category": 2,
                    "value": len(groups),
                    "symbolSize": min(80, max(15, len(groups) * 8)),
                    "itemStyle": {"color": "#fac858"},
                    "label": {"show": True, "fontSize": 8},
                    "tooltip": {
                        "formatter": f"重复关键词: {keyword}<br/>出现在 {len(groups)} 个组中<br/>组: {', '.join(groups)}"
                    }
                })
                
                # 连接重复关键词到所有包含它的组
                for group_name in groups:
                    if group_name in self.groups_data:
                        links.append({
                            "source": keyword_node_id,
                            "target": group_name,
                            "lineStyle": {"width": 1, "color": "#fac858", "type": "dashed"},
                            "label": {"show": False}
                        })
        
        return self._convert_to_python_types({
            "nodes": nodes,
            "links": links,
            "categories": categories
        })
    
    def get_duplicate_keywords_analysis(self) -> Dict[str, Any]:
        """获取重复关键词分析"""
        duplicate_details = []
        
        if self.keywords_data.empty:
            return self._convert_to_python_types({
                "total_duplicates": 0,
                "details": []
            })
        
        # 重新计算当前的重复关键词（不依赖缓存的duplicate_keywords）
        keyword_groups = defaultdict(list)
        keyword_data_cache = {}
        
        # 收集每个关键词在哪些组中出现
        for _, row in self.keywords_data.iterrows():
            keyword = row['Keywords']
            group = row['group_name_map']
            
            if group not in keyword_groups[keyword]:
                keyword_groups[keyword].append(group)
                
            # 缓存关键词数据
            key = f"{keyword}_{group}"
            keyword_data_cache[key] = {
                "group": group,
                "qpm": float(row['QPM']),
                "diff": float(row['DIFF'])
            }
        
        # 只处理真正重复的关键词（出现在多个组中）
        for keyword, groups in keyword_groups.items():
            if len(groups) > 1:
                keyword_data = []
                total_qpm = 0
                
                for group in groups:
                    key = f"{keyword}_{group}"
                    if key in keyword_data_cache:
                        data = keyword_data_cache[key]
                        keyword_data.append(data)
                        total_qpm += data["qpm"]
                
                if len(keyword_data) > 1:  # 双重确认确实是重复的
                    duplicate_details.append({
                        "keyword": keyword,
                        "groups": keyword_data,
                        "group_count": len(keyword_data),
                        "total_qpm": float(total_qpm)
                    })
        
        # 按组数量和QPM排序
        duplicate_details.sort(key=lambda x: (x['group_count'], x['total_qpm']), reverse=True)
        
        return self._convert_to_python_types({
            "total_duplicates": len(duplicate_details),
            "details": duplicate_details
        })
    
    def move_keyword_to_group(self, keyword: str, source_group: str, target_group: str) -> Dict[str, Any]:
        """将关键词从一个组移动到另一个组"""
        try:
            # 检查关键词是否存在于源组
            keyword_exists = not self.keywords_data[
                (self.keywords_data['Keywords'] == keyword) & 
                (self.keywords_data['group_name_map'] == source_group)
            ].empty
            
            if not keyword_exists:
                raise DataProcessingException(f"关键词 '{keyword}' 不存在于组 '{source_group}' 中")
            
            # 更新数据
            mask = (self.keywords_data['Keywords'] == keyword) & (self.keywords_data['group_name_map'] == source_group)
            self.keywords_data.loc[mask, 'group_name_map'] = target_group
            
            # 重新处理数据
            self._process_keywords_data()
            self._analyze_duplicates()
            
            return {
                "success": True,
                "message": f"关键词 '{keyword}' 已从 '{source_group}' 移动到 '{target_group}'"
            }
            
        except Exception as e:
            logger.error(f"移动关键词时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def remove_keyword_from_group(self, keyword: str, group: str) -> Dict[str, Any]:
        """从组中删除关键词"""
        try:
            # 检查关键词是否存在
            keyword_exists = not self.keywords_data[
                (self.keywords_data['Keywords'] == keyword) & 
                (self.keywords_data['group_name_map'] == group)
            ].empty
            
            if not keyword_exists:
                raise DataProcessingException(f"关键词 '{keyword}' 不存在于组 '{group}' 中")
            
            # 删除关键词 - 同时更新原始数据和处理后数据
            mask = (self.keywords_data['Keywords'] == keyword) & (self.keywords_data['group_name_map'] == group)
            self.keywords_data = self.keywords_data[~mask]
            
            # 同样更新原始数据以保持一致性
            if not self.raw_data.empty:
                raw_mask = (self.raw_data['Keywords'] == keyword) & (self.raw_data['group_name_map'] == group)
                self.raw_data = self.raw_data[~raw_mask]
            
            # 重新处理数据
            self._process_keywords_data()
            self._analyze_duplicates()
            
            return {
                "success": True,
                "message": f"关键词 '{keyword}' 已从组 '{group}' 中删除"
            }
            
        except Exception as e:
            logger.error(f"删除关键词时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def rename_group(self, old_name: str, new_name: str) -> Dict[str, Any]:
        """重命名关键词组"""
        try:
            if old_name not in self.groups_data:
                raise DataProcessingException(f"组 '{old_name}' 不存在")
            
            if new_name in self.groups_data:
                raise DataProcessingException(f"组 '{new_name}' 已存在")
            
            # 更新数据
            mask = self.keywords_data['group_name_map'] == old_name
            self.keywords_data.loc[mask, 'group_name_map'] = new_name
            
            # 更新族数据中的组名
            for cluster_name, group_names in self.clusters_data.items():
                if old_name in group_names:
                    group_names.remove(old_name)
                    group_names.append(new_name)
            
            # 重新处理数据
            self._process_keywords_data()
            self._analyze_duplicates()
            
            return {
                "success": True,
                "message": f"组 '{old_name}' 已重命名为 '{new_name}'"
            }
            
        except Exception as e:
            logger.error(f"重命名组时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def create_cluster(self, cluster_name: str, group_names: List[str]) -> Dict[str, Any]:
        """创建关键词族"""
        try:
            if cluster_name in self.clusters_data:
                raise DataProcessingException(f"族 '{cluster_name}' 已存在")
            
            # 验证组是否存在
            for group_name in group_names:
                if group_name not in self.groups_data:
                    raise DataProcessingException(f"组 '{group_name}' 不存在")
            
            self.clusters_data[cluster_name] = group_names.copy()
            
            return {
                "success": True,
                "message": f"族 '{cluster_name}' 创建成功，包含 {len(group_names)} 个组"
            }
            
        except Exception as e:
            logger.error(f"创建族时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def update_cluster(self, cluster_name: str, group_names: List[str]) -> Dict[str, Any]:
        """更新关键词族"""
        try:
            if cluster_name not in self.clusters_data:
                raise DataProcessingException(f"族 '{cluster_name}' 不存在")
            
            # 验证组是否存在
            for group_name in group_names:
                if group_name not in self.groups_data:
                    raise DataProcessingException(f"组 '{group_name}' 不存在")
            
            self.clusters_data[cluster_name] = group_names.copy()
            
            return {
                "success": True,
                "message": f"族 '{cluster_name}' 更新成功"
            }
            
        except Exception as e:
            logger.error(f"更新族时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def delete_cluster(self, cluster_name: str) -> Dict[str, Any]:
        """删除关键词族"""
        try:
            if cluster_name not in self.clusters_data:
                raise DataProcessingException(f"族 '{cluster_name}' 不存在")
            
            del self.clusters_data[cluster_name]
            
            return {
                "success": True,
                "message": f"族 '{cluster_name}' 删除成功"
            }
            
        except Exception as e:
            logger.error(f"删除族时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def export_keystore_data(self) -> bytes:
        """导出关键词库数据，包含族信息和清理后的列"""
        if self.keywords_data.empty:
            return b"No data to export"
        
        try:
            # 创建导出数据的副本
            export_data = self.keywords_data.copy()
            
            # 添加族信息列
            export_data['cluster_name'] = export_data['group_name_map'].apply(
                lambda group_name: self._get_cluster_for_group(group_name)
            )
            
            # 清理导出数据
            export_data = self._clean_export_data(export_data)
            
            # 重新排列列的顺序，确保重要信息在前面
            column_order = [
                'Keywords', 'group_name_map', 'cluster_name', 'QPM', 'DIFF'
            ]
            
            # 添加其他存在的列
            other_columns = [col for col in export_data.columns if col not in column_order]
            final_column_order = column_order + other_columns
            
            # 只保留存在的列
            final_column_order = [col for col in final_column_order if col in export_data.columns]
            export_data = export_data[final_column_order]
            
            logger.info(f"导出关键词库数据: {len(export_data)} 行, {len(export_data.columns)} 列")
            logger.info(f"导出列: {list(export_data.columns)}")
            
            return export_data.to_csv(index=False).encode('utf-8')
            
        except Exception as e:
            logger.error(f"导出关键词库数据时出错: {str(e)}")
            return b"Export error occurred"
    
    def _get_cluster_for_group(self, group_name: str) -> str:
        """获取组所属的族名"""
        for cluster_name, group_names in self.clusters_data.items():
            if group_name in group_names:
                return cluster_name
        return ""  # 未分配到族的组返回空字符串
    
    def _clean_export_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """清理导出数据，移除无用列"""
        # 移除所有Unnamed列
        df = self._remove_unnamed_columns(df)
        
        # 移除完全为空的列
        df = self._remove_empty_columns(df)
        
        # 移除重复列
        df = self._remove_duplicate_columns(df)
        
        # 移除列名包含特定模式的无效列
        invalid_patterns = ['Unnamed:', '.1', '.2', '.3']  # 常见的无效列名模式
        columns_to_remove = []
        
        for col in df.columns:
            col_str = str(col)
            if any(pattern in col_str for pattern in invalid_patterns):
                columns_to_remove.append(col)
        
        if columns_to_remove:
            logger.info(f"移除无效列: {columns_to_remove}")
            df = df.drop(columns=columns_to_remove)
        
        return df
    
    def _get_summary(self) -> Dict[str, Any]:
        """获取数据摘要"""
        if self.keywords_data.empty:
            return {
                "total_keywords": 0,
                "unique_keywords": 0,
                "total_groups": 0,
                "total_clusters": 0,
                "duplicate_keywords_count": 0,
                "total_qpm": 0.0,
                "avg_diff": 0.0
            }
            
        return {
            "total_keywords": int(len(self.keywords_data)),
            "unique_keywords": int(self.keywords_data['Keywords'].nunique()),
            "total_groups": len(self.groups_data),
            "total_clusters": len(self.clusters_data),
            "duplicate_keywords_count": len(self.duplicate_keywords),
            "total_qpm": float(self.keywords_data['QPM'].sum()),
            "avg_diff": float(self.keywords_data['DIFF'].mean()) if len(self.keywords_data) > 0 else 0.0
        }
    
    def _get_groups_overview(self) -> List[Dict[str, Any]]:
        """获取组概览"""
        overview = []
        for group_name, group_info in self.groups_data.items():
            cluster_name = self._get_cluster_for_group(group_name)
            
            overview.append({
                "group_name": group_name,
                "cluster_name": cluster_name if cluster_name else None,
                "keyword_count": int(group_info['keyword_count']),
                "total_qpm": float(group_info['total_qpm']),
                "avg_diff": round(float(group_info['avg_diff']), 2)
            })
        
        return sorted(overview, key=lambda x: x['total_qpm'], reverse=True)
    
    def _get_group_color(self, index: int) -> str:
        """获取组的颜色"""
        colors = [
            "#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de",
            "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc", "#89c997"
        ]
        return colors[index % len(colors)]
    
    def get_groups_data(self) -> Dict[str, Any]:
        """获取所有组数据"""
        return self._convert_to_python_types(self.groups_data)
    
    def get_clusters_data(self) -> Dict[str, Any]:
        """获取所有族数据"""
        return self._convert_to_python_types(self.clusters_data)
    
    def reset_data(self):
        """重置所有数据"""
        self.raw_data = pd.DataFrame()
        self.keywords_data = pd.DataFrame()
        self.groups_data = {}
        self.clusters_data = {}
        self.duplicate_keywords = {}
        self._file_stats = []
        logger.info("关键词库数据已重置")