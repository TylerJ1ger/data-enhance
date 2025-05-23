import re
import logging
from typing import Dict, Any, List


class ContentAnalyzer:
    """Handles advanced content analysis including grammar and spelling checks."""
    
    def __init__(self, enable_advanced_analysis: bool = True):
        """
        Initialize content analyzer.
        
        Args:
            enable_advanced_analysis: Whether to enable advanced content analysis
        """
        self.enable_advanced_analysis = enable_advanced_analysis
        
        # Initialize logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger('ContentAnalyzer')
    
    def perform_advanced_content_analysis(self, text_content: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Perform advanced content analysis using language-tool-python and textstat.
        
        Args:
            text_content: The text content to analyze
            
        Returns:
            Dictionary containing spelling and grammar errors
        """
        analysis_results = {
            "spelling_errors": [],
            "grammar_errors": []
        }
        
        if not self.enable_advanced_analysis:
            return analysis_results
            
        try:
            import language_tool_python
            import textstat
            
            # If text content is too little, don't perform analysis
            if len(text_content) < 50:
                return analysis_results
                
            # Detect page main language
            # Simple method: judge by Chinese character ratio
            chinese_chars = sum(1 for c in text_content if '\u4e00' <= c <= '\u9fff')
            is_chinese = chinese_chars / len(text_content) > 0.5 if text_content else False
            lang = 'zh-CN' if is_chinese else 'en-US'
            
            # Initialize LanguageTool
            tool = language_tool_python.LanguageTool(lang)
            
            # To avoid processing overly large text, limit text length
            sample_text = text_content[:5000]  # Take first 5000 characters
            
            # Perform grammar and spelling check
            matches = tool.check(sample_text)
            
            # Filter and classify errors
            valid_spelling_errors = []
            valid_grammar_errors = []
            
            for match in matches:
                # Use new validation method to filter false positives
                if not self.is_valid_error(match, sample_text):
                    continue
                
                error_data = {
                    "text": match.context,
                    "offset": match.offsetInContext,
                    "length": match.errorLength,
                    "message": match.message,
                    "replacements": match.replacements[:5] if match.replacements else []
                }
                
                # Classify errors
                if match.ruleId.startswith(('MORFOLOGIK_', 'SPELLING')):
                    valid_spelling_errors.append(match)
                    analysis_results["spelling_errors"].append(error_data)
                else:
                    valid_grammar_errors.append(match)
                    analysis_results["grammar_errors"].append(error_data)
            
            # Release LanguageTool resources
            tool.close()
            
            # Perform readability analysis (mainly for English content)
            if not is_chinese and len(sample_text) > 100:
                # Flesch Reading Ease score
                reading_ease = textstat.flesch_reading_ease(sample_text)
                
                # Flesch-Kincaid Grade Level
                grade_level = textstat.flesch_kincaid_grade(sample_text)
                
                # Store readability analysis results
                analysis_results["readability"] = {
                    "reading_ease": reading_ease,
                    "grade_level": grade_level,
                    "is_difficult": reading_ease < 30,
                    "is_very_difficult": reading_ease < 50,
                    "is_advanced_level": grade_level > 12
                }
            else:
                # Simple readability check for Chinese content
                # Calculate average sentence length
                sentences = re.split(r'[。！？.!?]', sample_text)
                sentences = [s for s in sentences if len(s.strip()) > 0]
                if sentences:
                    avg_sentence_length = sum(len(s) for s in sentences) / len(sentences)
                    
                    analysis_results["readability"] = {
                        "avg_sentence_length": avg_sentence_length,
                        "is_long_sentences": avg_sentence_length > 50
                    }
            
            return analysis_results
                
        except ImportError as e:
            # If related libraries are not installed, add warning but don't affect basic functionality
            missing_lib = str(e).split("'")[1] if "'" in str(e) else "required libraries"
            self.logger.warning(f"高级内容分析功能受限，缺少{missing_lib}。安装language-tool-python和textstat可获得完整的内容质量分析。")
            return analysis_results
        except Exception as e:
            # Catch other possible exceptions to avoid affecting main functionality
            self.logger.warning(f"执行高级内容分析时出错：{str(e)}")
            return analysis_results
    
    def is_valid_error(self, error, text_content: str) -> bool:
        """
        Validate whether spelling or grammar error is a valid error.
        Filter out false positives.
        
        Args:
            error: Error object returned by language_tool_python
            text_content: Complete text content
            
        Returns:
            bool: Whether it's a valid error
        """
        if not error.context or not hasattr(error, 'offset') or not hasattr(error, 'errorLength'):
            return False
        
        # Extract specific text of the error
        error_start = error.offset
        error_end = error.offset + error.errorLength
        
        # Ensure indices are within range
        if error_start < 0 or error_end > len(error.context):
            return False
            
        error_text = error.context[error_start:error_end].strip()
        
        if not error_text:
            return False
        
        # Common false positive filtering rules
        
        # 1. Filter common English word false positives
        common_words = {
            'support', 'browser', 'content', 'website', 'online', 'video', 'editing',
            'software', 'hardware', 'internet', 'connection', 'application', 'service',
            'template', 'workflow', 'footage', 'desktop', 'integration', 'acceleration',
            'graphics', 'resource', 'endeavor', 'alternatives', 'transitions', 'trimming',
            'accessible', 'alternatives', 'enormous', 'programs', 'notoriously'
        }
        
        if error_text.lower() in common_words:
            self.logger.debug(f"过滤常见词汇误报: {error_text}")
            return False
        
        # 2. Filter technical terms and proper nouns
        tech_terms = {
            'html', 'css', 'javascript', 'api', 'url', 'http', 'https', 'json', 'xml',
            'seo', 'cms', 'ui', 'ux', 'pcmag', 'veed', 'clipchamp', 'ai', 'os'
        }
        
        if error_text.lower() in tech_terms:
            self.logger.debug(f"过滤技术术语误报: {error_text}")
            return False
        
        # 3. Filter brand names and product names (usually start with uppercase)
        if error_text[0].isupper() and len(error_text) > 2:
            # Check if it might be a brand name or proper noun
            if not any(char.islower() for char in error_text[1:3]):  # First few characters are all uppercase
                self.logger.debug(f"过滤可能的品牌名称: {error_text}")
                return False
        
        # 4. Filter too short errors (might be false positives)
        if len(error_text) < 2:
            self.logger.debug(f"过滤过短文本: {error_text}")
            return False
        
        # 5. Filter number and symbol combinations
        if re.match(r'^[\d\W]+$', error_text):
            self.logger.debug(f"过滤数字符号组合: {error_text}")
            return False
        
        # 6. Check if error is part of a longer word
        # Verify by finding error text positions in original content
        error_positions = []
        start = 0
        while True:
            pos = text_content.find(error_text, start)
            if pos == -1:
                break
            error_positions.append(pos)
            start = pos + 1
        
        # Check if each position is a complete word
        valid_positions = []
        for pos in error_positions:
            # Check characters before and after
            before_char = text_content[pos - 1] if pos > 0 else ' '
            after_char = text_content[pos + len(error_text)] if pos + len(error_text) < len(text_content) else ' '
            
            # If both before and after are letters or numbers, it might be part of a word
            if before_char.isalnum() or after_char.isalnum():
                # Get complete word for further checking
                word_start = pos
                word_end = pos + len(error_text)
                
                # Find word boundary backward
                while word_start > 0 and text_content[word_start - 1].isalnum():
                    word_start -= 1
                
                # Find word boundary forward
                while word_end < len(text_content) and text_content[word_end].isalnum():
                    word_end += 1
                
                complete_word = text_content[word_start:word_end]
                
                # If complete word is in common vocabulary, filter this error
                if complete_word.lower() in common_words or complete_word.lower() in tech_terms:
                    self.logger.debug(f"过滤单词片段误报: {error_text} (完整单词: {complete_word})")
                    continue
            
            valid_positions.append(pos)
        
        # If no valid positions, filter
        if not valid_positions:
            return False
        
        # 7. Final check: if error's suggested replacement is obviously unreasonable, filter
        if hasattr(error, 'replacements') and error.replacements:
            # Check if suggestions are reasonable
            original_length = len(error_text)
            for suggestion in error.replacements[:3]:  # Only check first 3 suggestions
                if len(suggestion) == 1 and original_length > 3:
                    # Long word suggested to replace with single character, might be false positive
                    self.logger.debug(f"过滤不合理替换建议: {error_text} -> {suggestion}")
                    return False
        
        return True
    
    def check_soft_404_content(self, text_content: str) -> bool:
        """
        Check if content suggests this is a "soft 404" page.
        
        Args:
            text_content: Text content to check
            
        Returns:
            bool: Whether content suggests soft 404 page
        """
        soft_404_patterns = [
            "找不到页面", "不存在", "已删除", "page not found", "404", 
            "does not exist", "no longer available", "been removed"
        ]
        
        soft_404_matches = [p for p in soft_404_patterns if p.lower() in text_content.lower()]
        return bool(soft_404_matches)
    
    def check_lorem_ipsum(self, text_content: str) -> bool:
        """
        Check if text contains Lorem Ipsum placeholder text.
        
        Args:
            text_content: Text content to check
            
        Returns:
            bool: Whether text contains Lorem Ipsum
        """
        return 'lorem ipsum' in text_content.lower()
    
    def analyze_text_quality(self, text_content: str) -> Dict[str, Any]:
        """
        Analyze overall text quality.
        
        Args:
            text_content: Text content to analyze
            
        Returns:
            Dictionary containing quality analysis results
        """
        quality_analysis = {
            "length": len(text_content),
            "word_count": len(text_content.split()) if text_content else 0,
            "is_low_content": len(text_content) < 300,
            "has_lorem_ipsum": self.check_lorem_ipsum(text_content),
            "is_soft_404": self.check_soft_404_content(text_content)
        }
        
        # Add advanced analysis if enabled
        if self.enable_advanced_analysis:
            advanced_results = self.perform_advanced_content_analysis(text_content)
            quality_analysis.update(advanced_results)
        
        return quality_analysis