"""
结构化数据主处理器 - backend/app/core/schema/schema_processor.py
作为协调器整合各个子模块功能，对外提供统一的API接口
"""

import json
import pandas as pd  # 修复：添加pandas导入
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import UploadFile
import logging

# 导入重构后的各个子模块
from .generators import SchemaGenerators
from .batch_processor import BatchProcessor
from .exporters import SchemaExporter

logger = logging.getLogger(__name__)


class SchemaProcessor:
    """
    结构化数据主处理器
    作为协调器整合Schema生成、批量处理和导出功能
    """
    
    def __init__(self):
        """初始化主处理器和各个子模块"""
        # 初始化各个子模块
        self.generators = SchemaGenerators()
        self.batch_processor = BatchProcessor()
        self.exporter = SchemaExporter()
        
        # 存储批量生成的结构化数据
        self.processed_schemas = {}
        
        logger.info("结构化数据处理器初始化完成")
    
    # ================================
    # 单个Schema生成相关方法（对外接口）
    # ================================
    
    def get_supported_schemas(self) -> Dict[str, Dict[str, Any]]:
        """
        获取支持的结构化数据类型及其配置
        保持与原有API的兼容性
        """
        return {
            'Article': {
                'name': '文章',
                'description': '新闻文章、博客文章或其他文本内容',
                'required_fields': ['headline', 'author', 'datePublished'],
                'fields': {
                    'headline': {'label': '文章标题', 'type': 'text', 'required': True, 'placeholder': '输入文章标题'},
                    'author': {'label': '作者姓名', 'type': 'text', 'required': True, 'placeholder': '输入作者姓名'},
                    'datePublished': {'label': '发布日期', 'type': 'date', 'required': True, 'placeholder': 'YYYY-MM-DD'},
                    'description': {'label': '文章描述', 'type': 'textarea', 'required': False, 'placeholder': '输入文章简介或摘要'},
                    'image': {'label': '文章配图URL', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/image.jpg'},
                    'publisher': {'label': '发布机构', 'type': 'text', 'required': False, 'placeholder': '发布网站或机构名称'},
                }
            },
            'Product': {
                'name': '产品',
                'description': '商品或服务信息',
                'required_fields': ['name'],
                'fields': {
                    'name': {'label': '产品名称', 'type': 'text', 'required': True, 'placeholder': '输入产品名称'},
                    'description': {'label': '产品描述', 'type': 'textarea', 'required': False, 'placeholder': '输入产品详细描述'},
                    'brand': {'label': '品牌名称', 'type': 'text', 'required': False, 'placeholder': '输入品牌名称'},
                    'price': {'label': '价格', 'type': 'number', 'required': False, 'placeholder': '输入价格'},
                    'currency': {'label': '货币代码', 'type': 'text', 'required': False, 'placeholder': 'CNY, USD, EUR等'},
                    'image': {'label': '产品图片URL', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/product.jpg'},
                }
            },
            'Organization': {
                'name': '组织',
                'description': '公司、组织或机构信息',
                'required_fields': ['name'],
                'fields': {
                    'name': {'label': '组织名称', 'type': 'text', 'required': True, 'placeholder': '输入组织名称'},
                    'url': {'label': '官方网址', 'type': 'url', 'required': False, 'placeholder': 'https://example.com'},
                    'description': {'label': '组织描述', 'type': 'textarea', 'required': False, 'placeholder': '输入组织简介'},
                    'logo': {'label': 'Logo URL', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/logo.jpg'},
                    'telephone': {'label': '联系电话', 'type': 'text', 'required': False, 'placeholder': '+86-10-12345678'},
                }
            },
            'Person': {
                'name': '人物',
                'description': '个人或人物信息',
                'required_fields': ['name'],
                'fields': {
                    'name': {'label': '姓名', 'type': 'text', 'required': True, 'placeholder': '输入姓名'},
                    'jobTitle': {'label': '职位', 'type': 'text', 'required': False, 'placeholder': '输入职位'},
                    'worksFor': {'label': '工作单位', 'type': 'text', 'required': False, 'placeholder': '输入工作单位'},
                    'description': {'label': '个人描述', 'type': 'textarea', 'required': False, 'placeholder': '输入个人简介'},
                    'url': {'label': '个人网址', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/profile'},
                    'image': {'label': '照片URL', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/photo.jpg'},
                }
            },
            'Event': {
                'name': '事件',
                'description': '会议、演出、活动等事件信息',
                'required_fields': ['name', 'startDate', 'location'],
                'fields': {
                    'name': {'label': '事件名称', 'type': 'text', 'required': True, 'placeholder': '输入事件名称'},
                    'startDate': {'label': '开始时间', 'type': 'datetime-local', 'required': True, 'placeholder': '选择开始时间'},
                    'location': {'label': '事件地点', 'type': 'text', 'required': True, 'placeholder': '输入事件地点'},
                    'endDate': {'label': '结束时间', 'type': 'datetime-local', 'required': False, 'placeholder': '选择结束时间'},
                    'description': {'label': '事件描述', 'type': 'textarea', 'required': False, 'placeholder': '输入事件详情'},
                    'organizer': {'label': '主办方', 'type': 'text', 'required': False, 'placeholder': '输入主办方名称'},
                }
            },
            'VideoObject': {
                'name': '视频',
                'description': '视频内容信息',
                'required_fields': ['name', 'description', 'thumbnailUrl'],
                'fields': {
                    'name': {'label': '视频标题', 'type': 'text', 'required': True, 'placeholder': '输入视频标题'},
                    'description': {'label': '视频描述', 'type': 'textarea', 'required': True, 'placeholder': '输入视频描述'},
                    'thumbnailUrl': {'label': '缩略图URL', 'type': 'url', 'required': True, 'placeholder': 'https://example.com/thumbnail.jpg'},
                    'uploadDate': {'label': '上传日期', 'type': 'date', 'required': False, 'placeholder': 'YYYY-MM-DD'},
                    'duration': {'label': '视频时长', 'type': 'text', 'required': False, 'placeholder': 'PT5M30S'},
                    'contentUrl': {'label': '视频链接', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/video.mp4'},
                }
            },
            'WebSite': {
                'name': '网站',
                'description': '网站基本信息',
                'required_fields': ['name', 'url'],
                'fields': {
                    'name': {'label': '网站名称', 'type': 'text', 'required': True, 'placeholder': '输入网站名称'},
                    'url': {'label': '网站URL', 'type': 'url', 'required': True, 'placeholder': 'https://example.com'},
                    'description': {'label': '网站描述', 'type': 'textarea', 'required': False, 'placeholder': '输入网站简介'},
                    'searchUrl': {'label': '搜索URL模板', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/search?q={search_term_string}'},
                }
            },
            'Breadcrumb': {
                'name': '面包屑导航',
                'description': '页面导航路径',
                'required_fields': ['items'],
                'fields': {
                    'items': {'label': '导航项目', 'type': 'textarea', 'required': True, 'placeholder': '首页|https://example.com\n产品|https://example.com/products\n详情页|https://example.com/products/123'},
                }
            },
            'FAQPage': {
                'name': '常见问题页面',
                'description': '常见问题页面',
                'required_fields': ['faqs'],
                'fields': {
                    'faqs': {'label': '问答内容', 'type': 'textarea', 'required': True, 'placeholder': '问题1\n答案1\n\n问题2\n答案2'},
                }
            },
            'HowTo': {
                'name': '操作指南',
                'description': '分步骤的操作教程',
                'required_fields': ['name', 'steps'],
                'fields': {
                    'name': {'label': '指南标题', 'type': 'text', 'required': True, 'placeholder': '输入指南标题'},
                    'description': {'label': '指南描述', 'type': 'textarea', 'required': False, 'placeholder': '输入指南简介'},
                    'steps': {'label': '操作步骤', 'type': 'textarea', 'required': True, 'placeholder': '步骤1：准备材料\n步骤2：开始操作\n步骤3：完成'},
                    'totalTime': {'label': '所需时间', 'type': 'text', 'required': False, 'placeholder': 'PT30M'},
                }
            }
        }
    
    def generate_schema(self, schema_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成指定类型的结构化数据
        保持与原有API的兼容性
        """
        if schema_type not in self.generators.get_supported_types():
            raise ValueError(f"不支持的结构化数据类型: {schema_type}")
        
        # 使用生成器模块生成结构化数据
        schema_data = self.generators.generate(schema_type, data)
        
        # 格式化输出，保持与原有API的兼容性
        json_ld = json.dumps(schema_data, indent=2, ensure_ascii=False)
        html_script = f'<script type="application/ld+json">\n{json_ld}\n</script>'
        
        return {
            'success': True,
            'schema_type': schema_type,
            'schema_data': schema_data,
            'json_ld': json_ld,
            'html_script': html_script
        }
    
    # ================================
    # 批量处理相关方法（委托给批量处理器）
    # ================================
    
    async def process_batch_files(self, files: List[UploadFile]) -> Dict[str, Any]:
        """批量处理CSV文件"""
        return await self.batch_processor.process_batch_files(files)
    
    def get_dynamic_csv_template(self, schema_type: str) -> Dict[str, Any]:
        """获取动态CSV模板"""
        return self.batch_processor.get_dynamic_csv_template(schema_type)
    
    def generate_batch_schemas(self, url_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        批量生成结构化数据
        """
        if self.batch_processor.batch_data.empty:
            return {
                "success": False,
                "error": "没有可处理的数据，请先上传CSV文件"
            }
        
        logger.info("开始批量生成结构化数据")
        
        # 重置结果
        self.processed_schemas = {}
        generation_errors = []
        successful_count = 0
        
        # 过滤数据（如果指定了URL过滤器）
        data_to_process = self.batch_processor.batch_data
        if url_filter:
            data_to_process = self.batch_processor.batch_data[
                self.batch_processor.batch_data['url'].str.contains(url_filter, case=False, na=False)
            ]
        
        try:
            # 按URL分组处理
            for url, group in data_to_process.groupby('url'):
                url_schemas = []
                
                for _, row in group.iterrows():
                    try:
                        schema_type = row['schema_type']
                        
                        # 解析JSON数据 - 修复：使用正确的pandas函数
                        if pd.isna(row['data_json']) or row['data_json'] == '':
                            generation_errors.append(f"URL {url} 的 {schema_type} 数据为空")
                            continue
                        
                        try:
                            data_dict = json.loads(row['data_json'])
                        except json.JSONDecodeError as e:
                            generation_errors.append(f"URL {url} 的 {schema_type} JSON格式错误: {str(e)}")
                            continue
                        
                        # 使用生成器模块生成结构化数据
                        if self.generators.has_generator(schema_type):
                            schema_data = self.generators.generate(schema_type, data_dict)
                            url_schemas.append(schema_data)
                            successful_count += 1
                        else:
                            generation_errors.append(f"不支持的结构化数据类型: {schema_type}")
                    
                    except Exception as e:
                        generation_errors.append(f"处理 URL {url} 的 {row['schema_type']} 时发生错误: {str(e)}")
                        logger.error(f"批量生成错误: {str(e)}", exc_info=True)  # 添加详细错误日志
                
                # 存储URL的所有结构化数据
                if url_schemas:
                    self.processed_schemas[url] = {
                        "schemas": url_schemas,
                        "schema_count": len(url_schemas),
                        "generated_at": datetime.now().isoformat()
                    }
            
            logger.info(f"批量生成完成：成功 {successful_count} 个，错误 {len(generation_errors)} 个")
            
            return {
                "success": True,
                "total_processed": successful_count,
                "unique_urls": len(self.processed_schemas),
                "generation_errors": generation_errors,
                "preview": {
                    url: {
                        "schema_count": data["schema_count"],
                        "types": [schema.get("@type", "Unknown") for schema in data["schemas"]]
                    }
                    for url, data in list(self.processed_schemas.items())[:5]  # 只显示前5个作为预览
                }
            }
            
        except Exception as e:
            logger.error(f"批量生成结构化数据失败: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": f"批量生成失败: {str(e)}",
                "generation_errors": generation_errors + [f"系统错误: {str(e)}"]
            }
    
    def get_batch_summary(self) -> Dict[str, Any]:
        """获取批量处理摘要信息"""
        base_summary = self.batch_processor.get_batch_summary()
        
        # 添加已生成数据的信息
        base_summary["processed_urls"] = len(self.processed_schemas)
        
        return base_summary
    
    def reset_batch_data(self) -> None:
        """重置批量处理数据"""
        self.batch_processor.reset_batch_data()
        self.processed_schemas = {}
    
    # ================================
    # 导出相关方法（委托给导出器）
    # ================================
    
    def export_batch_schemas(self, export_type: str = "combined") -> Dict[str, Any]:
        """导出批量生成的结构化数据"""
        return self.exporter.export_batch_schemas(self.processed_schemas, export_type)
    
    # ================================
    # 工具方法
    # ================================
    
    def get_export_statistics(self) -> Dict[str, Any]:
        """获取导出统计信息"""
        return self.exporter.get_export_statistics(self.processed_schemas)
    
    def validate_schema_data(self, schema_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        验证Schema数据的完整性
        """
        supported_schemas = self.get_supported_schemas()
        
        if schema_type not in supported_schemas:
            return {
                "is_valid": False,
                "errors": [f"不支持的结构化数据类型: {schema_type}"]
            }
        
        schema_config = supported_schemas[schema_type]
        errors = []
        
        # 检查必需字段
        for field in schema_config['required_fields']:
            if field not in data or not data[field]:
                field_label = schema_config['fields'][field]['label']
                errors.append(f"缺少必需字段: {field_label}")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }