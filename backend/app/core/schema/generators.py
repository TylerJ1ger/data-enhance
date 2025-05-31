"""
Schema生成器模块 - backend/app/core/schema/generators.py
包含所有结构化数据类型的生成器实现
"""

import json
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class SchemaGenerators:
    """结构化数据生成器集合类"""
    
    def __init__(self):
        """初始化生成器映射"""
        self.generators = {
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
    
    def get_supported_types(self) -> list:
        """获取支持的Schema类型列表"""
        return list(self.generators.keys())
    
    def has_generator(self, schema_type: str) -> bool:
        """检查是否支持指定的Schema类型"""
        return schema_type in self.generators
    
    def generate(self, schema_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成指定类型的结构化数据
        
        Args:
            schema_type: 结构化数据类型
            data: 生成数据所需的字段数据
            
        Returns:
            生成的结构化数据字典
            
        Raises:
            ValueError: 当schema_type不被支持时
        """
        if schema_type not in self.generators:
            raise ValueError(f"不支持的结构化数据类型: {schema_type}")
        
        generator = self.generators[schema_type]
        return generator(data)
    
    # ================================
    # 各个Schema类型的生成方法
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