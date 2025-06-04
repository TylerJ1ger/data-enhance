"""
导出功能模块 - backend/app/core/schema/exporters.py
负责结构化数据的各种导出格式处理
"""

import json
import re
from typing import Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SchemaExporter:
    """结构化数据导出器类"""
    
    def __init__(self):
        """初始化导出器"""
        pass
    
    def export_batch_schemas(self, processed_schemas: Dict[str, Any], export_type: str = "combined") -> Dict[str, Any]:
        """
        导出批量生成的结构化数据
        
        Args:
            processed_schemas: 已处理的结构化数据字典
            export_type: 导出类型 ("combined" | "separated")
            
        Returns:
            导出结果字典
        """
        if not processed_schemas:
            return {
                "success": False,
                "error": "没有可导出的数据，请先生成结构化数据"
            }
        
        try:
            if export_type == "combined":
                return self._export_combined_format(processed_schemas)
            elif export_type == "separated":
                return self._export_separated_format(processed_schemas)
            else:
                return {
                    "success": False,
                    "error": f"不支持的导出类型: {export_type}"
                }
                
        except Exception as e:
            logger.error(f"导出批量结构化数据失败: {str(e)}")
            return {
                "success": False,
                "error": f"导出失败: {str(e)}"
            }
    
    def _export_combined_format(self, processed_schemas: Dict[str, Any]) -> Dict[str, Any]:
        """
        导出为单个JSON文件格式
        
        Args:
            processed_schemas: 已处理的结构化数据
            
        Returns:
            合并导出结果
        """
        # 导出为单个JSON文件
        export_data = {
            "generated_at": datetime.now().isoformat(),
            "total_urls": len(processed_schemas),
            "total_schemas": sum(data["schema_count"] for data in processed_schemas.values()),
            "urls": processed_schemas
        }
        
        return {
            "success": True,
            "export_type": "combined",
            "data": json.dumps(export_data, indent=2, ensure_ascii=False),
            "filename": f"structured_data_batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }
    
    def _export_separated_format(self, processed_schemas: Dict[str, Any]) -> Dict[str, Any]:
        """
        导出为按URL分离的多个JSON-LD文件格式
        
        Args:
            processed_schemas: 已处理的结构化数据
            
        Returns:
            分离导出结果
        """
        # 导出为按URL分离的多个JSON-LD文件
        separated_data = {}
        
        for url, data in processed_schemas.items():
            # 生成安全的文件名
            safe_filename = self._generate_safe_filename(url)
            
            # 生成JSON-LD格式
            if len(data["schemas"]) == 1:
                # 单个结构化数据
                json_ld = json.dumps(data["schemas"][0], indent=2, ensure_ascii=False)
            else:
                # 多个结构化数据作为数组
                json_ld = json.dumps(data["schemas"], indent=2, ensure_ascii=False)
            
            separated_data[safe_filename] = {
                "url": url,
                "schema_count": data["schema_count"],
                "json_ld": json_ld,
                "html_script": f'<script type="application/ld+json">\n{json_ld}\n</script>'
            }
        
        return {
            "success": True,
            "export_type": "separated",
            "data": separated_data,
            "total_files": len(separated_data)
        }
    
    def _generate_safe_filename(self, url: str) -> str:
        """
        生成安全的文件名
        
        Args:
            url: 原始URL
            
        Returns:
            安全的文件名字符串
        """
        # 移除协议和特殊字符
        safe_name = re.sub(r'https?://', '', url)
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', safe_name)
        safe_name = safe_name.replace('.', '_')
        
        # 限制长度
        if len(safe_name) > 50:
            safe_name = safe_name[:50]
        
        return f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    def export_single_schema_as_json(self, schema_data: Dict[str, Any]) -> str:
        """
        将单个结构化数据导出为JSON字符串
        
        Args:
            schema_data: 结构化数据字典
            
        Returns:
            JSON字符串
        """
        return json.dumps(schema_data, indent=2, ensure_ascii=False)
    
    def export_single_schema_as_html_script(self, schema_data: Dict[str, Any]) -> str:
        """
        将单个结构化数据导出为HTML script标签
        
        Args:
            schema_data: 结构化数据字典
            
        Returns:
            HTML script标签字符串
        """
        json_ld = self.export_single_schema_as_json(schema_data)
        return f'<script type="application/ld+json">\n{json_ld}\n</script>'
    
    def get_export_statistics(self, processed_schemas: Dict[str, Any]) -> Dict[str, Any]:
        """
        获取导出统计信息
        
        Args:
            processed_schemas: 已处理的结构化数据
            
        Returns:
            统计信息字典
        """
        if not processed_schemas:
            return {
                "total_urls": 0,
                "total_schemas": 0,
                "schema_types": {},
                "estimated_file_sizes": {
                    "combined_json": 0,
                    "separated_files": 0
                }
            }
        
        # 统计Schema类型分布
        schema_type_counts = {}
        total_schemas = 0
        
        for url, data in processed_schemas.items():
            total_schemas += data["schema_count"]
            for schema in data["schemas"]:
                schema_type = schema.get("@type", "Unknown")
                schema_type_counts[schema_type] = schema_type_counts.get(schema_type, 0) + 1
        
        # 估算文件大小
        sample_json = json.dumps(processed_schemas, ensure_ascii=False)
        estimated_combined_size = len(sample_json.encode('utf-8'))
        
        return {
            "total_urls": len(processed_schemas),
            "total_schemas": total_schemas,
            "schema_types": schema_type_counts,
            "estimated_file_sizes": {
                "combined_json_bytes": estimated_combined_size,
                "combined_json_kb": round(estimated_combined_size / 1024, 2),
                "separated_files_count": len(processed_schemas),
                "avg_file_size_kb": round(estimated_combined_size / len(processed_schemas) / 1024, 2) if processed_schemas else 0
            }
        }
    
    def validate_export_data(self, processed_schemas: Dict[str, Any]) -> Dict[str, Any]:
        """
        验证导出数据的完整性
        
        Args:
            processed_schemas: 已处理的结构化数据
            
        Returns:
            验证结果字典
        """
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }
        
        if not processed_schemas:
            validation_result["is_valid"] = False
            validation_result["errors"].append("没有可导出的数据")
            return validation_result
        
        # 检查每个URL的数据完整性
        for url, data in processed_schemas.items():
            if not isinstance(data, dict):
                validation_result["errors"].append(f"URL {url} 的数据格式不正确")
                continue
            
            if "schemas" not in data:
                validation_result["errors"].append(f"URL {url} 缺少schemas字段")
                continue
            
            if not isinstance(data["schemas"], list):
                validation_result["errors"].append(f"URL {url} 的schemas字段不是列表格式")
                continue
            
            if len(data["schemas"]) == 0:
                validation_result["warnings"].append(f"URL {url} 没有结构化数据")
                continue
            
            # 检查每个schema的格式
            for i, schema in enumerate(data["schemas"]):
                if not isinstance(schema, dict):
                    validation_result["errors"].append(f"URL {url} 第{i+1}个schema格式不正确")
                    continue
                
                if "@type" not in schema:
                    validation_result["warnings"].append(f"URL {url} 第{i+1}个schema缺少@type字段")
                
                if "@context" not in schema:
                    validation_result["warnings"].append(f"URL {url} 第{i+1}个schema缺少@context字段")
        
        # 如果有错误，标记为无效
        if validation_result["errors"]:
            validation_result["is_valid"] = False
        
        return validation_result