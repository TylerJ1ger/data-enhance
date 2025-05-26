from .base_checker import BaseChecker
from typing import Dict, Any, List

class AccessibilityChecker(BaseChecker):
    """检查页面无障碍访问相关的SEO问题"""
    
    def check(self) -> Dict[str, List[Dict[str, Any]]]:
        """执行所有无障碍相关检查"""
        self.check_accessibility()
        self.check_images_accessibility()
        self.check_keyboard_accessibility()
        
        return self.get_issues()
    
    def check_accessibility(self):
        """检查无障碍访问相关问题"""
        # 检查语言属性
        html_tag = self.soup.find('html')
        if not html_tag or not html_tag.has_attr('lang'):
            self.add_issue(
                category="Accessibility",
                issue="HTML Element Requires Lang Attribute",
                description="HTML标签缺少lang属性，这对屏幕阅读器和搜索引擎很重要。",
                priority="high",
                issue_type="warnings"
            )
        
        # 检查表单标签
        forms = self.soup.find_all('form')
        for form in forms:
            inputs = form.find_all('input', attrs={'type': lambda t: t not in ['hidden', 'submit', 'button', 'image']})
            for input_tag in inputs:
                if not input_tag.has_attr('id'):
                    continue
                
                # 检查是否有相关联的label
                input_id = input_tag['id']
                label = self.soup.find('label', attrs={'for': input_id})
                if not label:
                    self.add_issue(
                        category="Accessibility",
                        issue="Form Input Elements Require Labels",
                        description="表单输入元素缺少关联的label标签，这影响无障碍访问。",
                        affected_element=str(input_tag)[:100] + ('...' if len(str(input_tag)) > 100 else ''),
                        priority="high",
                        issue_type="warnings"
                    )
                    break  # 只报告一次
    
    def check_images_accessibility(self):
        """检查图片无障碍访问问题"""
        # 检查图片是否有alt文本
        img_tags = self.soup.find_all('img')
        for img in img_tags:
            if not img.has_attr('alt'):
                self.add_issue(
                    category="Accessibility",
                    issue="Image Missing Alt Text",
                    description="图片缺少alt属性，这对屏幕阅读器用户是必要的。",
                    affected_element=str(img)[:100] + ('...' if len(str(img)) > 100 else ''),
                    priority="high",
                    issue_type="issues"
                )
                break  # 只报告一次
        
        # 检查是否使用图片作为button但没有适当的aria标签
        img_buttons = self.soup.find_all('input', attrs={'type': 'image'})
        for img_button in img_buttons:
            if not (img_button.has_attr('alt') or img_button.has_attr('aria-label')):
                self.add_issue(
                    category="Accessibility",
                    issue="Image Button Without Accessible Name",
                    description="图片按钮需要alt属性或aria-label属性来提供可访问的名称。",
                    affected_element=str(img_button)[:100] + ('...' if len(str(img_button)) > 100 else ''),
                    priority="high",
                    issue_type="issues"
                )
                break  # 只报告一次
    
    def check_keyboard_accessibility(self):
        """检查键盘导航无障碍问题"""
        # 检查tabindex值是否合理
        elements_with_tabindex = self.soup.find_all(attrs={'tabindex': True})
        for element in elements_with_tabindex:
            try:
                tabindex = int(element['tabindex'])
                if tabindex > 0:
                    self.add_issue(
                        category="Accessibility",
                        issue="Positive Tabindex Value",
                        description="使用正tabindex值(>0)会破坏正常的键盘导航顺序，应避免使用。",
                        affected_element=str(element)[:100] + ('...' if len(str(element)) > 100 else ''),
                        priority="medium",
                        issue_type="warnings"
                    )
                    break  # 只报告一次
            except ValueError:
                continue
        
        # 检查a标签是否有href属性
        a_tags_without_href = self.soup.find_all('a', href=False)
        a_tags_with_empty_href = self.soup.find_all('a', href='')
        problematic_links = a_tags_without_href + a_tags_with_empty_href
        
        if problematic_links:
            self.add_issue(
                category="Accessibility",
                issue="Links Without Valid HREF",
                description="没有有效href属性的链接不能通过键盘访问，应使用按钮而不是空链接。",
                affected_element=str(problematic_links[0])[:100] + ('...' if len(str(problematic_links[0])) > 100 else ''),
                priority="medium",
                issue_type="warnings"
            )
            
        # 检查onclick事件是否有键盘等效事件
        clickable_elements = self.soup.find_all(attrs={'onclick': True})
        for element in clickable_elements:
            # 检查是否有键盘等效事件(onkeydown, onkeyup, onkeypress)
            has_keyboard_event = any(element.has_attr(attr) for attr in ['onkeydown', 'onkeyup', 'onkeypress'])
            if not has_keyboard_event and element.name not in ['a', 'button', 'input']:
                self.add_issue(
                    category="Accessibility",
                    issue="Clickable Element Not Keyboard Accessible",
                    description="带有onclick事件的元素应提供键盘等效事件，或使用天然可键盘访问的元素如按钮。",
                    affected_element=str(element)[:100] + ('...' if len(str(element)) > 100 else ''),
                    priority="medium",
                    issue_type="warnings"
                )
                break  # 只报告一次