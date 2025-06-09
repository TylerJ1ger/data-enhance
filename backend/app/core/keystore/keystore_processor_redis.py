"""
Redis-based Keystore Analysis Processor - 关键词库处理器
使用Redis作为数据存储，解决数据持久化和状态同步问题
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
from app.core.database import KeystoreRepository, get_redis_manager

logger = logging.getLogger(__name__)


class KeystoreProcessorRedis:
    def __init__(self):
        """初始化Redis关键词库处理器"""
        self.redis_manager = get_redis_manager()
        self.repository = KeystoreRepository(self.redis_manager)
        self._file_stats = []
    
    def _convert_to_python_types(self, obj: Any) -> Any:
        """将numpy和pandas类型转换为Python原生类型，并处理无效的浮点数"""
        import math
        
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
            val = float(obj)
            # 检查并处理无效的浮点数
            if math.isnan(val) or math.isinf(val):
                return 0.0
            return val
        elif isinstance(obj, float):
            # 检查并处理无效的浮点数
            if math.isnan(obj) or math.isinf(obj):
                return 0.0
            return obj
        else:
            return obj
    
    async def process_files(self, files: List[UploadFile]) -> Dict[str, Any]:
        """处理上传的CSV文件并存储到Redis"""
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
                        "rows": int(len(df)),
                        "keywords": int(df['Keywords'].nunique()),
                        "groups": int(df['group_name_map'].nunique())
                    })
                    
                    # 清理临时文件
                    os.unlink(temp_file.name)
                    
            except Exception as e:
                logger.error(f"处理文件 {file.filename} 时出错: {str(e)}")
                raise FileProcessingException(
                    filename=file.filename,
                    parsing_error=str(e)
                )
        
        # 合并所有数据并存储到Redis
        if dataframes:
            merged_df = pd.concat(dataframes, ignore_index=True)
            merged_df = self._clean_merged_data(merged_df)
            
            # 清空现有数据
            self.repository.clear_all_data()
            
            # 批量存储到Redis
            keywords_data = merged_df.to_dict('records')
            keyword_ids = self.repository.bulk_create_keywords(keywords_data)
            
            logger.info(f"成功存储 {len(keyword_ids)} 个关键词到Redis")
            self._file_stats = file_stats
        
        result = {
            "success": True,
            "file_stats": file_stats,
            "summary": self.get_summary(),
            "groups_overview": self.get_groups_overview()
        }
        
        return self._convert_to_python_types(result)
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """清理和标准化单个数据框"""
        import math
        
        # 移除空行
        df = df.dropna(subset=['Keywords', 'group_name_map'])
        
        # 移除Unnamed列和空列
        df = self._remove_unnamed_columns(df)
        df = self._remove_empty_columns(df)
        
        # 标准化列名和数据
        df['Keywords'] = df['Keywords'].astype(str).str.strip().str.lower()
        df['group_name_map'] = df['group_name_map'].astype(str).str.strip()
        
        # 转换数值列并处理无效值
        df['QPM'] = pd.to_numeric(df['QPM'], errors='coerce').fillna(0)
        df['DIFF'] = pd.to_numeric(df['DIFF'], errors='coerce').fillna(0)
        
        # 处理无限大和NaN值
        df['QPM'] = df['QPM'].replace([np.inf, -np.inf], 0)
        df['DIFF'] = df['DIFF'].replace([np.inf, -np.inf], 0)
        
        # 确保没有NaN值
        df['QPM'] = df['QPM'].fillna(0)
        df['DIFF'] = df['DIFF'].fillna(0)
        
        # 移除重复的关键词（保留QPM最高的）
        df = df.sort_values('QPM', ascending=False).drop_duplicates(subset=['Keywords'], keep='first')
        
        return df
    
    def _clean_merged_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """清理合并后的数据"""
        df = self._remove_unnamed_columns(df)
        df = self._remove_duplicate_columns(df)
        df = self._remove_empty_columns(df)
        
        # 最终数据清理
        df = df.dropna(subset=['Keywords', 'group_name_map'])
        df = df.sort_values('QPM', ascending=False).drop_duplicates(subset=['Keywords'], keep='first')
        
        return df.reset_index(drop=True)
    
    def _remove_unnamed_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """移除Unnamed列"""
        unnamed_columns = [col for col in df.columns if str(col).startswith('Unnamed:')]
        if unnamed_columns:
            logger.info(f"移除Unnamed列: {unnamed_columns}")
            df = df.drop(columns=unnamed_columns)
        return df
    
    def _remove_empty_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """移除完全为空的列"""
        empty_columns = [col for col in df.columns if df[col].isna().all()]
        if empty_columns:
            logger.info(f"移除空列: {empty_columns}")
            df = df.drop(columns=empty_columns)
        return df
    
    def _remove_duplicate_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """移除重复的列"""
        return df.loc[:, ~df.columns.duplicated()]
    
    # =====================================================
    # Redis-based Data Access Methods
    # =====================================================
    
    def get_summary(self) -> Dict[str, Any]:
        """获取关键词库摘要"""
        import math
        
        try:
            stats = self.repository.get_global_stats()
            duplicates = self.repository.get_duplicate_keywords()
            
            # 计算平均难度
            avg_diff = 0.0
            total_keywords = stats.get("total_keywords", 0)
            if total_keywords > 0:
                total_diff = 0.0
                keyword_ids = self.repository.redis.smembers(self.repository._make_key("keywords"))
                valid_count = 0
                
                for keyword_id in keyword_ids:
                    if isinstance(keyword_id, bytes):
                        keyword_id = keyword_id.decode('utf-8')
                    keyword_data = self.repository.get_keyword(keyword_id)
                    if keyword_data:
                        diff = float(keyword_data.get('DIFF', 0))
                        if not (math.isnan(diff) or math.isinf(diff)):
                            total_diff += diff
                            valid_count += 1
                
                if valid_count > 0:
                    avg_diff = total_diff / valid_count
            
            return {
                "total_keywords": total_keywords,
                "unique_keywords": total_keywords,  # 在这个上下文中，所有关键词都是唯一的
                "total_groups": stats.get("total_groups", 0),
                "total_clusters": stats.get("total_clusters", 0),
                "duplicate_keywords": stats.get("duplicate_keywords", 0),
                "duplicate_keywords_count": len(duplicates),
                "total_qpm": stats.get("total_qpm", 0.0),
                "avg_qpm_per_keyword": stats.get("avg_qpm_per_keyword", 0.0),
                "avg_diff": avg_diff
            }
        except Exception as e:
            logger.error(f"获取摘要数据时出错: {str(e)}")
            return {
                "total_keywords": 0,
                "unique_keywords": 0,
                "total_groups": 0,
                "total_clusters": 0,
                "duplicate_keywords": 0,
                "duplicate_keywords_count": 0,
                "total_qpm": 0.0,
                "avg_qpm_per_keyword": 0.0,
                "avg_diff": 0.0
            }
    
    def get_groups_overview(self) -> List[Dict[str, Any]]:
        """获取组概览"""
        try:
            groups = self.repository.get_all_groups()
            overview = []
            
            for group_name in groups:
                group_info = self.repository.get_group_info(group_name)
                overview.append({
                    "group_name": group_name,
                    "keyword_count": group_info.get("keyword_count", 0),
                    "total_qpm": group_info.get("total_qpm", 0.0),
                    "avg_qpm": group_info.get("avg_qpm", 0.0),
                    "avg_diff": group_info.get("avg_diff", 0.0)
                })
            
            # 按关键词数量排序
            overview.sort(key=lambda x: x["keyword_count"], reverse=True)
            return overview
            
        except Exception as e:
            logger.error(f"获取组概览时出错: {str(e)}")
            return []
    
    def get_groups_data(self) -> Dict[str, Any]:
        """获取所有组数据"""
        try:
            groups = self.repository.get_all_groups()
            groups_data = {}
            
            for group_name in groups:
                group_info = self.repository.get_group_info(group_name)
                
                # 获取组中的关键词详细数据
                keyword_ids = self.repository.get_group_keywords(group_name)
                keywords_detail = []
                
                for keyword_id in keyword_ids:
                    keyword_data = self.repository.get_keyword(keyword_id)
                    if keyword_data:
                        keywords_detail.append(keyword_data)
                
                groups_data[group_name] = {
                    **group_info,
                    "data": keywords_detail
                }
            
            return groups_data
            
        except Exception as e:
            logger.error(f"获取组数据时出错: {str(e)}")
            return {}
    
    def get_clusters_data(self) -> Dict[str, List[str]]:
        """获取所有族数据"""
        try:
            clusters = self.repository.get_all_clusters()
            clusters_data = {}
            
            for cluster_name in clusters:
                cluster_groups = self.repository.get_cluster_groups(cluster_name)
                clusters_data[cluster_name] = list(cluster_groups)
            
            return clusters_data
            
        except Exception as e:
            logger.error(f"获取族数据时出错: {str(e)}")
            return {}
    
    def get_duplicate_keywords_analysis(self) -> Dict[str, Any]:
        """获取重复关键词分析"""
        try:
            return self.repository.get_duplicate_keywords_analysis()
        except Exception as e:
            logger.error(f"获取重复关键词分析时出错: {str(e)}")
            return {"total_duplicates": 0, "details": []}
    
    def get_groups_visualization_data(self) -> Dict[str, Any]:
        """获取关键词组可视化数据"""
        try:
            groups_data = self.get_groups_data()
            clusters_data = self.get_clusters_data()
            duplicates = self.repository.get_duplicate_keywords()
            
            if not groups_data:
                return {"nodes": [], "links": [], "categories": []}
            
            nodes = []
            links = []
            categories = [
                {"name": "关键词组", "itemStyle": {"color": "#5470c6"}},
                {"name": "关键词族", "itemStyle": {"color": "#91cc75"}},
                {"name": "重复关键词", "itemStyle": {"color": "#fac858"}}
            ]
            
            # 添加组节点
            for i, (group_name, group_info) in enumerate(groups_data.items()):
                nodes.append({
                    "id": group_name,
                    "name": group_name,
                    "category": 0,
                    "value": group_info['keyword_count'],
                    "symbolSize": min(100, max(20, group_info['keyword_count'] * 2)),
                    "itemStyle": {"color": self._get_group_color(i)},
                    "label": {"show": True},
                    "tooltip": {
                        "formatter": f"{group_name}<br/>关键词数: {group_info['keyword_count']}<br/>总QPM: {group_info['total_qpm']:,.0f}"
                    }
                })
            
            # 添加族节点和连接
            for cluster_name, group_names in clusters_data.items():
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
                    if group_name in groups_data:
                        links.append({
                            "source": cluster_node_id,
                            "target": group_name,
                            "lineStyle": {"width": 2}
                        })
            
            # 添加重复关键词节点和连接
            for keyword, groups in duplicates.items():
                if len(groups) > 1:
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
                        if group_name in groups_data:
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
            
        except Exception as e:
            logger.error(f"获取可视化数据时出错: {str(e)}")
            return {"nodes": [], "links": [], "categories": []}
    
    def _get_group_color(self, index: int) -> str:
        """为组生成颜色"""
        colors = [
            "#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", 
            "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc", "#ff9f7f"
        ]
        return colors[index % len(colors)]
    
    # =====================================================
    # Data Manipulation Methods
    # =====================================================
    
    def remove_keyword_from_group(self, keyword: str, group: str) -> Dict[str, Any]:
        """从组中删除关键词"""
        try:
            success = self.repository.remove_keyword_from_group(keyword, group)
            
            if success:
                return {
                    "success": True,
                    "message": f"关键词 '{keyword}' 已从组 '{group}' 中删除"
                }
            else:
                raise DataProcessingException(f"关键词 '{keyword}' 不存在于组 '{group}' 中")
                
        except Exception as e:
            logger.error(f"删除关键词时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def move_keyword_to_group(self, keyword: str, source_group: str, target_group: str) -> Dict[str, Any]:
        """将关键词从一个组移动到另一个组"""
        try:
            # 找到源组中的关键词
            source_keywords = self.repository.get_group_keywords(source_group)
            keyword_id = None
            
            for kid in source_keywords:
                kdata = self.repository.get_keyword(kid)
                if kdata and kdata['Keywords'] == keyword:
                    keyword_id = kid
                    break
            
            if not keyword_id:
                raise DataProcessingException(f"关键词 '{keyword}' 不存在于组 '{source_group}' 中")
            
            # 更新关键词的组映射
            success = self.repository.update_keyword(keyword_id, {
                'group_name_map': target_group
            })
            
            if success:
                # 更新Redis中的组关系
                redis_client = self.repository.redis
                with redis_client.pipeline() as pipe:
                    # 从源组移除
                    pipe.srem(self.repository._make_key(f"group:{source_group}:keywords"), keyword_id)
                    # 添加到目标组
                    pipe.sadd(self.repository._make_key(f"group:{target_group}:keywords"), keyword_id)
                    # 更新关键词-组映射
                    pipe.srem(self.repository._make_key(f"keyword_groups:{keyword}"), source_group)
                    pipe.sadd(self.repository._make_key(f"keyword_groups:{keyword}"), target_group)
                    # 添加目标组到组集合
                    pipe.sadd(self.repository._make_key("groups"), target_group)
                    pipe.execute()
                
                return {
                    "success": True,
                    "message": f"关键词 '{keyword}' 已从组 '{source_group}' 移动到组 '{target_group}'"
                }
            else:
                raise DataProcessingException("移动关键词失败")
                
        except Exception as e:
            logger.error(f"移动关键词时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def rename_group(self, old_name: str, new_name: str) -> Dict[str, Any]:
        """重命名关键词组"""
        try:
            success = self.repository.rename_group(old_name, new_name)
            
            if success:
                return {
                    "success": True,
                    "message": f"组 '{old_name}' 已重命名为 '{new_name}'"
                }
            else:
                raise DataProcessingException(f"组 '{old_name}' 不存在")
                
        except Exception as e:
            logger.error(f"重命名组时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def create_cluster(self, cluster_name: str, group_names: List[str]) -> Dict[str, Any]:
        """创建关键词族"""
        try:
            # 检查族是否已存在
            existing_clusters = self.repository.get_all_clusters()
            if cluster_name in existing_clusters:
                raise DataProcessingException(f"族 '{cluster_name}' 已存在")
            
            # 验证组是否存在
            existing_groups = self.repository.get_all_groups()
            invalid_groups = [g for g in group_names if g not in existing_groups]
            if invalid_groups:
                raise DataProcessingException(f"以下组不存在: {', '.join(invalid_groups)}")
            
            success = self.repository.create_cluster(cluster_name, group_names)
            
            if success:
                return {
                    "success": True,
                    "message": f"族 '{cluster_name}' 创建成功"
                }
            else:
                raise DataProcessingException("创建族失败")
                
        except Exception as e:
            logger.error(f"创建族时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def update_cluster(self, cluster_name: str, group_names: List[str]) -> Dict[str, Any]:
        """更新关键词族"""
        try:
            # 检查族是否存在
            existing_clusters = self.repository.get_all_clusters()
            if cluster_name not in existing_clusters:
                raise DataProcessingException(f"族 '{cluster_name}' 不存在")
            
            # 验证组是否存在
            existing_groups = self.repository.get_all_groups()
            invalid_groups = [g for g in group_names if g not in existing_groups]
            if invalid_groups:
                raise DataProcessingException(f"以下组不存在: {', '.join(invalid_groups)}")
            
            success = self.repository.update_cluster(cluster_name, group_names)
            
            if success:
                return {
                    "success": True,
                    "message": f"族 '{cluster_name}' 更新成功"
                }
            else:
                raise DataProcessingException("更新族失败")
                
        except Exception as e:
            logger.error(f"更新族时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def export_keystore_data(self) -> bytes:
        """导出关键词库数据"""
        try:
            # 获取所有关键词数据
            all_keywords = []
            groups = self.repository.get_all_groups()
            
            for group_name in groups:
                keyword_ids = self.repository.get_group_keywords(group_name)
                for keyword_id in keyword_ids:
                    keyword_data = self.repository.get_keyword(keyword_id)
                    if keyword_data:
                        # 添加族信息
                        cluster_name = self._get_cluster_for_group(group_name)
                        keyword_data['cluster_name'] = cluster_name
                        all_keywords.append(keyword_data)
            
            if not all_keywords:
                return b"No data to export"
            
            # 转换为DataFrame并导出
            df = pd.DataFrame(all_keywords)
            
            # 重新排列列的顺序
            column_order = ['Keywords', 'group_name_map', 'cluster_name', 'QPM', 'DIFF']
            other_columns = [col for col in df.columns if col not in column_order]
            final_column_order = column_order + other_columns
            final_column_order = [col for col in final_column_order if col in df.columns]
            
            df = df[final_column_order]
            
            logger.info(f"导出关键词库数据: {len(df)} 行, {len(df.columns)} 列")
            logger.info(f"导出列: {list(df.columns)}")
            
            return df.to_csv(index=False).encode('utf-8')
            
        except Exception as e:
            logger.error(f"导出关键词库数据时出错: {str(e)}")
            return b"Export error occurred"
    
    def _get_cluster_for_group(self, group_name: str) -> str:
        """获取组所属的族"""
        clusters_data = self.get_clusters_data()
        for cluster_name, group_names in clusters_data.items():
            if group_name in group_names:
                return cluster_name
        return ""
    
    def reset_data(self) -> Dict[str, Any]:
        """重置所有数据"""
        try:
            success = self.repository.clear_all_data()
            self._file_stats = []
            
            if success:
                logger.info("关键词库数据已重置")
                return {"success": True, "message": "数据已重置"}
            else:
                raise DataProcessingException("重置数据失败")
                
        except Exception as e:
            logger.error(f"重置数据时出错: {str(e)}")
            raise DataProcessingException(str(e))
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        try:
            redis_health = self.redis_manager.health_check()
            return {
                "processor_status": "healthy",
                "redis_status": redis_health["status"],
                "redis_response_time": redis_health.get("response_time_ms", 0)
            }
        except Exception as e:
            logger.error(f"健康检查失败: {str(e)}")
            return {
                "processor_status": "unhealthy",
                "error": str(e)
            }