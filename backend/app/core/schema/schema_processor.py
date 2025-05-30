"""
扩展的结构化数据生成器处理器
增加批量处理功能：CSV导入、多文件合并、批量生成
"""

import os
import json
import pandas as pd
import tempfile
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from fastapi import UploadFile
from collections import defaultdict
import logging

# 导入现有的处理工具
from app.shared.utils.data_utils import read_file, get_dataframe_stats
from app.shared.utils.column_name_utils import find_column_name

logger = logging.getLogger(__name__)


class SchemaProcessor:
    def __init__(self):
        """初始化结构化数据处理器"""
        # 现有的单个生成功能
        self.supported_schemas = {
            'Article': self._generate_article_schema,
            'Breadcrumb': self._generate_breadcrumb_schema,
            'Event': self._generate_event_schema,
            'FAQPage': self._generate_faq_schema,
            'HowTo': self._generate_howto_schema,
            'Organization': self._generate_organization_schema,
            'Person': self._generate_person_schema,
            'Product': self._generate_product_schema,
            'VideoObject': self._generate_video_schema,
            'WebSite': self._generate_website_schema,
        }
        
        # 新增：批量处理相关数据
        self.batch_data = pd.DataFrame()  # 存储批量导入的数据
        self.processed_schemas = {}  # 存储按URL组织的生成结果
        self.file_stats = []  # 文件统计信息
        self.processing_errors = []  # 处理错误记录
        
        # CSV文件必需列的映射
        self.required_columns_mapping = {
            'url': ['url', 'page_url', 'target_url', 'link'],
            'schema_type': ['schema_type', 'type', 'structured_data_type', 'markup_type'],
            'data_json': ['data_json', 'data', 'schema_data', 'fields_json']
        }
    
    async def process_batch_files(self, files: List[UploadFile]) -> Dict[str, Any]:
        """
        批量处理CSV文件
        """
        logger.info(f"开始处理 {len(files)} 个CSV文件")
        
        # 重置状态
        self.batch_data = pd.DataFrame()
        self.processed_schemas = {}
        self.file_stats = []
        self.processing_errors = []
        
        dataframes = []
        
        try:
            for file in files:
                # 创建临时文件存储上传内容
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                    content = await file.read()
                    temp_file.write(content)
                    temp_file.flush()
                    
                    # 读取并验证CSV文件
                    df = read_file(temp_file.name)
                    validation_result = self._validate_batch_csv(df, file.filename)
                    
                    if validation_result['is_valid']:
                        # 标准化列名
                        standardized_df = self._standardize_column_names(df)
                        dataframes.append(standardized_df)
                        
                        # 记录文件统计
                        self.file_stats.append({
                            "filename": file.filename,
                            "stats": get_dataframe_stats(standardized_df),
                            "schema_types": standardized_df['schema_type'].value_counts().to_dict(),
                            "unique_urls": standardized_df['url'].nunique()
                        })
                    else:
                        self.processing_errors.extend(validation_result['errors'])
                    
                    # 清理临时文件
                    os.unlink(temp_file.name)
            
            if dataframes:
                # 合并所有数据框
                self.batch_data = pd.concat(dataframes, ignore_index=True)
                
                # 去重处理（同一URL+schema_type组合只保留最后一个）
                self.batch_data = self.batch_data.drop_duplicates(
                    subset=['url', 'schema_type'], 
                    keep='last'
                )
                
                logger.info(f"合并后数据总计: {len(self.batch_data)} 行")
            
            return {
                "success": True,
                "file_stats": self.file_stats,
                "total_rows": len(self.batch_data),
                "unique_urls": self.batch_data['url'].nunique() if not self.batch_data.empty else 0,
                "schema_types": self.batch_data['schema_type'].value_counts().to_dict() if not self.batch_data.empty else {},
                "processing_errors": self.processing_errors
            }
            
        except Exception as e:
            logger.error(f"批量文件处理失败: {str(e)}")
            return {
                "success": False,
                "error": f"文件处理失败: {str(e)}",
                "processing_errors": self.processing_errors
            }
    
    def _validate_batch_csv(self, df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """
        验证CSV文件是否包含必需的列
        """
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }
        
        # 检查必需列
        found_columns = {
            'url': None,
            'schema_type': None, 
            'data_json': None
        }
        
        # 修复：正确调用 find_column_name 函数
        for concept in self.required_columns_mapping.keys():
            found_column = find_column_name(df, concept, self.required_columns_mapping)
            if found_column:
                found_columns[concept] = found_column
            else:
                validation_result["is_valid"] = False
                validation_result["errors"].append(
                    f"文件 {filename} 缺少必需列 '{concept}'，期望列名: {', '.join(self.required_columns_mapping[concept])}"
                )
        
        # 检查数据质量
        if validation_result["is_valid"]:
            url_col = found_columns['url']
            schema_col = found_columns['schema_type']
            data_col = found_columns['data_json']
            
            # 检查空值
            empty_urls = df[url_col].isna().sum()
            empty_schemas = df[schema_col].isna().sum()
            empty_data = df[data_col].isna().sum()
            
            if empty_urls > 0:
                validation_result["warnings"].append(f"文件 {filename} 有 {empty_urls} 行URL为空")
            if empty_schemas > 0:
                validation_result["warnings"].append(f"文件 {filename} 有 {empty_schemas} 行schema_type为空")
            if empty_data > 0:
                validation_result["warnings"].append(f"文件 {filename} 有 {empty_data} 行data_json为空")
            
            # 检查支持的结构化数据类型
            unique_types = df[schema_col].dropna().unique()
            unsupported_types = [t for t in unique_types if t not in self.supported_schemas]
            if unsupported_types:
                validation_result["warnings"].append(
                    f"文件 {filename} 包含不支持的结构化数据类型: {', '.join(unsupported_types)}"
                )
        
        return validation_result
    
    def _standardize_column_names(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        标准化列名为统一格式
        """
        standardized_df = df.copy()
        
        # 查找并重命名列
        rename_mapping = {}
        
        for concept in self.required_columns_mapping.keys():
            # 修复：正确调用 find_column_name 函数
            found_column = find_column_name(df, concept, self.required_columns_mapping)
            if found_column and found_column != concept:
                # 将找到的列名重命名为概念名（标准名）
                rename_mapping[found_column] = concept
        
        # 应用重命名
        if rename_mapping:
            standardized_df = standardized_df.rename(columns=rename_mapping)
            logger.info(f"列名标准化完成: {rename_mapping}")
        
        return standardized_df
    
    def generate_batch_schemas(self, url_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        批量生成结构化数据
        """
        if self.batch_data.empty:
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
        data_to_process = self.batch_data
        if url_filter:
            data_to_process = self.batch_data[
                self.batch_data['url'].str.contains(url_filter, case=False, na=False)
            ]
        
        try:
            # 按URL分组处理
            for url, group in data_to_process.groupby('url'):
                url_schemas = []
                
                for _, row in group.iterrows():
                    try:
                        schema_type = row['schema_type']
                        
                        # 解析JSON数据
                        if pd.isna(row['data_json']) or row['data_json'] == '':
                            generation_errors.append(f"URL {url} 的 {schema_type} 数据为空")
                            continue
                        
                        try:
                            data_dict = json.loads(row['data_json'])
                        except json.JSONDecodeError as e:
                            generation_errors.append(f"URL {url} 的 {schema_type} JSON格式错误: {str(e)}")
                            continue
                        
                        # 生成结构化数据
                        if schema_type in self.supported_schemas:
                            schema_result = self.generate_schema(schema_type, data_dict)
                            if schema_result['success']:
                                url_schemas.append(schema_result['schema_data'])
                                successful_count += 1
                            else:
                                generation_errors.append(f"URL {url} 的 {schema_type} 生成失败")
                        else:
                            generation_errors.append(f"不支持的结构化数据类型: {schema_type}")
                    
                    except Exception as e:
                        generation_errors.append(f"处理 URL {url} 的 {row['schema_type']} 时发生错误: {str(e)}")
                
                # 存储URL的所有结构化数据
                if url_schemas:
                    self.processed_schemas[url] = {
                        "schemas": url_schemas,
                        "schema_count": len(url_schemas),
                        "generated_at": datetime.now().isoformat()
                    }
            
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
            logger.error(f"批量生成结构化数据失败: {str(e)}")
            return {
                "success": False,
                "error": f"批量生成失败: {str(e)}",
                "generation_errors": generation_errors
            }
    
    def export_batch_schemas(self, export_type: str = "combined") -> Dict[str, Any]:
        """
        导出批量生成的结构化数据
        export_type: "combined" | "separated"
        """
        if not self.processed_schemas:
            return {
                "success": False,
                "error": "没有可导出的数据，请先生成结构化数据"
            }
        
        try:
            if export_type == "combined":
                # 导出为单个JSON文件
                export_data = {
                    "generated_at": datetime.now().isoformat(),
                    "total_urls": len(self.processed_schemas),
                    "total_schemas": sum(data["schema_count"] for data in self.processed_schemas.values()),
                    "urls": self.processed_schemas
                }
                
                return {
                    "success": True,
                    "export_type": "combined",
                    "data": json.dumps(export_data, indent=2, ensure_ascii=False),
                    "filename": f"structured_data_batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                }
            
            elif export_type == "separated":
                # 导出为按URL分离的多个JSON-LD文件
                separated_data = {}
                
                for url, data in self.processed_schemas.items():
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
    
    def _generate_safe_filename(self, url: str) -> str:
        """
        生成安全的文件名
        """
        import re
        # 移除协议和特殊字符
        safe_name = re.sub(r'https?://', '', url)
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', safe_name)
        safe_name = safe_name.replace('.', '_')
        
        # 限制长度
        if len(safe_name) > 50:
            safe_name = safe_name[:50]
        
        return f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    def get_batch_summary(self) -> Dict[str, Any]:
        """
        获取批量处理摘要信息
        """
        return {
            "has_batch_data": not self.batch_data.empty,
            "total_rows": len(self.batch_data) if not self.batch_data.empty else 0,
            "unique_urls": self.batch_data['url'].nunique() if not self.batch_data.empty else 0,
            "schema_types": self.batch_data['schema_type'].value_counts().to_dict() if not self.batch_data.empty else {},
            "processed_urls": len(self.processed_schemas),
            "files_processed": len(self.file_stats),
            "has_errors": len(self.processing_errors) > 0,
            "error_count": len(self.processing_errors)
        }
    
    def reset_batch_data(self) -> None:
        """
        重置批量处理数据
        """
        self.batch_data = pd.DataFrame()
        self.processed_schemas = {}
        self.file_stats = []
        self.processing_errors = []
    
    def get_supported_schemas(self) -> Dict[str, Dict[str, Any]]:
        """
        获取支持的结构化数据类型及其配置 (保持原有功能)
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
            # ... 其他类型定义保持不变
        }
    
    def generate_schema(self, schema_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成指定类型的结构化数据 (保持原有功能)
        """
        if schema_type not in self.supported_schemas:
            raise ValueError(f"不支持的结构化数据类型: {schema_type}")
        
        # 生成结构化数据
        schema_generator = self.supported_schemas[schema_type]
        schema_data = schema_generator(data)
        
        # 格式化输出
        json_ld = json.dumps(schema_data, indent=2, ensure_ascii=False)
        html_script = f'<script type="application/ld+json">\n{json_ld}\n</script>'
        
        return {
            'success': True,
            'schema_type': schema_type,
            'schema_data': schema_data,
            'json_ld': json_ld,
            'html_script': html_script
        }
    
    # 保持所有原有的生成方法不变
    def _generate_article_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成文章结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": data["headline"],
            "author": {
                "@type": "Person",
                "name": data["author"]
            },
            "datePublished": data["datePublished"]
        }
        
        # 添加可选字段
        if data.get("description"):
            schema["description"] = data["description"]
        if data.get("image"):
            schema["image"] = data["image"]
        if data.get("publisher"):
            schema["publisher"] = {
                "@type": "Organization",
                "name": data["publisher"]
            }
        if data.get("dateModified"):
            schema["dateModified"] = data["dateModified"]
            
        return schema
    
    # ... 其他生成方法保持不变，这里省略以节省空间
    
    def _generate_product_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成产品结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": data["name"]
        }
        
        if data.get("description"):
            schema["description"] = data["description"]
        if data.get("image"):
            schema["image"] = data["image"]
        if data.get("brand"):
            schema["brand"] = {
                "@type": "Brand",
                "name": data["brand"]
            }
        if data.get("price") and data.get("currency"):
            schema["offers"] = {
                "@type": "Offer",
                "price": str(data["price"]),
                "priceCurrency": data["currency"],
                "availability": "https://schema.org/InStock"
            }
            
        return schema
    
    def _generate_organization_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成组织结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": data["name"]
        }
        
        if data.get("url"):
            schema["url"] = data["url"]
        if data.get("description"):
            schema["description"] = data["description"]
        if data.get("logo"):
            schema["logo"] = data["logo"]
        if data.get("telephone"):
            schema["contactPoint"] = {
                "@type": "ContactPoint",
                "telephone": data["telephone"],
                "contactType": "customer service"
            }
            
        return schema
    
    def _generate_person_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成人物结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": data["name"]
        }
        
        if data.get("jobTitle"):
            schema["jobTitle"] = data["jobTitle"]
        if data.get("worksFor"):
            schema["worksFor"] = {
                "@type": "Organization",
                "name": data["worksFor"]
            }
        if data.get("description"):
            schema["description"] = data["description"]
        if data.get("url"):
            schema["url"] = data["url"]
        if data.get("image"):
            schema["image"] = data["image"]
            
        return schema
    
    def _generate_event_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成事件结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": data["name"],
            "startDate": data["startDate"],
            "location": {
                "@type": "Place",
                "name": data["location"]
            }
        }
        
        if data.get("description"):
            schema["description"] = data["description"]
        if data.get("endDate"):
            schema["endDate"] = data["endDate"]
        if data.get("organizer"):
            schema["organizer"] = {
                "@type": "Organization",
                "name": data["organizer"]
            }
        if data.get("price"):
            schema["offers"] = {
                "@type": "Offer",
                "price": str(data["price"]),
                "priceCurrency": "USD"
            }
            
        return schema
    
    def _generate_video_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成视频结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "name": data["name"],
            "description": data["description"],
            "thumbnailUrl": data["thumbnailUrl"]
        }
        
        if data.get("uploadDate"):
            schema["uploadDate"] = data["uploadDate"]
        if data.get("duration"):
            schema["duration"] = data["duration"]
        if data.get("contentUrl"):
            schema["contentUrl"] = data["contentUrl"]
            
        return schema
    
    def _generate_website_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成网站结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": data["name"],
            "url": data["url"]
        }
        
        if data.get("description"):
            schema["description"] = data["description"]
        if data.get("searchUrl"):
            schema["potentialAction"] = {
                "@type": "SearchAction",
                "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": data["searchUrl"]
                },
                "query-input": "required name=search_term_string"
            }
            
        return schema
    
    def _generate_breadcrumb_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成面包屑导航结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": []
        }
        
        if data.get("items"):
            items_text = data["items"]
            lines = [line.strip() for line in items_text.split('\n') if line.strip()]
            
            for i, line in enumerate(lines):
                if '|' in line:
                    name, url = line.split('|', 1)
                    schema["itemListElement"].append({
                        "@type": "ListItem",
                        "position": i + 1,
                        "name": name.strip(),
                        "item": url.strip()
                    })
                else:
                    schema["itemListElement"].append({
                        "@type": "ListItem",
                        "position": i + 1,
                        "name": line.strip()
                    })
                    
        return schema
    
    def _generate_faq_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成FAQ页面结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": []
        }
        
        if data.get("faqs"):
            faq_text = data["faqs"]
            lines = [line.strip() for line in faq_text.split('\n') if line.strip()]
            
            # 每两行组成一个问答对
            for i in range(0, len(lines), 2):
                if i + 1 < len(lines):
                    question = lines[i]
                    answer = lines[i + 1]
                    schema["mainEntity"].append({
                        "@type": "Question",
                        "name": question,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": answer
                        }
                    })
                    
        return schema
    
    def _generate_howto_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成操作指南结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": data["name"],
            "step": []
        }
        
        if data.get("description"):
            schema["description"] = data["description"]
        if data.get("totalTime"):
            schema["totalTime"] = data["totalTime"]
            
        if data.get("steps"):
            steps_text = data["steps"]
            lines = [line.strip() for line in steps_text.split('\n') if line.strip()]
            
            for i, step_text in enumerate(lines):
                schema["step"].append({
                    "@type": "HowToStep",
                    "name": f"步骤 {i + 1}",
                    "text": step_text
                })
                
        return schema