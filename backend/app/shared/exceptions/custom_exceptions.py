"""
自定义异常类模块

提供项目中使用的所有自定义异常类，用于统一异常处理和错误信息管理。
按照功能模块分组，确保异常处理的一致性和可维护性。
"""

from typing import Optional, Dict, Any, List
from fastapi import HTTPException


class BaseApplicationException(Exception):
    """应用程序基础异常类"""
    
    def __init__(
        self, 
        message: str, 
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """将异常转换为字典格式，便于API返回"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details
        }


# ================================
# 文件处理相关异常
# ================================

class FileProcessingException(BaseApplicationException):
    """文件处理基础异常"""
    pass


class FileSizeExceededException(FileProcessingException):
    """文件大小超限异常"""
    
    def __init__(
        self, 
        filename: str, 
        file_size: int, 
        max_size: int,
        message: Optional[str] = None
    ):
        self.filename = filename
        self.file_size = file_size
        self.max_size = max_size
        
        if not message:
            message = f"文件 {filename} 大小 {file_size/(1024*1024):.1f}MB 超过最大限制 {max_size/(1024*1024):.1f}MB"
        
        super().__init__(
            message=message,
            details={
                "filename": filename,
                "file_size": file_size,
                "max_size": max_size,
                "file_size_mb": round(file_size/(1024*1024), 2),
                "max_size_mb": round(max_size/(1024*1024), 2)
            }
        )


class UnsupportedFileTypeException(FileProcessingException):
    """不支持的文件类型异常"""
    
    def __init__(
        self, 
        filename: str, 
        file_extension: str, 
        supported_extensions: List[str],
        message: Optional[str] = None
    ):
        self.filename = filename
        self.file_extension = file_extension
        self.supported_extensions = supported_extensions
        
        if not message:
            message = f"文件 {filename} 的格式 .{file_extension} 不被支持。支持的格式: {', '.join(supported_extensions)}"
        
        super().__init__(
            message=message,
            details={
                "filename": filename,
                "file_extension": file_extension,
                "supported_extensions": supported_extensions
            }
        )


class FileParsingException(FileProcessingException):
    """文件解析异常"""
    
    def __init__(
        self, 
        filename: str, 
        parsing_error: str,
        message: Optional[str] = None
    ):
        self.filename = filename
        self.parsing_error = parsing_error
        
        if not message:
            message = f"文件 {filename} 解析失败: {parsing_error}"
        
        super().__init__(
            message=message,
            details={
                "filename": filename,
                "parsing_error": parsing_error
            }
        )


class EmptyFileException(FileProcessingException):
    """空文件异常"""
    
    def __init__(self, filename: str, message: Optional[str] = None):
        self.filename = filename
        
        if not message:
            message = f"文件 {filename} 是空文件或不包含有效数据"
        
        super().__init__(
            message=message,
            details={"filename": filename}
        )


# ================================
# 数据处理相关异常
# ================================

class DataProcessingException(BaseApplicationException):
    """数据处理基础异常"""
    pass


class MissingRequiredColumnsException(DataProcessingException):
    """缺少必需列异常"""
    
    def __init__(
        self, 
        missing_columns: List[str], 
        available_columns: List[str],
        message: Optional[str] = None
    ):
        self.missing_columns = missing_columns
        self.available_columns = available_columns
        
        if not message:
            message = f"数据缺少必需的列: {', '.join(missing_columns)}。可用列: {', '.join(available_columns)}"
        
        super().__init__(
            message=message,
            details={
                "missing_columns": missing_columns,
                "available_columns": available_columns
            }
        )


class InvalidDataFormatException(DataProcessingException):
    """无效数据格式异常"""
    
    def __init__(
        self, 
        data_type: str, 
        expected_format: str, 
        actual_format: str,
        message: Optional[str] = None
    ):
        self.data_type = data_type
        self.expected_format = expected_format
        self.actual_format = actual_format
        
        if not message:
            message = f"{data_type} 数据格式错误。期望格式: {expected_format}，实际格式: {actual_format}"
        
        super().__init__(
            message=message,
            details={
                "data_type": data_type,
                "expected_format": expected_format,
                "actual_format": actual_format
            }
        )


class DataValidationException(DataProcessingException):
    """数据验证异常"""
    
    def __init__(
        self, 
        validation_errors: List[str],
        message: Optional[str] = None
    ):
        self.validation_errors = validation_errors
        
        if not message:
            message = f"数据验证失败: {'; '.join(validation_errors)}"
        
        super().__init__(
            message=message,
            details={"validation_errors": validation_errors}
        )


class InsufficientDataException(DataProcessingException):
    """数据量不足异常"""
    
    def __init__(
        self, 
        data_count: int, 
        minimum_required: int,
        data_type: str = "数据",
        message: Optional[str] = None
    ):
        self.data_count = data_count
        self.minimum_required = minimum_required
        self.data_type = data_type
        
        if not message:
            message = f"{data_type}数量不足。当前: {data_count}，最少需要: {minimum_required}"
        
        super().__init__(
            message=message,
            details={
                "data_count": data_count,
                "minimum_required": minimum_required,
                "data_type": data_type
            }
        )


# ================================
# SEO检查相关异常
# ================================

class SEOCheckException(BaseApplicationException):
    """SEO检查基础异常"""
    pass


class HTMLParsingException(SEOCheckException):
    """HTML解析异常"""
    
    def __init__(
        self, 
        parsing_error: str,
        message: Optional[str] = None
    ):
        self.parsing_error = parsing_error
        
        if not message:
            message = f"HTML解析失败: {parsing_error}"
        
        super().__init__(
            message=message,
            details={"parsing_error": parsing_error}
        )


class ContentExtractionException(SEOCheckException):
    """内容提取异常"""
    
    def __init__(
        self, 
        extractor_name: str, 
        extraction_error: str,
        message: Optional[str] = None
    ):
        self.extractor_name = extractor_name
        self.extraction_error = extraction_error
        
        if not message:
            message = f"使用 {extractor_name} 提取内容失败: {extraction_error}"
        
        super().__init__(
            message=message,
            details={
                "extractor_name": extractor_name,
                "extraction_error": extraction_error
            }
        )


class MissingLibraryException(SEOCheckException):
    """缺少依赖库异常"""
    
    def __init__(
        self, 
        library_name: str, 
        feature_name: str,
        message: Optional[str] = None
    ):
        self.library_name = library_name
        self.feature_name = feature_name
        
        if not message:
            message = f"缺少 {library_name} 库，{feature_name} 功能不可用。请安装: pip install {library_name}"
        
        super().__init__(
            message=message,
            details={
                "library_name": library_name,
                "feature_name": feature_name
            }
        )


class AdvancedAnalysisException(SEOCheckException):
    """高级内容分析异常"""
    
    def __init__(
        self, 
        analysis_type: str, 
        analysis_error: str,
        message: Optional[str] = None
    ):
        self.analysis_type = analysis_type
        self.analysis_error = analysis_error
        
        if not message:
            message = f"{analysis_type} 分析失败: {analysis_error}"
        
        super().__init__(
            message=message,
            details={
                "analysis_type": analysis_type,
                "analysis_error": analysis_error
            }
        )


# ================================
# 站点地图相关异常
# ================================

class SitemapProcessingException(BaseApplicationException):
    """站点地图处理基础异常"""
    pass


class InvalidSitemapFormatException(SitemapProcessingException):
    """无效站点地图格式异常"""
    
    def __init__(
        self, 
        filename: str, 
        format_error: str,
        message: Optional[str] = None
    ):
        self.filename = filename
        self.format_error = format_error
        
        if not message:
            message = f"站点地图 {filename} 格式无效: {format_error}"
        
        super().__init__(
            message=message,
            details={
                "filename": filename,
                "format_error": format_error
            }
        )


class XMLParsingException(SitemapProcessingException):
    """XML解析异常"""
    
    def __init__(
        self, 
        filename: str, 
        xml_error: str,
        message: Optional[str] = None
    ):
        self.filename = filename
        self.xml_error = xml_error
        
        if not message:
            message = f"XML文件 {filename} 解析失败: {xml_error}"
        
        super().__init__(
            message=message,
            details={
                "filename": filename,
                "xml_error": xml_error
            }
        )


class URLExtractionException(SitemapProcessingException):
    """URL提取异常"""
    
    def __init__(
        self, 
        source: str, 
        extraction_error: str,
        message: Optional[str] = None
    ):
        self.source = source
        self.extraction_error = extraction_error
        
        if not message:
            message = f"从 {source} 提取URL失败: {extraction_error}"
        
        super().__init__(
            message=message,
            details={
                "source": source,
                "extraction_error": extraction_error
            }
        )


# ================================
# 交叉分析相关异常
# ================================

class CrossAnalysisException(BaseApplicationException):
    """交叉分析基础异常"""
    pass


class FirstRoundDataMissingException(CrossAnalysisException):
    """第一轮数据缺失异常"""
    
    def __init__(self, message: Optional[str] = None):
        if not message:
            message = "交叉分析需要先上传第一轮数据（包含Domain和Domain ascore字段）"
        
        super().__init__(message=message)


class DomainMappingException(CrossAnalysisException):
    """域名映射异常"""
    
    def __init__(
        self, 
        mapping_error: str,
        message: Optional[str] = None
    ):
        self.mapping_error = mapping_error
        
        if not message:
            message = f"域名映射处理失败: {mapping_error}"
        
        super().__init__(
            message=message,
            details={"mapping_error": mapping_error}
        )


# ================================
# API相关异常
# ================================

class APIException(BaseApplicationException):
    """API基础异常"""
    pass


class InvalidRequestException(APIException):
    """无效请求异常"""
    
    def __init__(
        self, 
        request_errors: List[str],
        message: Optional[str] = None
    ):
        self.request_errors = request_errors
        
        if not message:
            message = f"请求参数错误: {'; '.join(request_errors)}"
        
        super().__init__(
            message=message,
            details={"request_errors": request_errors}
        )


class ResourceNotFoundException(APIException):
    """资源未找到异常"""
    
    def __init__(
        self, 
        resource_type: str, 
        resource_id: str,
        message: Optional[str] = None
    ):
        self.resource_type = resource_type
        self.resource_id = resource_id
        
        if not message:
            message = f"未找到 {resource_type}: {resource_id}"
        
        super().__init__(
            message=message,
            details={
                "resource_type": resource_type,
                "resource_id": resource_id
            }
        )


class ProcessingTimeoutException(APIException):
    """处理超时异常"""
    
    def __init__(
        self, 
        operation: str, 
        timeout_seconds: int,
        message: Optional[str] = None
    ):
        self.operation = operation
        self.timeout_seconds = timeout_seconds
        
        if not message:
            message = f"操作 {operation} 超时（{timeout_seconds}秒）"
        
        super().__init__(
            message=message,
            details={
                "operation": operation,
                "timeout_seconds": timeout_seconds
            }
        )


# ================================
# 异常处理工具函数
# ================================

def handle_file_upload_exceptions(func):
    """文件上传异常处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except FileSizeExceededException as e:
            raise HTTPException(status_code=413, detail=e.to_dict())
        except UnsupportedFileTypeException as e:
            raise HTTPException(status_code=400, detail=e.to_dict())
        except EmptyFileException as e:
            raise HTTPException(status_code=400, detail=e.to_dict())
        except FileParsingException as e:
            raise HTTPException(status_code=422, detail=e.to_dict())
        except BaseApplicationException as e:
            raise HTTPException(status_code=500, detail=e.to_dict())
    return wrapper


def handle_data_processing_exceptions(func):
    """数据处理异常处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except MissingRequiredColumnsException as e:
            raise HTTPException(status_code=400, detail=e.to_dict())
        except InvalidDataFormatException as e:
            raise HTTPException(status_code=422, detail=e.to_dict())
        except DataValidationException as e:
            raise HTTPException(status_code=422, detail=e.to_dict())
        except InsufficientDataException as e:
            raise HTTPException(status_code=400, detail=e.to_dict())
        except BaseApplicationException as e:
            raise HTTPException(status_code=500, detail=e.to_dict())
    return wrapper


def handle_seo_processing_exceptions(func):
    """SEO处理异常处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except HTMLParsingException as e:
            raise HTTPException(status_code=422, detail=e.to_dict())
        except ContentExtractionException as e:
            raise HTTPException(status_code=422, detail=e.to_dict())
        except MissingLibraryException as e:
            raise HTTPException(status_code=503, detail=e.to_dict())
        except BaseApplicationException as e:
            raise HTTPException(status_code=500, detail=e.to_dict())
    return wrapper


def handle_sitemap_processing_exceptions(func):
    """站点地图处理异常处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except InvalidSitemapFormatException as e:
            raise HTTPException(status_code=400, detail=e.to_dict())
        except XMLParsingException as e:
            raise HTTPException(status_code=422, detail=e.to_dict())
        except URLExtractionException as e:
            raise HTTPException(status_code=422, detail=e.to_dict())
        except BaseApplicationException as e:
            raise HTTPException(status_code=500, detail=e.to_dict())
    return wrapper


def handle_cross_analysis_exceptions(func):
    """交叉分析异常处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except FirstRoundDataMissingException as e:
            raise HTTPException(status_code=400, detail=e.to_dict())
        except DomainMappingException as e:
            raise HTTPException(status_code=422, detail=e.to_dict())
        except BaseApplicationException as e:
            raise HTTPException(status_code=500, detail=e.to_dict())
    return wrapper


# ================================
# 通用异常转换工具
# ================================

def convert_to_http_exception(exception: BaseApplicationException, default_status_code: int = 500) -> HTTPException:
    """将自定义异常转换为HTTP异常"""
    status_code_mapping = {
        # 文件相关异常
        FileSizeExceededException: 413,
        UnsupportedFileTypeException: 400,
        EmptyFileException: 400,
        FileParsingException: 422,
        
        # 数据相关异常
        MissingRequiredColumnsException: 400,
        InvalidDataFormatException: 422,
        DataValidationException: 422,
        InsufficientDataException: 400,
        
        # SEO相关异常
        HTMLParsingException: 422,
        ContentExtractionException: 422,
        MissingLibraryException: 503,
        
        # 站点地图相关异常
        InvalidSitemapFormatException: 400,
        XMLParsingException: 422,
        URLExtractionException: 422,
        
        # 交叉分析相关异常
        FirstRoundDataMissingException: 400,
        DomainMappingException: 422,
        
        # API相关异常
        InvalidRequestException: 400,
        ResourceNotFoundException: 404,
        ProcessingTimeoutException: 408,
    }
    
    status_code = status_code_mapping.get(type(exception), default_status_code)
    return HTTPException(status_code=status_code, detail=exception.to_dict())


def create_error_response(
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    status_code: int = 500
) -> HTTPException:
    """创建标准错误响应"""
    error_detail = {
        "error_code": error_code,
        "message": message,
        "details": details or {}
    }
    return HTTPException(status_code=status_code, detail=error_detail)


# ================================
# 异常日志记录工具
# ================================

import logging

def log_exception(
    exception: BaseApplicationException,
    logger: Optional[logging.Logger] = None,
    context: Optional[Dict[str, Any]] = None
):
    """记录异常日志"""
    if not logger:
        logger = logging.getLogger(__name__)
    
    log_message = f"Exception: {exception.error_code} - {exception.message}"
    
    if context:
        log_message += f" | Context: {context}"
    
    if exception.details:
        log_message += f" | Details: {exception.details}"
    
    # 根据异常类型选择日志级别
    if isinstance(exception, (
        FileSizeExceededException,
        UnsupportedFileTypeException,
        InvalidRequestException
    )):
        logger.warning(log_message)
    elif isinstance(exception, (
        MissingLibraryException,
        ProcessingTimeoutException
    )):
        logger.error(log_message)
    else:
        logger.info(log_message)