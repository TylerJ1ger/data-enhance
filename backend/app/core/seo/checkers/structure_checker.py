from .base_checker import BaseChecker
from typing import Dict, Any, List, Set, Optional
import json
import re

class StructureChecker(BaseChecker):
    """检查页面结构化数据相关的SEO问题"""
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """执行所有结构化数据相关检查"""
        self.check_structured_data()
        self.check_javascript()
        
        return self.get_issues()
    
    def check_structured_data(self):
        """检查结构化数据相关问题"""
        import json
        import re
        
        # 检查不同类型的结构化数据
        json_ld_scripts = self.soup.find_all('script', attrs={'type': 'application/ld+json'})
        microdata_elements = self.soup.find_all(attrs={'itemtype': True})
        rdfa_elements = self.soup.find_all(attrs={'property': re.compile('^og:|^article:|^schema:')}) or \
                    self.soup.find_all(attrs={'vocab': True}) or \
                    self.soup.find_all(attrs={'typeof': True})
        
        # 没有任何结构化数据
        if not (json_ld_scripts or microdata_elements or rdfa_elements):
            self.add_issue(
                category="Structured Data",
                issue="Missing",
                description="页面没有使用结构化数据，添加结构化数据可以帮助搜索引擎更好地理解内容。",
                priority="low",
                issue_type="opportunities"
            )
            return
        
        # ================ 检查JSON-LD结构化数据 ================
        if json_ld_scripts:
            self._check_json_ld_data(json_ld_scripts)
        
        # ================ 检查Microdata结构化数据 ================
        if microdata_elements:
            self._check_microdata(microdata_elements)
        
        # ================ 检查RDFa结构化数据 ================
        if rdfa_elements:
            self._check_rdfa(rdfa_elements)

    def _check_json_ld_data(self, json_ld_scripts):
        """检查JSON-LD结构化数据"""
        import json
        
        for script in json_ld_scripts:
            try:
                # 尝试解析JSON
                json_content = script.string
                if not json_content or json_content.strip() == '':
                    self.add_issue(
                        category="Structured Data",
                        issue="Parse Errors",
                        description="JSON-LD脚本存在但内容为空",
                        priority="high",
                        affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                        issue_type="issues"
                    )
                    continue
                    
                json_data = json.loads(json_content)
                
                # 检查必要的字段
                self._validate_json_ld_structure(json_data, script)
                
                # 检查特定类型的富结果要求
                if isinstance(json_data, dict):
                    self._check_rich_results(json_data, script)
                elif isinstance(json_data, list):
                    for item in json_data:
                        if isinstance(item, dict):
                            self._check_rich_results(item, script)
                    
            except json.JSONDecodeError as e:
                self.add_issue(
                    category="Structured Data",
                    issue="Parse Errors",
                    description=f"JSON-LD解析错误: {str(e)}",
                    priority="high",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="issues"
                )
            except Exception as e:
                self.add_issue(
                    category="Structured Data",
                    issue="Validation Errors",
                    description=f"结构化数据验证错误: {str(e)}",
                    priority="medium",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="issues"
                )

    def _validate_json_ld_structure(self, json_data, script):
        """验证JSON-LD结构"""
        # 检查基本结构
        if isinstance(json_data, dict):
            # 检查@context字段
            if '@context' not in json_data:
                self.add_issue(
                    category="Structured Data",
                    issue="Validation Errors",
                    description="JSON-LD缺少必要的@context字段，应为'https://schema.org'或相关值",
                    priority="high",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="issues"
                )
            elif not isinstance(json_data['@context'], (str, list, dict)) or \
                (isinstance(json_data['@context'], str) and 'schema.org' not in json_data['@context']):
                self.add_issue(
                    category="Structured Data",
                    issue="Validation Warnings",
                    description="JSON-LD的@context字段可能不正确，推荐使用'https://schema.org'",
                    priority="medium",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="warnings"
                )
                
            # 检查@type字段
            if '@type' not in json_data:
                self.add_issue(
                    category="Structured Data",
                    issue="Validation Errors",
                    description="JSON-LD缺少必要的@type字段，用于定义数据类型",
                    priority="high",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="issues"
                )
        elif isinstance(json_data, list):
            # 检查列表中的每个项目
            for item in json_data:
                if isinstance(item, dict):
                    self._validate_json_ld_structure(item, script)
        else:
            self.add_issue(
                category="Structured Data",
                issue="Validation Errors",
                description="JSON-LD格式无效，应为对象或对象数组",
                priority="high",
                affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                issue_type="issues"
            )

    def _check_rich_results(self, json_data, script):
        """检查富结果类型的特定要求"""
        # 获取类型
        data_type = json_data.get('@type', '')
        if not data_type:
            return
            
        # 规范化类型名称(处理URI情况)
        if '/' in data_type:
            data_type = data_type.split('/')[-1]
        
        # 根据不同类型验证必要的属性
        data_type = data_type.lower()
        
        # 1. 检查Product类型
        if data_type == 'product':
            required_fields = ['name', 'offers']
            recommended_fields = ['image', 'description', 'brand', 'review', 'aggregateRating']
            
            missing_required = [field for field in required_fields if field not in json_data]
            missing_recommended = [field for field in recommended_fields if field not in json_data]
            
            if missing_required:
                self.add_issue(
                    category="Structured Data",
                    issue="Rich Result Validation Errors",
                    description=f"Product类型缺少必要字段: {', '.join(missing_required)}",
                    priority="high",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="issues"
                )
                
            if missing_recommended:
                self.add_issue(
                    category="Structured Data",
                    issue="Rich Result Validation Warnings",
                    description=f"Product类型缺少推荐字段: {', '.join(missing_recommended)}",
                    priority="medium",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="opportunities"
                )
                
            # 检查offers结构
            if 'offers' in json_data:
                offers = json_data['offers']
                if isinstance(offers, dict):
                    if 'price' not in offers or 'priceCurrency' not in offers:
                        self.add_issue(
                            category="Structured Data",
                            issue="Rich Result Validation Errors",
                            description="Product类型的offers缺少price或priceCurrency字段",
                            priority="high",
                            affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                            issue_type="issues"
                        )
        
        # 2. 检查Article类型
        elif data_type == 'article' or data_type == 'newsarticle' or data_type == 'blogposting':
            required_fields = ['headline', 'author', 'datePublished']
            recommended_fields = ['image', 'publisher', 'dateModified', 'mainEntityOfPage']
            
            missing_required = [field for field in required_fields if field not in json_data]
            missing_recommended = [field for field in recommended_fields if field not in json_data]
            
            if missing_required:
                self.add_issue(
                    category="Structured Data",
                    issue="Rich Result Validation Errors",
                    description=f"Article类型缺少必要字段: {', '.join(missing_required)}",
                    priority="high",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="issues"
                )
                
            if missing_recommended:
                self.add_issue(
                    category="Structured Data",
                    issue="Rich Result Validation Warnings",
                    description=f"Article类型缺少推荐字段: {', '.join(missing_recommended)}",
                    priority="medium",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="opportunities"
                )
                
            # 检查标题长度
            if 'headline' in json_data and len(json_data['headline']) > 110:
                self.add_issue(
                    category="Structured Data",
                    issue="Rich Result Validation Warnings",
                    description=f"Article类型的headline超过110个字符的Google推荐长度",
                    priority="medium",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="warnings"
                )
        
        # 3. 检查LocalBusiness类型
        elif data_type == 'localbusiness' or data_type == 'restaurant' or data_type == 'store':
            required_fields = ['name', 'address']
            recommended_fields = ['telephone', 'openingHours', 'priceRange', 'geo']
            
            missing_required = [field for field in required_fields if field not in json_data]
            missing_recommended = [field for field in recommended_fields if field not in json_data]
            
            if missing_required:
                self.add_issue(
                    category="Structured Data",
                    issue="Rich Result Validation Errors",
                    description=f"LocalBusiness类型缺少必要字段: {', '.join(missing_required)}",
                    priority="high",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="issues"
                )
                
            if missing_recommended:
                self.add_issue(
                    category="Structured Data",
                    issue="Rich Result Validation Warnings",
                    description=f"LocalBusiness类型缺少推荐字段: {', '.join(missing_recommended)}",
                    priority="medium",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="opportunities"
                )
                
            # 检查address结构
            if 'address' in json_data:
                address = json_data['address']
                if isinstance(address, dict):
                    if '@type' not in address or address.get('@type') != 'PostalAddress':
                        self.add_issue(
                            category="Structured Data",
                            issue="Validation Warnings",
                            description="LocalBusiness的address应使用PostalAddress类型",
                            priority="medium",
                            affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                            issue_type="warnings"
                        )
                        
                    # 检查地址必要字段
                    address_fields = ['streetAddress', 'addressLocality', 'postalCode']
                    missing_address = [field for field in address_fields if field not in address]
                    if missing_address:
                        self.add_issue(
                            category="Structured Data",
                            issue="Rich Result Validation Warnings",
                            description=f"LocalBusiness的address缺少推荐字段: {', '.join(missing_address)}",
                            priority="medium",
                            affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                            issue_type="warnings"
                        )
        
        # 4. 检查FAQPage类型
        elif data_type == 'faqpage':
            if 'mainEntity' not in json_data:
                self.add_issue(
                    category="Structured Data",
                    issue="Rich Result Validation Errors",
                    description="FAQPage类型缺少必要的mainEntity字段",
                    priority="high",
                    affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                    issue_type="issues"
                )
            else:
                entities = json_data['mainEntity']
                if not isinstance(entities, list):
                    entities = [entities]
                    
                for entity in entities:
                    if not isinstance(entity, dict) or '@type' not in entity or entity.get('@type') != 'Question':
                        self.add_issue(
                            category="Structured Data",
                            issue="Rich Result Validation Errors",
                            description="FAQPage的mainEntity应包含Question类型的项目",
                            priority="high",
                            affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                            issue_type="issues"
                        )
                    elif 'name' not in entity or 'acceptedAnswer' not in entity:
                        self.add_issue(
                            category="Structured Data",
                            issue="Rich Result Validation Errors",
                            description="Question类型缺少name(问题)或acceptedAnswer(答案)字段",
                            priority="high",
                            affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                            issue_type="issues"
                        )
                    elif isinstance(entity.get('acceptedAnswer'), dict) and \
                        ('@type' not in entity['acceptedAnswer'] or entity['acceptedAnswer'].get('@type') != 'Answer'):
                        self.add_issue(
                            category="Structured Data",
                            issue="Rich Result Validation Warnings",
                            description="acceptedAnswer字段应使用Answer类型",
                            priority="medium",
                            affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                            issue_type="warnings"
                        )
                    elif isinstance(entity.get('acceptedAnswer'), dict) and 'text' not in entity['acceptedAnswer']:
                        self.add_issue(
                            category="Structured Data",
                            issue="Rich Result Validation Errors",
                            description="Answer类型缺少必要的text字段",
                            priority="high",
                            affected_element=str(script)[:100] + ('...' if len(str(script)) > 100 else ''),
                            issue_type="issues"
                        )

    def _check_microdata(self, microdata_elements):
        """检查Microdata结构化数据"""
        # 检查itemtype是否有效
        valid_itemtypes = False
        itemtype_urls = set()
        
        for element in microdata_elements:
            itemtype = element.get('itemtype', '')
            if itemtype:
                itemtype_urls.add(itemtype)
                if 'schema.org' in itemtype:
                    valid_itemtypes = True
        
        if not valid_itemtypes:
            self.add_issue(
                category="Structured Data",
                issue="Validation Warnings",
                description=f"Microdata没有使用schema.org类型。发现的类型: {', '.join(itemtype_urls)}",
                priority="medium",
                issue_type="warnings"
            )
        
        # 检查itemscope
        elements_without_scope = []
        for element in microdata_elements:
            if not element.has_attr('itemscope'):
                elements_without_scope.append(element)
        
        if elements_without_scope:
            self.add_issue(
                category="Structured Data",
                issue="Validation Errors",
                description=f"有{len(elements_without_scope)}个使用itemtype的元素没有设置itemscope属性",
                priority="high",
                affected_element=str(elements_without_scope[0])[:100] + ('...' if len(str(elements_without_scope[0])) > 100 else ''),
                issue_type="issues"
            )
        
        # 检查itemprop
        for element in microdata_elements:
            if element.has_attr('itemscope'):
                # 检查此元素或其子元素是否有itemprop
                if not (element.has_attr('itemprop') or element.find_all(attrs={'itemprop': True})):
                    self.add_issue(
                        category="Structured Data",
                        issue="Validation Warnings",
                        description="找到具有itemscope的元素，但没有相关的itemprop属性",
                        priority="medium",
                        affected_element=str(element)[:100] + ('...' if len(str(element)) > 100 else ''),
                        issue_type="warnings"
                    )

    def _check_rdfa(self, rdfa_elements):
        """检查RDFa结构化数据"""
        # 检查常见的Open Graph属性
        og_properties = {
            'og:title': False,
            'og:type': False, 
            'og:image': False,
            'og:url': False
        }
        
        for element in rdfa_elements:
            prop = element.get('property', '')
            if prop in og_properties:
                og_properties[prop] = True
        
        # 检查是否缺少必要的OG属性
        missing_og = [prop for prop, found in og_properties.items() if not found]
        if missing_og:
            self.add_issue(
                category="Structured Data",
                issue="Rich Result Validation Warnings",
                description=f"Open Graph标记缺少以下推荐属性: {', '.join(missing_og)}",
                priority="low",
                issue_type="warnings"
            )
        
        # 检查其他RDFa属性
        has_vocab = any(element.has_attr('vocab') for element in rdfa_elements)
        has_typeof = any(element.has_attr('typeof') for element in rdfa_elements)
        
        if has_typeof and not has_vocab:
            self.add_issue(
                category="Structured Data",
                issue="Validation Warnings",
                description="使用了RDFa typeof属性但没有定义vocab",
                priority="medium",
                issue_type="warnings"
            )

    def check_javascript(self):
        """检查JavaScript相关问题"""
        # 由于静态分析限制，只能做基本检查
        
        # 检查是否有内联JavaScript
        inline_scripts = self.soup.find_all('script', src=None)
        if inline_scripts and any(len(script.string or '') > 500 for script in inline_scripts):
            self.add_issue(
                category="JavaScript",
                issue="Contains JavaScript Content",
                description="页面包含大量内联JavaScript，这可能影响页面加载性能。",
                priority="medium",
                issue_type="warnings"
            )