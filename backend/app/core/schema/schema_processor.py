"""
结构化数据生成器处理器
支持生成符合Google和Schema.org标准的结构化数据
"""

import json
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, date
import re
from urllib.parse import urlparse


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
                'optional_fields': ['description', 'image', 'publisher', 'dateModified']
            },
            'Breadcrumb': {
                'name': '面包屑导航',
                'description': '页面在网站层次结构中的位置',
                'required_fields': ['itemListElement'],
                'optional_fields': []
            },
            'Event': {
                'name': '事件',
                'description': '活动、会议、演出等事件信息',
                'required_fields': ['name', 'startDate', 'location'],
                'optional_fields': ['description', 'endDate', 'organizer', 'offers']
            },
            'FAQPage': {
                'name': 'FAQ页面',
                'description': '常见问题页面',
                'required_fields': ['mainEntity'],
                'optional_fields': []
            },
            'HowTo': {
                'name': '操作指南',
                'description': '分步骤的操作指南',
                'required_fields': ['name', 'step'],
                'optional_fields': ['description', 'image', 'totalTime', 'supply', 'tool']
            },
            'Organization': {
                'name': '组织机构',
                'description': '公司、组织或机构信息',
                'required_fields': ['name'],
                'optional_fields': ['url', 'logo', 'description', 'address', 'contactPoint']
            },
            'Person': {
                'name': '人物',
                'description': '个人信息',
                'required_fields': ['name'],
                'optional_fields': ['jobTitle', 'worksFor', 'url', 'image', 'description']
            },
            'Product': {
                'name': '产品',
                'description': '商品或服务信息',
                'required_fields': ['name'],
                'optional_fields': ['description', 'image', 'brand', 'offers', 'aggregateRating', 'review']
            },
            'VideoObject': {
                'name': '视频',
                'description': '视频内容信息',
                'required_fields': ['name', 'description', 'thumbnailUrl', 'uploadDate'],
                'optional_fields': ['duration', 'contentUrl', 'embedUrl', 'publisher']
            },
            'WebSite': {
                'name': '网站',
                'description': '网站信息和搜索功能',
                'required_fields': ['name', 'url'],
                'optional_fields': ['description', 'potentialAction']
            }
        }
    
    def generate_schema(self, schema_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成指定类型的结构化数据"""
        if schema_type not in self.supported_schemas:
            raise ValueError(f"不支持的结构化数据类型: {schema_type}")
        
        # 验证必填字段
        self._validate_required_fields(schema_type, data)
        
        # 生成结构化数据
        schema_generator = self.supported_schemas[schema_type]
        return schema_generator(data)
    
    def validate_schema(self, schema_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """验证结构化数据"""
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        if schema_type not in self.supported_schemas:
            validation_result['is_valid'] = False
            validation_result['errors'].append(f"不支持的结构化数据类型: {schema_type}")
            return validation_result
        
        # 检查必填字段
        schema_config = self.get_supported_schemas()[schema_type]
        required_fields = schema_config['required_fields']
        
        for field in required_fields:
            if field not in data or not data[field]:
                validation_result['is_valid'] = False
                validation_result['errors'].append(f"缺少必填字段: {field}")
        
        # 验证URL格式
        url_fields = ['url', 'image', 'logo', 'contentUrl', 'embedUrl', 'thumbnailUrl']
        for field in url_fields:
            if field in data and data[field]:
                if not self._is_valid_url(data[field]):
                    validation_result['warnings'].append(f"字段 {field} 的URL格式可能不正确: {data[field]}")
        
        # 验证日期格式
        date_fields = ['datePublished', 'dateModified', 'startDate', 'endDate', 'uploadDate']
        for field in date_fields:
            if field in data and data[field]:
                if not self._is_valid_date(data[field]):
                    validation_result['warnings'].append(f"字段 {field} 的日期格式可能不正确: {data[field]}")
        
        # 验证数组字段
        array_fields = ['itemListElement', 'mainEntity', 'step', 'supply', 'tool']
        for field in array_fields:
            if field in data and data[field]:
                if not isinstance(data[field], list):
                    validation_result['errors'].append(f"字段 {field} 必须是数组格式")
                elif len(data[field]) == 0:
                    validation_result['warnings'].append(f"字段 {field} 是空数组，建议添加至少一个项目")
        
        # 特殊验证规则
        self._validate_special_rules(schema_type, data, validation_result)
        
        return validation_result
    
    def _validate_special_rules(self, schema_type: str, data: Dict[str, Any], validation_result: Dict[str, Any]):
        """验证特殊业务规则"""
        if schema_type == 'Event':
            # 验证事件日期逻辑
            if 'startDate' in data and 'endDate' in data and data['startDate'] and data['endDate']:
                try:
                    start = datetime.fromisoformat(data['startDate'].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(data['endDate'].replace('Z', '+00:00'))
                    if end <= start:
                        validation_result['errors'].append("结束时间必须晚于开始时间")
                except:
                    pass
        
        elif schema_type == 'Product':
            # 验证产品价格
            if 'offers' in data and isinstance(data['offers'], dict):
                if 'price' in data['offers'] and data['offers']['price']:
                    try:
                        price = float(data['offers']['price'])
                        if price < 0:
                            validation_result['warnings'].append("产品价格不能为负数")
                    except ValueError:
                        validation_result['errors'].append("产品价格必须是有效数字")
            
            # 验证评分
            if 'aggregateRating' in data and isinstance(data['aggregateRating'], dict):
                if 'ratingValue' in data['aggregateRating'] and data['aggregateRating']['ratingValue']:
                    try:
                        rating = float(data['aggregateRating']['ratingValue'])
                        if rating < 1 or rating > 5:
                            validation_result['warnings'].append("评分值建议在1-5之间")
                    except ValueError:
                        validation_result['errors'].append("评分值必须是有效数字")
        
        elif schema_type == 'VideoObject':
            # 验证视频时长格式
            if 'duration' in data and data['duration']:
                if not re.match(r'^PT(\d+H)?(\d+M)?(\d+S)?$', data['duration']):
                    validation_result['warnings'].append("视频时长建议使用ISO 8601格式，如: PT1H30M")
        
        elif schema_type == 'HowTo':
            # 验证步骤数量
            if 'step' in data and isinstance(data['step'], list):
                if len(data['step']) < 2:
                    validation_result['warnings'].append("操作指南建议包含至少2个步骤")
    
    def _validate_required_fields(self, schema_type: str, data: Dict[str, Any]):
        """验证必填字段"""
        schema_config = self.get_supported_schemas()[schema_type]
        required_fields = schema_config['required_fields']
        
        missing_fields = []
        for field in required_fields:
            if field not in data or not data[field]:
                missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(f"缺少必填字段: {', '.join(missing_fields)}")
    
    def _is_valid_url(self, url: str) -> bool:
        """验证URL格式"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False
    
    def _is_valid_date(self, date_str: str) -> bool:
        """验证日期格式"""
        date_patterns = [
            r'^\d{4}-\d{2}-\d{2}$',  # YYYY-MM-DD
            r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$',  # YYYY-MM-DDTHH:MM:SS
            r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$',  # YYYY-MM-DDTHH:MM:SSZ
            r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$'  # YYYY-MM-DDTHH:MM:SS+TZ
        ]
        
        return any(re.match(pattern, date_str) for pattern in date_patterns)
    
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
        
        if data.get("description"):
            schema["description"] = data["description"]
        
        if data.get("image"):
            if isinstance(data["image"], list):
                schema["image"] = data["image"]
            else:
                schema["image"] = [data["image"]]
        
        if data.get("publisher"):
            schema["publisher"] = {
                "@type": "Organization",
                "name": data["publisher"]
            }
        
        if data.get("dateModified"):
            schema["dateModified"] = data["dateModified"]
        
        # 添加mainEntityOfPage以提升SEO效果
        if data.get("url"):
            schema["mainEntityOfPage"] = {
                "@type": "WebPage",
                "@id": data["url"]
            }
        
        return schema
    
    def _generate_breadcrumb_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成面包屑导航结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": []
        }
        
        breadcrumbs = data["itemListElement"]
        for i, item in enumerate(breadcrumbs):
            schema["itemListElement"].append({
                "@type": "ListItem",
                "position": i + 1,
                "name": item["name"],
                "item": item["url"] if item.get("url") else f"#{item['name']}"
            })
        
        return schema
    
    def _generate_event_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成事件结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": data["name"],
            "startDate": data["startDate"]
        }
        
        # 处理地点信息
        location_data = data["location"]
        if isinstance(location_data, dict):
            schema["location"] = {
                "@type": "Place",
                "name": location_data.get("name", ""),
                "address": location_data.get("address", "")
            }
        else:
            schema["location"] = {
                "@type": "Place",
                "name": str(location_data)
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
        
        if data.get("offers"):
            offers_data = data["offers"]
            schema["offers"] = {
                "@type": "Offer",
                "price": str(offers_data.get("price", "0")),
                "priceCurrency": offers_data.get("currency", "USD"),
                "availability": "https://schema.org/InStock",
                "url": offers_data.get("url", "")
            }
        
        if data.get("image"):
            schema["image"] = data["image"]
        
        # 添加eventStatus和eventAttendanceMode以提升兼容性
        schema["eventStatus"] = "https://schema.org/EventScheduled"
        schema["eventAttendanceMode"] = "https://schema.org/OfflineEventAttendanceMode"
        
        return schema
    
    def _generate_faq_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成FAQ页面结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": []
        }
        
        faqs = data["mainEntity"]
        for faq in faqs:
            schema["mainEntity"].append({
                "@type": "Question",
                "name": faq["question"],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": faq["answer"]
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
        
        if data.get("image"):
            schema["image"] = data["image"]
        
        if data.get("totalTime"):
            schema["totalTime"] = data["totalTime"]
        
        if data.get("supply") and isinstance(data["supply"], list):
            schema["supply"] = [
                {"@type": "HowToSupply", "name": supply} 
                for supply in data["supply"] if supply
            ]
        
        if data.get("tool") and isinstance(data["tool"], list):
            schema["tool"] = [
                {"@type": "HowToTool", "name": tool} 
                for tool in data["tool"] if tool
            ]
        
        # 处理步骤
        steps = data["step"]
        for i, step in enumerate(steps):
            step_schema = {
                "@type": "HowToStep",
                "name": step.get("name", f"步骤 {i + 1}"),
                "text": step["text"]
            }
            if step.get("image"):
                step_schema["image"] = step["image"]
            if step.get("url"):
                step_schema["url"] = step["url"]
            schema["step"].append(step_schema)
        
        return schema
    
    def _generate_organization_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成组织机构结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": data["name"]
        }
        
        if data.get("url"):
            schema["url"] = data["url"]
        
        if data.get("logo"):
            schema["logo"] = data["logo"]
        
        if data.get("description"):
            schema["description"] = data["description"]
        
        if data.get("address") and isinstance(data["address"], dict):
            address_data = data["address"]
            schema["address"] = {
                "@type": "PostalAddress",
                "streetAddress": address_data.get("streetAddress", ""),
                "addressLocality": address_data.get("city", ""),
                "postalCode": address_data.get("postalCode", ""),
                "addressCountry": address_data.get("country", "")
            }
        
        if data.get("contactPoint") and isinstance(data["contactPoint"], dict):
            contact_data = data["contactPoint"]
            schema["contactPoint"] = {
                "@type": "ContactPoint",
                "telephone": contact_data.get("telephone", ""),
                "contactType": contact_data.get("contactType", "customer service")
            }
        
        # 添加sameAs以支持社交媒体链接
        if data.get("sameAs"):
            if isinstance(data["sameAs"], list):
                schema["sameAs"] = data["sameAs"]
            else:
                schema["sameAs"] = [data["sameAs"]]
        
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
        
        if data.get("url"):
            schema["url"] = data["url"]
        
        if data.get("image"):
            schema["image"] = data["image"]
        
        if data.get("description"):
            schema["description"] = data["description"]
        
        # 添加sameAs以支持社交媒体链接
        if data.get("sameAs"):
            if isinstance(data["sameAs"], list):
                schema["sameAs"] = data["sameAs"]
            else:
                schema["sameAs"] = [data["sameAs"]]
        
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
            if isinstance(data["image"], list):
                schema["image"] = data["image"]
            else:
                schema["image"] = [data["image"]]
        
        if data.get("brand"):
            schema["brand"] = {
                "@type": "Brand",
                "name": data["brand"]
            }
        
        if data.get("offers") and isinstance(data["offers"], dict):
            offers_data = data["offers"]
            schema["offers"] = {
                "@type": "Offer",
                "price": str(offers_data.get("price", "0")),
                "priceCurrency": offers_data.get("currency", "USD"),
                "availability": "https://schema.org/InStock"
            }
            
            if offers_data.get("url"):
                schema["offers"]["url"] = offers_data["url"]
        
        if data.get("aggregateRating") and isinstance(data["aggregateRating"], dict):
            rating_data = data["aggregateRating"]
            schema["aggregateRating"] = {
                "@type": "AggregateRating",
                "ratingValue": str(rating_data.get("ratingValue", "5")),
                "reviewCount": str(rating_data.get("reviewCount", "1"))
            }
        
        if data.get("review") and isinstance(data["review"], list):
            schema["review"] = []
            for review in data["review"]:
                review_schema = {
                    "@type": "Review",
                    "reviewRating": {
                        "@type": "Rating",
                        "ratingValue": str(review.get("ratingValue", "5"))
                    },
                    "author": {
                        "@type": "Person",
                        "name": review.get("author", "匿名用户")
                    }
                }
                if review.get("reviewBody"):
                    review_schema["reviewBody"] = review["reviewBody"]
                schema["review"].append(review_schema)
        
        # 添加SKU和GTIN以提升电商兼容性
        if data.get("sku"):
            schema["sku"] = data["sku"]
        if data.get("gtin"):
            schema["gtin"] = data["gtin"]
        
        return schema
    
    def _generate_video_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成视频结构化数据"""
        schema = {
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "name": data["name"],
            "description": data["description"],
            "thumbnailUrl": data["thumbnailUrl"],
            "uploadDate": data["uploadDate"]
        }
        
        if data.get("duration"):
            schema["duration"] = data["duration"]
        
        if data.get("contentUrl"):
            schema["contentUrl"] = data["contentUrl"]
        
        if data.get("embedUrl"):
            schema["embedUrl"] = data["embedUrl"]
        
        if data.get("publisher"):
            schema["publisher"] = {
                "@type": "Organization",
                "name": data["publisher"]
            }
        
        # 添加视频质量相关信息
        if data.get("videoQuality"):
            schema["videoQuality"] = data["videoQuality"]
        
        if data.get("width"):
            schema["width"] = data["width"]
        
        if data.get("height"):
            schema["height"] = data["height"]
        
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
        
        if data.get("potentialAction") and isinstance(data["potentialAction"], dict):
            action_data = data["potentialAction"]
            if action_data.get("type") == "SearchAction":
                schema["potentialAction"] = {
                    "@type": "SearchAction",
                    "target": {
                        "@type": "EntryPoint",
                        "urlTemplate": action_data.get("target", "")
                    },
                    "query-input": "required name=search_term_string"
                }
        
        return schema
    
    def format_schema_output(self, schema: Dict[str, Any], format_type: str = "json-ld") -> str:
        """格式化输出结构化数据"""
        if format_type == "json-ld":
            return json.dumps(schema, indent=2, ensure_ascii=False)
        elif format_type == "html":
            json_str = json.dumps(schema, ensure_ascii=False)
            return f'<script type="application/ld+json">\n{json_str}\n</script>'
        else:
            raise ValueError(f"不支持的输出格式: {format_type}")
    
    def get_schema_template(self, schema_type: str) -> Dict[str, Any]:
        """获取结构化数据模板"""
        templates = {
            'Article': {
                'headline': '',
                'author': '',
                'datePublished': '',
                'description': '',
                'image': '',
                'publisher': '',
                'dateModified': '',
                'url': ''
            },
            'Breadcrumb': {
                'itemListElement': [
                    {'name': '', 'url': ''}
                ]
            },
            'Event': {
                'name': '',
                'startDate': '',
                'location': '',
                'description': '',
                'endDate': '',
                'organizer': '',
                'image': '',
                'offers': {
                    'price': '',
                    'currency': 'USD',
                    'url': ''
                }
            },
            'FAQPage': {
                'mainEntity': [
                    {'question': '', 'answer': ''}
                ]
            },
            'HowTo': {
                'name': '',
                'description': '',
                'image': '',
                'totalTime': '',
                'supply': [],
                'tool': [],
                'step': [
                    {'name': '', 'text': '', 'image': '', 'url': ''}
                ]
            },
            'Organization': {
                'name': '',
                'url': '',
                'logo': '',
                'description': '',
                'sameAs': [],
                'address': {
                    'streetAddress': '',
                    'city': '',
                    'postalCode': '',
                    'country': ''
                },
                'contactPoint': {
                    'telephone': '',
                    'contactType': 'customer service'
                }
            },
            'Person': {
                'name': '',
                'jobTitle': '',
                'worksFor': '',
                'url': '',
                'image': '',
                'description': '',
                'sameAs': []
            },
            'Product': {
                'name': '',
                'description': '',
                'image': '',
                'brand': '',
                'sku': '',
                'gtin': '',
                'offers': {
                    'price': '',
                    'currency': 'USD',
                    'url': ''
                },
                'aggregateRating': {
                    'ratingValue': '',
                    'reviewCount': ''
                },
                'review': []
            },
            'VideoObject': {
                'name': '',
                'description': '',
                'thumbnailUrl': '',
                'uploadDate': '',
                'duration': '',
                'contentUrl': '',
                'embedUrl': '',
                'publisher': '',
                'videoQuality': '',
                'width': '',
                'height': ''
            },
            'WebSite': {
                'name': '',
                'url': '',
                'description': '',
                'potentialAction': {
                    'type': 'SearchAction',
                    'target': ''
                }
            }
        }
        
        return templates.get(schema_type, {})
    
    def get_schema_examples(self, schema_type: str) -> List[Dict[str, Any]]:
        """获取结构化数据示例"""
        examples = {
            'Article': [
                {
                    'title': '博客文章示例',
                    'data': {
                        'headline': '如何优化网站SEO',
                        'author': '张三',
                        'datePublished': '2024-01-15',
                        'description': '本文介绍了网站SEO优化的基本方法和技巧',
                        'image': 'https://example.com/seo-guide.jpg',
                        'publisher': '技术博客',
                        'url': 'https://example.com/seo-guide'
                    }
                }
            ],
            'Event': [
                {
                    'title': '会议活动示例',
                    'data': {
                        'name': '2024年前端技术大会',
                        'startDate': '2024-06-15T09:00:00',
                        'endDate': '2024-06-15T18:00:00',
                        'location': '北京国际会议中心',
                        'description': '探讨最新的前端技术趋势和实践',
                        'organizer': '前端技术社区',
                        'offers': {
                            'price': '299',
                            'currency': 'CNY'
                        }
                    }
                }
            ],
            'Product': [
                {
                    'title': '电商产品示例',
                    'data': {
                        'name': 'iPhone 15 Pro',
                        'description': '最新的苹果智能手机，搭载A17 Pro芯片',
                        'brand': 'Apple',
                        'image': 'https://example.com/iphone15pro.jpg',
                        'offers': {
                            'price': '999',
                            'currency': 'USD'
                        },
                        'aggregateRating': {
                            'ratingValue': '4.8',
                            'reviewCount': '1250'
                        }
                    }
                }
            ]
        }
        
        return examples.get(schema_type, [])