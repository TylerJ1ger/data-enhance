"""
扩展的结构化数据生成器处理器
增加批量处理功能：CSV导入、多文件合并、批量生成
新增：动态CSV字段支持，参考column_name_utils.py的设计模式
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
from app.shared.utils.column_name_utils import find_column_name, find_multiple_column_names

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
        
        # 新增：动态字段映射配置
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
        """
        获取指定schema类型的字段映射
        """
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
                "supported_formats": ["dynamic_fields", "data_json"]  # 新增：支持的格式类型
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
        unsupported_types = [t for t in unique_types if t not in self.supported_schemas]
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
            if schema_type not in self.supported_schemas:
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
            if pd.isna(schema_type) or schema_type not in self.supported_schemas:
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
        """
        生成动态CSV模板
        """
        if schema_type not in self.supported_schemas:
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
    
    def generate_batch_schemas(self, url_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        批量生成结构化数据（保持现有逻辑不变）
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
    
    # ================================
    # 所有原有的schema生成方法保持不变
    # ================================
    
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