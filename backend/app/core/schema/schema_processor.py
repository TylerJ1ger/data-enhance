"""
简化的结构化数据生成器处理器
仅支持基本的结构化数据生成功能，移除了验证、保存配置等复杂功能
"""

import json
from typing import Dict, Any
from datetime import datetime


class SchemaProcessor:
    def __init__(self):
        """初始化结构化数据处理器"""
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
    
    def get_supported_schemas(self) -> Dict[str, Dict[str, Any]]:
        """获取支持的结构化数据类型及其配置"""
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
                    'description': {'label': '产品描述', 'type': 'textarea', 'required': False, 'placeholder': '详细描述产品特点和功能'},
                    'brand': {'label': '品牌名称', 'type': 'text', 'required': False, 'placeholder': '产品品牌'},
                    'price': {'label': '价格', 'type': 'number', 'required': False, 'placeholder': '99.99'},
                    'currency': {'label': '货币代码', 'type': 'text', 'required': False, 'placeholder': 'USD, CNY, EUR等'},
                    'image': {'label': '产品图片URL', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/product.jpg'},
                }
            },
            'Organization': {
                'name': '组织机构',
                'description': '公司、组织或机构信息',
                'required_fields': ['name'],
                'fields': {
                    'name': {'label': '组织名称', 'type': 'text', 'required': True, 'placeholder': '公司或组织名称'},
                    'url': {'label': '官方网站', 'type': 'url', 'required': False, 'placeholder': 'https://example.com'},
                    'description': {'label': '组织描述', 'type': 'textarea', 'required': False, 'placeholder': '组织简介和业务范围'},
                    'logo': {'label': 'Logo URL', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/logo.png'},
                    'telephone': {'label': '联系电话', 'type': 'text', 'required': False, 'placeholder': '+86-xxx-xxxx-xxxx'},
                }
            },
            'Person': {
                'name': '人物',
                'description': '个人或人物信息',
                'required_fields': ['name'],
                'fields': {
                    'name': {'label': '姓名', 'type': 'text', 'required': True, 'placeholder': '人物姓名'},
                    'jobTitle': {'label': '职位', 'type': 'text', 'required': False, 'placeholder': '职位或职业'},
                    'worksFor': {'label': '工作单位', 'type': 'text', 'required': False, 'placeholder': '公司或组织名称'},
                    'description': {'label': '个人简介', 'type': 'textarea', 'required': False, 'placeholder': '个人背景和专业经历'},
                    'url': {'label': '个人网站', 'type': 'url', 'required': False, 'placeholder': 'https://example.com'},
                    'image': {'label': '头像URL', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/avatar.jpg'},
                }
            },
            'Event': {
                'name': '活动事件',
                'description': '会议、演出、活动等事件信息',
                'required_fields': ['name', 'startDate', 'location'],
                'fields': {
                    'name': {'label': '活动名称', 'type': 'text', 'required': True, 'placeholder': '活动或事件名称'},
                    'startDate': {'label': '开始时间', 'type': 'datetime-local', 'required': True, 'placeholder': 'YYYY-MM-DDTHH:MM'},
                    'location': {'label': '活动地点', 'type': 'text', 'required': True, 'placeholder': '具体地址或场所名称'},
                    'description': {'label': '活动描述', 'type': 'textarea', 'required': False, 'placeholder': '活动详情和内容介绍'},
                    'endDate': {'label': '结束时间', 'type': 'datetime-local', 'required': False, 'placeholder': 'YYYY-MM-DDTHH:MM'},
                    'organizer': {'label': '主办方', 'type': 'text', 'required': False, 'placeholder': '主办机构或个人'},
                    'price': {'label': '票价', 'type': 'number', 'required': False, 'placeholder': '门票价格'},
                }
            },
            'VideoObject': {
                'name': '视频',
                'description': '视频内容信息',
                'required_fields': ['name', 'description', 'thumbnailUrl'],
                'fields': {
                    'name': {'label': '视频标题', 'type': 'text', 'required': True, 'placeholder': '视频名称或标题'},
                    'description': {'label': '视频描述', 'type': 'textarea', 'required': True, 'placeholder': '视频内容描述'},
                    'thumbnailUrl': {'label': '缩略图URL', 'type': 'url', 'required': True, 'placeholder': 'https://example.com/thumbnail.jpg'},
                    'uploadDate': {'label': '上传日期', 'type': 'date', 'required': False, 'placeholder': 'YYYY-MM-DD'},
                    'duration': {'label': '视频时长', 'type': 'text', 'required': False, 'placeholder': 'PT1H30M (1小时30分钟)'},
                    'contentUrl': {'label': '视频链接', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/video.mp4'},
                }
            },
            'WebSite': {
                'name': '网站',
                'description': '网站基本信息',
                'required_fields': ['name', 'url'],
                'fields': {
                    'name': {'label': '网站名称', 'type': 'text', 'required': True, 'placeholder': '网站或品牌名称'},
                    'url': {'label': '网站地址', 'type': 'url', 'required': True, 'placeholder': 'https://example.com'},
                    'description': {'label': '网站描述', 'type': 'textarea', 'required': False, 'placeholder': '网站功能和服务介绍'},
                    'searchUrl': {'label': '搜索页面URL', 'type': 'url', 'required': False, 'placeholder': 'https://example.com/search?q={search_term}'},
                }
            },
            'Breadcrumb': {
                'name': '面包屑导航',
                'description': '页面导航路径',
                'required_fields': ['items'],
                'fields': {
                    'items': {'label': '导航项目', 'type': 'textarea', 'required': True, 'placeholder': '每行一个导航项：名称|URL\n例如：首页|https://example.com\n产品|https://example.com/products'},
                }
            },
            'FAQPage': {
                'name': 'FAQ页面',
                'description': '常见问题页面',
                'required_fields': ['faqs'],
                'fields': {
                    'faqs': {'label': '问答内容', 'type': 'textarea', 'required': True, 'placeholder': '每个问答占两行：\n问题内容\n答案内容\n\n下一个问答...'},
                }
            },
            'HowTo': {
                'name': '操作指南',
                'description': '分步骤的操作教程',
                'required_fields': ['name', 'steps'],
                'fields': {
                    'name': {'label': '指南标题', 'type': 'text', 'required': True, 'placeholder': '操作指南的标题'},
                    'description': {'label': '指南描述', 'type': 'textarea', 'required': False, 'placeholder': '指南的总体介绍'},
                    'steps': {'label': '操作步骤', 'type': 'textarea', 'required': True, 'placeholder': '每行一个步骤，描述具体操作'},
                    'totalTime': {'label': '总耗时', 'type': 'text', 'required': False, 'placeholder': 'PT30M (30分钟)'},
                }
            }
        }
    
    def generate_schema(self, schema_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成指定类型的结构化数据"""
        if schema_type not in self.supported_schemas:
            raise ValueError(f"不支持的结构化数据类型: {schema_type}")
        
        # 简单验证必填字段
        config = self.get_supported_schemas()[schema_type]
        missing_fields = []
        for field in config['required_fields']:
            if field not in data or not data[field] or (isinstance(data[field], str) and data[field].strip() == ''):
                missing_fields.append(field)
        
        if missing_fields:
            field_labels = [config['fields'][field]['label'] for field in missing_fields if field in config['fields']]
            raise ValueError(f"请填写必填字段: {', '.join(field_labels)}")
        
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