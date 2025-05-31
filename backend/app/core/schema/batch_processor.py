"""
批量处理模块 - backend/app/core/schema/batch_processor.py
负责CSV文件的批量上传、处理和数据生成
"""

import os
import json
import pandas as pd
import tempfile
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import UploadFile
from collections import defaultdict
import logging

from app.shared.utils.data_utils import read_file, get_dataframe_stats
from app.shared.utils.column_name_utils import find_column_name, find_multiple_column_names

logger = logging.getLogger(__name__)


class BatchProcessor:
    """批量处理器类，负责CSV文件的批量处理和数据生成"""
    
    def __init__(self):
        """初始化批量处理器"""
        self.batch_data = pd.DataFrame()  # 存储批量导入的数据
        self.file_stats = []  # 文件统计信息
        self.processing_errors = []  # 处理错误记录
        
        # 动态字段映射配置
        self.schema_field_mappings = self._init_schema_field_mappings()
        
        # 基础列名映射（必需列）
        self.required_columns_mapping = {
            'url': ['url', 'page_url', 'target_url', 'link'],
            'schema_type': ['schema_type', 'type', 'structured_data_type', 'markup_type']
        }
    
    def _init_schema_field_mappings(self) -> Dict[str, Dict[str, List[str]]]:
        """
        初始化各个schema类型的字段映射配置
        参考column_name_utils.py的设计模式
        """
        return {
            'Article': {
                'headline': ['headline', 'title', 'article_title', '标题', '文章标题'],
                'author': ['author', 'writer', 'author_name', '作者', '作者姓名'],
                'datePublished': ['datePublished', 'date_published', 'publish_date', 'published_date', 'date', '发布日期', '发表日期'],
                'description': ['description', 'summary', 'excerpt', 'abstract', '描述', '摘要', '简介'],
                'image': ['image', 'featured_image', 'thumbnail', 'img_url', 'image_url', '图片', '配图'],
                'publisher': ['publisher', 'publication', 'site_name', '发布者', '发布机构'],
                'dateModified': ['dateModified', 'date_modified', 'updated_date', 'last_modified', '修改日期', '更新日期']
            },
            'Product': {
                'name': ['name', 'product_name', 'title', '产品名称', '名称'],
                'description': ['description', 'product_description', 'details', '产品描述', '描述'],
                'brand': ['brand', 'brand_name', 'manufacturer', '品牌', '制造商'],
                'price': ['price', 'cost', 'amount', '价格', '费用'],
                'currency': ['currency', 'price_currency', 'currency_code', '货币', '币种'],
                'image': ['image', 'product_image', 'photo', 'picture', '图片', '产品图片'],
                'availability': ['availability', 'stock_status', 'in_stock', '库存状态', '可用性']
            },
            'Organization': {
                'name': ['name', 'organization_name', 'company_name', '组织名称', '公司名称'],
                'url': ['url', 'website', 'homepage', 'site_url', '网址', '官网'],
                'description': ['description', 'about', 'summary', '描述', '简介'],
                'logo': ['logo', 'logo_url', 'brand_logo', '标志', 'LOGO'],
                'telephone': ['telephone', 'phone', 'contact_number', '电话', '联系电话'],
                'email': ['email', 'contact_email', 'support_email', '邮箱', '联系邮箱'],
                'address': ['address', 'location', 'office_address', '地址', '办公地址']
            },
            'Person': {
                'name': ['name', 'full_name', 'person_name', '姓名', '全名'],
                'jobTitle': ['jobTitle', 'job_title', 'position', 'role', '职位', '工作职位'],
                'worksFor': ['worksFor', 'works_for', 'company', 'organization', '工作单位', '所属公司'],
                'description': ['description', 'bio', 'biography', 'about', '描述', '简介', '个人简介'],
                'url': ['url', 'website', 'profile_url', '个人网址', '简介页'],
                'image': ['image', 'photo', 'avatar', 'headshot', '照片', '头像'],
                'email': ['email', 'contact_email', '邮箱', '联系邮箱']
            },
            'Event': {
                'name': ['name', 'event_name', 'title', '活动名称', '事件名称'],
                'startDate': ['startDate', 'start_date', 'event_start', 'begin_date', '开始日期', '开始时间'],
                'endDate': ['endDate', 'end_date', 'event_end', 'finish_date', '结束日期', '结束时间'],
                'location': ['location', 'venue', 'address', 'place', '地点', '场地'],
                'description': ['description', 'details', 'event_description', '描述', '活动详情'],
                'organizer': ['organizer', 'host', 'event_organizer', '主办方', '组织者'],
                'price': ['price', 'ticket_price', 'cost', '价格', '票价'],
                'image': ['image', 'event_image', 'poster', '图片', '海报']
            },
            'VideoObject': {
                'name': ['name', 'video_title', 'title', '视频标题', '标题'],
                'description': ['description', 'video_description', 'summary', '视频描述', '描述'],
                'thumbnailUrl': ['thumbnailUrl', 'thumbnail_url', 'thumb', 'preview_image', '缩略图', '预览图'],
                'uploadDate': ['uploadDate', 'upload_date', 'created_date', '上传日期', '创建日期'],
                'duration': ['duration', 'video_duration', 'length', '时长', '视频时长'],
                'contentUrl': ['contentUrl', 'content_url', 'video_url', 'url', '视频链接', '内容链接']
            },
            'WebSite': {
                'name': ['name', 'site_name', 'website_name', 'title', '网站名称', '站点名称'],
                'url': ['url', 'website_url', 'site_url', 'homepage', '网址', '网站链接'],
                'description': ['description', 'site_description', 'about', '网站描述', '描述'],
                'searchUrl': ['searchUrl', 'search_url', 'search_action', '搜索链接', '搜索地址']
            },
            'Breadcrumb': {
                'items': ['items', 'breadcrumb_items', 'navigation_items', '导航项', '面包屑项']
            },
            'FAQPage': {
                'faqs': ['faqs', 'faq_items', 'questions', 'qa_pairs', '常见问题', '问答']
            },
            'HowTo': {
                'name': ['name', 'title', 'how_to_title', '标题', '教程标题'],
                'description': ['description', 'summary', '描述', '简介'],
                'steps': ['steps', 'instructions', 'how_to_steps', '步骤', '操作步骤'],
                'totalTime': ['totalTime', 'total_time', 'duration', '总时间', '所需时间']
            }
        }
    
    def _get_schema_fields(self, schema_type: str) -> Dict[str, List[str]]:
        """获取指定schema类型的字段映射"""
        return self.schema_field_mappings.get(schema_type, {})
    
    def _get_required_fields(self, schema_type: str) -> List[str]:
        """
        获取指定schema类型的必需字段
        基于现有的生成方法确定必需字段
        """
        required_fields_map = {
            'Article': ['headline', 'author', 'datePublished'],
            'Product': ['name'],
            'Organization': ['name'],
            'Person': ['name'],
            'Event': ['name', 'startDate', 'location'],
            'VideoObject': ['name', 'description', 'thumbnailUrl'],
            'WebSite': ['name', 'url'],
            'Breadcrumb': ['items'],
            'FAQPage': ['faqs'],
            'HowTo': ['name', 'steps']
        }
        return required_fields_map.get(schema_type, [])
    
    async def process_batch_files(self, files: List[UploadFile]) -> Dict[str, Any]:
        """
        批量处理CSV文件 - 支持动态字段格式
        """
        logger.info(f"开始处理 {len(files)} 个CSV文件")
        
        # 重置状态
        self.batch_data = pd.DataFrame()
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
                    validation_result = self._validate_dynamic_csv(df, file.filename)
                    
                    if validation_result['is_valid']:
                        # 标准化列名并转换为统一格式
                        standardized_df = self._standardize_dynamic_csv(df)
                        dataframes.append(standardized_df)
                        
                        # 记录文件统计
                        self.file_stats.append({
                            "filename": file.filename,
                            "stats": get_dataframe_stats(standardized_df),
                            "schema_types": standardized_df['schema_type'].value_counts().to_dict(),
                            "unique_urls": standardized_df['url'].nunique(),
                            "detected_format": validation_result.get('format_type', 'unknown')
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
                "processing_errors": self.processing_errors,
                "supported_formats": ["dynamic_fields", "data_json"]
            }
            
        except Exception as e:
            logger.error(f"批量文件处理失败: {str(e)}")
            return {
                "success": False,
                "error": f"文件处理失败: {str(e)}",
                "processing_errors": self.processing_errors
            }
    
    def _validate_dynamic_csv(self, df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """
        验证动态CSV文件格式
        支持两种格式：
        1. 传统格式：url, schema_type, data_json
        2. 动态格式：url, schema_type, [dynamic_fields...]
        """
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "format_type": "unknown"
        }
        
        # 检查必需的基础列
        found_basic_columns = find_multiple_column_names(df, ['url', 'schema_type'], self.required_columns_mapping)
        
        url_col = found_basic_columns.get('url')
        schema_col = found_basic_columns.get('schema_type')
        
        if not url_col or not schema_col:
            validation_result["is_valid"] = False
            missing = []
            if not url_col:
                missing.append('url')
            if not schema_col:
                missing.append('schema_type')
            validation_result["errors"].append(
                f"文件 {filename} 缺少必需列: {', '.join(missing)}"
            )
            return validation_result
        
        # 检查是否为传统data_json格式
        data_json_col = find_column_name(df, 'data_json', {'data_json': ['data_json', 'data', 'schema_data', 'fields_json']})
        
        if data_json_col:
            # 传统格式验证
            validation_result["format_type"] = "data_json"
            return self._validate_traditional_format(df, filename, url_col, schema_col, data_json_col, validation_result)
        else:
            # 动态字段格式验证
            validation_result["format_type"] = "dynamic_fields"
            return self._validate_dynamic_format(df, filename, url_col, schema_col, validation_result)
    
    def _validate_traditional_format(self, df: pd.DataFrame, filename: str, url_col: str, 
                                   schema_col: str, data_json_col: str, validation_result: Dict) -> Dict:
        """验证传统data_json格式"""
        # 检查空值
        empty_urls = df[url_col].isna().sum()
        empty_schemas = df[schema_col].isna().sum()
        empty_data = df[data_json_col].isna().sum()
        
        if empty_urls > 0:
            validation_result["warnings"].append(f"文件 {filename} 有 {empty_urls} 行URL为空")
        if empty_schemas > 0:
            validation_result["warnings"].append(f"文件 {filename} 有 {empty_schemas} 行schema_type为空")
        if empty_data > 0:
            validation_result["warnings"].append(f"文件 {filename} 有 {empty_data} 行data_json为空")
        
        # 检查支持的结构化数据类型
        unique_types = df[schema_col].dropna().unique()
        unsupported_types = [t for t in unique_types if t not in self.schema_field_mappings]
        if unsupported_types:
            validation_result["warnings"].append(
                f"文件 {filename} 包含不支持的结构化数据类型: {', '.join(unsupported_types)}"
            )
        
        return validation_result
    
    def _validate_dynamic_format(self, df: pd.DataFrame, filename: str, url_col: str, 
                                schema_col: str, validation_result: Dict) -> Dict:
        """验证动态字段格式"""
        # 检查基础列的空值
        empty_urls = df[url_col].isna().sum()
        empty_schemas = df[schema_col].isna().sum()
        
        if empty_urls > 0:
            validation_result["warnings"].append(f"文件 {filename} 有 {empty_urls} 行URL为空")
        if empty_schemas > 0:
            validation_result["warnings"].append(f"文件 {filename} 有 {empty_schemas} 行schema_type为空")
        
        # 检查各个schema类型的字段
        unique_types = df[schema_col].dropna().unique()
        for schema_type in unique_types:
            if schema_type not in self.schema_field_mappings:
                validation_result["warnings"].append(
                    f"文件 {filename} 包含不支持的结构化数据类型: {schema_type}"
                )
                continue
            
            # 检查该schema类型的必需字段
            type_data = df[df[schema_col] == schema_type]
            required_fields = self._get_required_fields(schema_type)
            schema_field_mappings = self._get_schema_fields(schema_type)
            
            missing_required = []
            for required_field in required_fields:
                # 查找该字段的实际列名
                field_col = find_column_name(type_data, required_field, {required_field: schema_field_mappings.get(required_field, [required_field])})
                if not field_col:
                    missing_required.append(required_field)
            
            if missing_required:
                validation_result["warnings"].append(
                    f"文件 {filename} 中 {schema_type} 类型缺少推荐字段: {', '.join(missing_required)}"
                )
        
        return validation_result
    
    def _standardize_dynamic_csv(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        标准化动态CSV为统一格式
        将动态字段格式转换为data_json格式以保持后续处理逻辑一致
        """
        standardized_df = df.copy()
        
        # 标准化基础列名
        rename_mapping = {}
        for concept in self.required_columns_mapping.keys():
            found_column = find_column_name(df, concept, self.required_columns_mapping)
            if found_column and found_column != concept:
                rename_mapping[found_column] = concept
        
        if rename_mapping:
            standardized_df = standardized_df.rename(columns=rename_mapping)
        
        # 检查是否已经是data_json格式
        if 'data_json' in standardized_df.columns:
            return standardized_df
        
        # 转换动态字段为data_json格式
        data_json_column = []
        
        for _, row in standardized_df.iterrows():
            schema_type = row.get('schema_type')
            if pd.isna(schema_type) or schema_type not in self.schema_field_mappings:
                data_json_column.append('{}')
                continue
            
            # 获取该schema类型的字段映射
            schema_field_mappings = self._get_schema_fields(schema_type)
            data_dict = {}
            
            # 遍历schema字段，查找对应的列值
            for field_name, possible_columns in schema_field_mappings.items():
                # 查找该字段在当前行的值
                field_value = None
                for possible_col in possible_columns:
                    if possible_col in standardized_df.columns:
                        field_value = row.get(possible_col)
                        if pd.notna(field_value) and str(field_value).strip():
                            break
                
                # 如果找到有效值，添加到data_dict
                if field_value is not None and pd.notna(field_value) and str(field_value).strip():
                    data_dict[field_name] = str(field_value).strip()
            
            # 将data_dict转换为JSON字符串
            data_json_column.append(json.dumps(data_dict, ensure_ascii=False))
        
        # 添加data_json列
        standardized_df['data_json'] = data_json_column
        
        # 只保留必要的列
        final_columns = ['url', 'schema_type', 'data_json']
        standardized_df = standardized_df[final_columns]
        
        return standardized_df
    
    def get_dynamic_csv_template(self, schema_type: str) -> Dict[str, Any]:
        """生成动态CSV模板"""
        if schema_type not in self.schema_field_mappings:
            return {
                "success": False,
                "error": f"不支持的结构化数据类型: {schema_type}"
            }
        
        # 获取字段映射和必需字段
        schema_fields = self._get_schema_fields(schema_type)
        required_fields = self._get_required_fields(schema_type)
        
        # 生成模板头部（使用首选字段名）
        headers = ['url', 'schema_type']
        field_descriptions = {
            'url': '目标网页URL',
            'schema_type': '结构化数据类型'
        }
        
        # 添加schema特定字段（优先必需字段）
        for field_name in required_fields:
            if field_name in schema_fields:
                preferred_name = schema_fields[field_name][0]  # 使用首选名称
                headers.append(preferred_name)
                field_descriptions[preferred_name] = f'{field_name}字段（必需）'
        
        # 添加可选字段
        for field_name, possible_names in schema_fields.items():
            if field_name not in required_fields:
                preferred_name = possible_names[0]
                if preferred_name not in headers:
                    headers.append(preferred_name)
                    field_descriptions[preferred_name] = f'{field_name}字段（可选）'
        
        # 生成示例数据
        sample_data = self._generate_sample_row(schema_type, headers)
        
        return {
            "success": True,
            "schema_type": schema_type,
            "headers": headers,
            "field_descriptions": field_descriptions,
            "sample_data": sample_data,
            "required_fields": [schema_fields[f][0] for f in required_fields if f in schema_fields],
            "csv_content": self._generate_csv_content(headers, [sample_data])
        }
    
    def _generate_sample_row(self, schema_type: str, headers: List[str]) -> Dict[str, str]:
        """生成示例行数据"""
        sample_data = {
            'url': f'https://example.com/{schema_type.lower()}-1',
            'schema_type': schema_type
        }
        
        # 根据schema类型生成示例数据
        schema_samples = {
            'Article': {
                'headline': '如何优化网站SEO - 完整指南',
                'author': '张三',
                'datePublished': '2024-01-15',
                'description': '本文详细介绍了网站SEO优化的各种技巧和最佳实践',
                'image': 'https://example.com/images/seo-guide.jpg',
                'publisher': '技术博客'
            },
            'Product': {
                'name': '无线蓝牙耳机',
                'description': '高音质无线蓝牙耳机，支持降噪功能',
                'brand': 'TechBrand',
                'price': '299',
                'currency': 'CNY'
            },
            'Organization': {
                'name': '创新科技公司',
                'url': 'https://example.com',
                'description': '专注于人工智能和机器学习技术的创新公司'
            },
            'Person': {
                'name': '李四',
                'jobTitle': '高级前端工程师',
                'worksFor': '创新科技公司',
                'description': '拥有8年前端开发经验，专注于React和Vue.js开发'
            },
            'Event': {
                'name': '2024年前端技术大会',
                'startDate': '2024-06-15T09:00:00',
                'location': '北京国际会议中心',
                'description': '探讨最新的前端技术趋势'
            },
            'VideoObject': {
                'name': 'React入门教程',
                'description': '详细的React框架入门教程，适合初学者学习',
                'thumbnailUrl': 'https://example.com/thumbnail.jpg'
            },
            'WebSite': {
                'name': '技术博客',
                'url': 'https://techblog.example.com',
                'description': '分享最新技术动态和开发经验的技术博客'
            },
            'Breadcrumb': {
                'items': '首页|https://example.com\n产品|https://example.com/products\n详情页|https://example.com/products/123'
            },
            'FAQPage': {
                'faqs': '什么是结构化数据？\n结构化数据是一种标准化的格式，用于向搜索引擎提供有关网页内容的信息。\n\n如何实现结构化数据？\n可以使用JSON-LD、Microdata或RDFa格式来实现结构化数据。'
            },
            'HowTo': {
                'name': '如何制作咖啡',
                'description': '简单易学的咖啡制作方法',
                'steps': '准备咖啡豆和热水\n将咖啡豆研磨成粉\n用热水冲泡咖啡粉\n静置2-3分钟\n享用美味咖啡',
                'totalTime': 'PT10M'
            }
        }
        
        schema_sample = schema_samples.get(schema_type, {})
        
        # 填充示例数据
        for header in headers[2:]:  # 跳过url和schema_type
            if header in schema_sample:
                sample_data[header] = schema_sample[header]
            else:
                sample_data[header] = f'示例{header}'
        
        return sample_data
    
    def _generate_csv_content(self, headers: List[str], rows: List[Dict[str, str]]) -> str:
        """生成CSV内容字符串"""
        lines = [','.join(headers)]
        
        for row in rows:
            values = []
            for header in headers:
                value = row.get(header, '')
                # 处理包含逗号的值
                if ',' in str(value):
                    value = f'"{value}"'
                values.append(str(value))
            lines.append(','.join(values))
        
        return '\n'.join(lines)
    
    def get_batch_summary(self) -> Dict[str, Any]:
        """获取批量处理摘要信息"""
        return {
            "has_batch_data": not self.batch_data.empty,
            "total_rows": len(self.batch_data) if not self.batch_data.empty else 0,
            "unique_urls": self.batch_data['url'].nunique() if not self.batch_data.empty else 0,
            "schema_types": self.batch_data['schema_type'].value_counts().to_dict() if not self.batch_data.empty else {},
            "files_processed": len(self.file_stats),
            "has_errors": len(self.processing_errors) > 0,
            "error_count": len(self.processing_errors)
        }
    
    def reset_batch_data(self) -> None:
        """重置批量处理数据"""
        self.batch_data = pd.DataFrame()
        self.file_stats = []
        self.processing_errors = []