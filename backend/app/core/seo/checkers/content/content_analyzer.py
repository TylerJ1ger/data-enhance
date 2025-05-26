"""
Content Analyzer Module

This module provides advanced content analysis capabilities including:
- Grammar and spelling checks using language-tool-python
- Text readability analysis using textstat
- Content quality assessment
- Error validation and false positive filtering

Author: SEO Analysis System
Date: 2025
"""

import re
import logging
from typing import Dict, Any, List, Optional


class ContentAnalyzer:
    """
    Handles advanced content analysis including grammar and spelling checks.
    
    This class provides comprehensive text analysis capabilities for SEO content evaluation,
    including language detection, error checking, readability analysis, and content quality assessment.
    """
    
    def __init__(self, enable_advanced_analysis: bool = True):
        """
        Initialize content analyzer.
        
        Args:
            enable_advanced_analysis: Whether to enable advanced content analysis
                                    (requires language-tool-python and textstat)
        """
        self.enable_advanced_analysis = enable_advanced_analysis
        
        # Initialize logging with module-specific logger
        self.logger = logging.getLogger(f'{__name__}.ContentAnalyzer')
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def perform_advanced_content_analysis(self, text_content: str) -> Dict[str, Any]:
        """
        Perform advanced content analysis using language-tool-python and textstat.
        
        Args:
            text_content: The text content to analyze
            
        Returns:
            Dictionary containing spelling errors, grammar errors, and readability metrics
        """
        analysis_results = {
            "spelling_errors": [],
            "grammar_errors": [],
            "readability": {}
        }
        
        if not self.enable_advanced_analysis:
            self.logger.info("Advanced analysis is disabled")
            return analysis_results
            
        if not text_content or len(text_content.strip()) < 50:
            self.logger.info("Text content too short for meaningful analysis")
            return analysis_results
            
        try:
            # Import libraries with proper error handling
            language_tool_python = self._safe_import('language_tool_python')
            textstat = self._safe_import('textstat')
            
            if not language_tool_python or not textstat:
                return analysis_results
                
            # Detect page main language
            is_chinese = self._detect_language(text_content)
            lang = 'zh-CN' if is_chinese else 'en-US'
            
            # Initialize LanguageTool
            tool = language_tool_python.LanguageTool(lang)
            
            try:
                # Limit text length to avoid performance issues
                sample_text = text_content[:5000]  # Take first 5000 characters
                
                # Perform grammar and spelling check
                matches = tool.check(sample_text)
                
                # Process and classify errors
                self._process_language_errors(matches, sample_text, analysis_results)
                
                # Perform readability analysis
                self._analyze_readability(sample_text, is_chinese, textstat, analysis_results)
                
            finally:
                # Always close the tool to free resources
                tool.close()
            
            self.logger.info(
                f"Analysis completed: {len(analysis_results['spelling_errors'])} spelling errors, "
                f"{len(analysis_results['grammar_errors'])} grammar errors"
            )
            
            return analysis_results
                
        except ImportError as e:
            missing_lib = str(e).split("'")[1] if "'" in str(e) else "required libraries"
            self.logger.warning(
                f"高级内容分析功能受限，缺少{missing_lib}。"
                f"安装language-tool-python和textstat可获得完整的内容质量分析。"
            )
            return analysis_results
        except Exception as e:
            self.logger.error(f"执行高级内容分析时出错：{str(e)}")
            return analysis_results
    
    def _safe_import(self, module_name: str) -> Optional[Any]:
        """
        Safely import a module with error handling.
        
        Args:
            module_name: Name of the module to import
            
        Returns:
            Imported module or None if import fails
        """
        try:
            return __import__(module_name)
        except ImportError:
            self.logger.warning(f"Cannot import {module_name}")
            return None
    
    def _detect_language(self, text_content: str) -> bool:
        """
        Detect if the text is primarily Chinese.
        
        Args:
            text_content: Text to analyze
            
        Returns:
            True if text is primarily Chinese, False otherwise
        """
        if not text_content:
            return False
            
        chinese_chars = sum(1 for c in text_content if '\u4e00' <= c <= '\u9fff')
        total_chars = len(text_content)
        
        if total_chars == 0:
            return False
            
        chinese_ratio = chinese_chars / total_chars
        is_chinese = chinese_ratio > 0.5
        
        self.logger.debug(f"Language detection: Chinese ratio = {chinese_ratio:.2f}, is_chinese = {is_chinese}")
        return is_chinese
    
    def _process_language_errors(self, matches: List, sample_text: str, analysis_results: Dict[str, Any]) -> None:
        """
        Process and classify language errors from LanguageTool.
        
        Args:
            matches: List of matches from LanguageTool
            sample_text: The text that was analyzed
            analysis_results: Dictionary to store results
        """
        for match in matches:
            # Use validation method to filter false positives
            if not self.is_valid_error(match, sample_text):
                continue
            
            error_data = {
                "text": match.context,
                "offset": match.offsetInContext,
                "length": match.errorLength,
                "message": match.message,
                "replacements": match.replacements[:5] if match.replacements else []
            }
            
            # Classify errors based on rule ID
            if match.ruleId.startswith(('MORFOLOGIK_', 'SPELLING')):
                analysis_results["spelling_errors"].append(error_data)
            else:
                analysis_results["grammar_errors"].append(error_data)
    
    def _analyze_readability(self, sample_text: str, is_chinese: bool, textstat: Any, 
                           analysis_results: Dict[str, Any]) -> None:
        """
        Analyze text readability using appropriate metrics.
        
        Args:
            sample_text: Text to analyze
            is_chinese: Whether the text is primarily Chinese
            textstat: The textstat module
            analysis_results: Dictionary to store results
        """
        try:
            if not is_chinese and len(sample_text) > 100:
                # English readability analysis
                reading_ease = textstat.flesch_reading_ease(sample_text)
                grade_level = textstat.flesch_kincaid_grade(sample_text)
                
                analysis_results["readability"] = {
                    "reading_ease": reading_ease,
                    "grade_level": grade_level,
                    "is_difficult": reading_ease < 30,
                    "is_very_difficult": reading_ease < 50,
                    "is_advanced_level": grade_level > 12,
                    "language": "english"
                }
                
                self.logger.debug(
                    f"English readability: ease={reading_ease:.1f}, grade={grade_level:.1f}"
                )
            else:
                # Chinese readability analysis - sentence length based
                sentences = re.split(r'[。！？.!?]', sample_text)
                sentences = [s.strip() for s in sentences if len(s.strip()) > 0]
                
                if sentences:
                    avg_sentence_length = sum(len(s) for s in sentences) / len(sentences)
                    
                    analysis_results["readability"] = {
                        "avg_sentence_length": avg_sentence_length,
                        "is_long_sentences": avg_sentence_length > 50,
                        "sentence_count": len(sentences),
                        "language": "chinese"
                    }
                    
                    self.logger.debug(
                        f"Chinese readability: avg_length={avg_sentence_length:.1f}, "
                        f"sentences={len(sentences)}"
                    )
        except Exception as e:
            self.logger.warning(f"Readability analysis failed: {str(e)}")
    
    def is_valid_error(self, error: Any, text_content: str) -> bool:
        """
        Validate whether spelling or grammar error is a valid error.
        Filter out false positives using comprehensive rules.
        
        Args:
            error: Error object returned by language_tool_python
            text_content: Complete text content
            
        Returns:
            bool: Whether it's a valid error
        """
        if not self._has_required_error_attributes(error):
            return False
        
        error_text = self._extract_error_text(error)
        if not error_text:
            return False
        
        # Apply comprehensive false positive filters
        if self._is_common_word_false_positive(error_text):
            return False
            
        if self._is_technical_term_false_positive(error_text):
            return False
            
        if self._is_brand_name_false_positive(error_text):
            return False
            
        if self._is_too_short_or_symbolic(error_text):
            return False
            
        if not self._is_complete_word_in_context(error_text, text_content):
            return False
            
        if self._has_unreasonable_suggestions(error, error_text):
            return False
        
        return True
    
    def _has_required_error_attributes(self, error: Any) -> bool:
        """Check if error object has required attributes."""
        return (hasattr(error, 'context') and error.context and 
                hasattr(error, 'offset') and hasattr(error, 'errorLength'))
    
    def _extract_error_text(self, error: Any) -> str:
        """Extract and validate error text from error object."""
        try:
            error_start = error.offset
            error_end = error.offset + error.errorLength
            
            if error_start < 0 or error_end > len(error.context):
                return ""
                
            error_text = error.context[error_start:error_end].strip()
            return error_text
        except (AttributeError, IndexError):
            return ""
    
    def _is_common_word_false_positive(self, error_text: str) -> bool:
        """Check if error is a common word false positive."""
        common_words = {
            'support', 'browser', 'content', 'website', 'online', 'video', 'editing',
            'software', 'hardware', 'internet', 'connection', 'application', 'service',
            'template', 'workflow', 'footage', 'desktop', 'integration', 'acceleration',
            'graphics', 'resource', 'endeavor', 'alternatives', 'transitions', 'trimming',
            'accessible', 'alternatives', 'enormous', 'programs', 'notoriously'
        }
        
        if error_text.lower() in common_words:
            self.logger.debug(f"过滤常见词汇误报: {error_text}")
            return True
        return False
    
    def _is_technical_term_false_positive(self, error_text: str) -> bool:
        """Check if error is a technical term false positive."""
        tech_terms = {
            'html', 'css', 'javascript', 'api', 'url', 'http', 'https', 'json', 'xml',
            'seo', 'cms', 'ui', 'ux', 'pcmag', 'veed', 'clipchamp', 'ai', 'os'
        }
        
        if error_text.lower() in tech_terms:
            self.logger.debug(f"过滤技术术语误报: {error_text}")
            return True
        return False
    
    def _is_brand_name_false_positive(self, error_text: str) -> bool:
        """Check if error is a brand name false positive."""
        if (len(error_text) > 2 and error_text[0].isupper() and 
            not any(char.islower() for char in error_text[1:3])):
            self.logger.debug(f"过滤可能的品牌名称: {error_text}")
            return True
        return False
    
    def _is_too_short_or_symbolic(self, error_text: str) -> bool:
        """Check if error is too short or purely symbolic."""
        if len(error_text) < 2:
            self.logger.debug(f"过滤过短文本: {error_text}")
            return True
            
        if re.match(r'^[\d\W]+$', error_text):
            self.logger.debug(f"过滤数字符号组合: {error_text}")
            return True
            
        return False
    
    def _is_complete_word_in_context(self, error_text: str, text_content: str) -> bool:
        """Check if error represents a complete word in context."""
        # Find all positions of error text in content
        error_positions = []
        start = 0
        while True:
            pos = text_content.find(error_text, start)
            if pos == -1:
                break
            error_positions.append(pos)
            start = pos + 1
        
        # Check if any position represents a complete word
        for pos in error_positions:
            if self._is_word_boundary(error_text, text_content, pos):
                return True
        
        return False
    
    def _is_word_boundary(self, error_text: str, text_content: str, pos: int) -> bool:
        """Check if error text at position represents a complete word."""
        before_char = text_content[pos - 1] if pos > 0 else ' '
        after_char = text_content[pos + len(error_text)] if pos + len(error_text) < len(text_content) else ' '
        
        # If surrounded by word characters, it's part of a larger word
        if before_char.isalnum() or after_char.isalnum():
            # Get the complete word for validation
            complete_word = self._extract_complete_word(text_content, pos, len(error_text))
            return self._is_valid_complete_word(complete_word)
        
        return True
    
    def _extract_complete_word(self, text_content: str, start_pos: int, error_length: int) -> str:
        """Extract the complete word containing the error."""
        word_start = start_pos
        word_end = start_pos + error_length
        
        # Find word boundary backward
        while word_start > 0 and text_content[word_start - 1].isalnum():
            word_start -= 1
        
        # Find word boundary forward
        while word_end < len(text_content) and text_content[word_end].isalnum():
            word_end += 1
        
        return text_content[word_start:word_end]
    
    def _is_valid_complete_word(self, complete_word: str) -> bool:
        """Check if the complete word is valid (not in exclusion lists)."""
        common_words = {
            'support', 'browser', 'content', 'website', 'online', 'video', 'editing',
            'software', 'hardware', 'internet', 'connection', 'application', 'service'
        }
        tech_terms = {
            'html', 'css', 'javascript', 'api', 'url', 'http', 'https', 'json', 'xml'
        }
        
        word_lower = complete_word.lower()
        return word_lower not in common_words and word_lower not in tech_terms
    
    def _has_unreasonable_suggestions(self, error: Any, error_text: str) -> bool:
        """Check if error has unreasonable replacement suggestions."""
        if not hasattr(error, 'replacements') or not error.replacements:
            return False
            
        original_length = len(error_text)
        for suggestion in error.replacements[:3]:  # Check first 3 suggestions
            if len(suggestion) == 1 and original_length > 3:
                self.logger.debug(f"过滤不合理替换建议: {error_text} -> {suggestion}")
                return True
        
        return False
    
    def check_soft_404_content(self, text_content: str) -> bool:
        """
        Check if content suggests this is a "soft 404" page.
        
        Args:
            text_content: Text content to check
            
        Returns:
            bool: Whether content suggests soft 404 page
        """
        if not text_content:
            return False
            
        soft_404_patterns = [
            "找不到页面", "不存在", "已删除", "page not found", "404", 
            "does not exist", "no longer available", "been removed",
            "无法找到", "抱歉，您访问的页面不存在", "sorry, the page you requested was not found"
        ]
        
        text_lower = text_content.lower()
        matched_patterns = [p for p in soft_404_patterns if p.lower() in text_lower]
        
        if matched_patterns:
            self.logger.debug(f"检测到软404模式: {matched_patterns}")
            return True
            
        return False
    
    def check_lorem_ipsum(self, text_content: str) -> bool:
        """
        Check if text contains Lorem Ipsum placeholder text.
        
        Args:
            text_content: Text content to check
            
        Returns:
            bool: Whether text contains Lorem Ipsum
        """
        if not text_content:
            return False
            
        lorem_patterns = [
            r'lorem\s+ipsum',
            r'dolor\s+sit\s+amet',
            r'consectetur\s+adipiscing\s+elit',
        ]
        
        text_lower = text_content.lower()
        for pattern in lorem_patterns:
            if re.search(pattern, text_lower):
                self.logger.debug(f"检测到Lorem Ipsum文本: {pattern}")
                return True
                
        return False
    
    def analyze_text_quality(self, text_content: str) -> Dict[str, Any]:
        """
        Analyze overall text quality with comprehensive metrics.
        
        Args:
            text_content: Text content to analyze
            
        Returns:
            Dictionary containing quality analysis results
        """
        if not text_content:
            return {
                "length": 0,
                "word_count": 0,
                "is_low_content": True,
                "has_lorem_ipsum": False,
                "is_soft_404": False
            }
        
        # Basic quality metrics
        word_count = len(text_content.split()) if text_content else 0
        
        quality_analysis = {
            "length": len(text_content),
            "word_count": word_count,
            "is_low_content": len(text_content) < 300,
            "has_lorem_ipsum": self.check_lorem_ipsum(text_content),
            "is_soft_404": self.check_soft_404_content(text_content),
            "average_word_length": self._calculate_average_word_length(text_content),
            "sentence_count": self._count_sentences(text_content)
        }
        
        # Add advanced analysis if enabled
        if self.enable_advanced_analysis:
            try:
                advanced_results = self.perform_advanced_content_analysis(text_content)
                quality_analysis.update(advanced_results)
            except Exception as e:
                self.logger.warning(f"Advanced analysis failed in quality check: {str(e)}")
        
        return quality_analysis
    
    def _calculate_average_word_length(self, text_content: str) -> float:
        """Calculate average word length in the text."""
        words = text_content.split()
        if not words:
            return 0.0
        return sum(len(word.strip('.,!?;:')) for word in words) / len(words)
    
    def _count_sentences(self, text_content: str) -> int:
        """Count the number of sentences in the text."""
        sentences = re.split(r'[。！？.!?]', text_content)
        return len([s for s in sentences if s.strip()])