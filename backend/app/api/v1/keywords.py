from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Optional, Dict, Any, Tuple
from fastapi.responses import StreamingResponse
import io
from pydantic import BaseModel

from app.core.keywords.keywords_processor import KeywordsProcessor

# 创建关键词分析路由器
router = APIRouter(prefix="/keywords", tags=["keywords"])

# 设置文件大小限制为 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# 单例实例
keywords_processor = KeywordsProcessor()


class FilterRanges(BaseModel):
    """关键词筛选范围模型"""
    position_range: Optional[List[float]] = None
    search_volume_range: Optional[List[float]] = None
    keyword_difficulty_range: Optional[List[float]] = None
    cpc_range: Optional[List[float]] = None
    keyword_frequency_range: Optional[List[float]] = None


class KeywordFilterRequest(BaseModel):
    """关键词筛选请求模型"""
    keyword: str


async def check_file_size(files: List[UploadFile]):
    """检查上传文件的大小是否超过限制"""
    for file in files:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"文件 {file.filename} 超过最大大小限制 {MAX_FILE_SIZE/(1024*1024)}MB"
            )
        # 重置文件指针，以便后续处理
        await file.seek(0)


@router.post("/upload")
async def upload_keywords_files(files: List[UploadFile] = File(...)):
    """
    上传并处理关键词CSV/XLSX文件
    
    Args:
        files: 上传的文件列表，支持CSV和XLSX格式
        
    Returns:
        Dict: 包含文件统计信息和合并后数据统计的字典
        
    Raises:
        HTTPException: 当没有提供文件或文件超过大小限制时
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 检查文件大小
    await check_file_size(files)
    
    # 处理文件
    try:
        result = await keywords_processor.process_files(files)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"处理文件时发生错误: {str(e)}"
        )


@router.post("/filter")
async def apply_keywords_filters(filter_ranges: FilterRanges):
    """
    对关键词数据应用筛选条件
    
    Args:
        filter_ranges: 筛选范围参数，包含位置、搜索量、关键词难度、CPC和关键词频率范围
        
    Returns:
        Dict: 包含筛选后数据统计和关键词计数的字典
    """
    try:
        # 转换列表范围为元组
        position_range = tuple(filter_ranges.position_range) if filter_ranges.position_range else None
        search_volume_range = tuple(filter_ranges.search_volume_range) if filter_ranges.search_volume_range else None
        keyword_difficulty_range = tuple(filter_ranges.keyword_difficulty_range) if filter_ranges.keyword_difficulty_range else None
        cpc_range = tuple(filter_ranges.cpc_range) if filter_ranges.cpc_range else None
        keyword_frequency_range = tuple(filter_ranges.keyword_frequency_range) if filter_ranges.keyword_frequency_range else None
        
        # 应用筛选
        result = keywords_processor.apply_filters(
            position_range,
            search_volume_range,
            keyword_difficulty_range,
            cpc_range,
            keyword_frequency_range
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"应用筛选条件时发生错误: {str(e)}"
        )


@router.post("/search")
async def filter_by_keyword(request: KeywordFilterRequest):
    """
    按特定关键词筛选数据，返回该关键词在不同品牌中的位置、URL和流量信息
    
    Args:
        request: 包含要搜索的关键词的请求对象
        
    Returns:
        Dict: 包含搜索结果的字典，每个结果包含关键词、品牌、位置、URL和流量信息
        
    Raises:
        HTTPException: 当没有提供关键词时
    """
    if not request.keyword:
        raise HTTPException(status_code=400, detail="No keyword provided")
    
    try:
        result = keywords_processor.filter_by_keyword(request.keyword)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"按关键词筛选时发生错误: {str(e)}"
        )


@router.get("/brand-overlap")
async def get_brand_overlap():
    """
    获取品牌关键词重叠数据
    
    Returns:
        Dict: 包含重叠矩阵和品牌统计信息的字典
        - overlap_matrix: 品牌间关键词重叠矩阵
        - brand_stats: 每个品牌的总关键词数和唯一关键词数
    """
    try:
        result = keywords_processor.get_brand_overlap()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取品牌重叠数据时发生错误: {str(e)}"
        )


@router.get("/export")
async def export_keywords_data():
    """
    导出筛选后的关键词数据为CSV文件
    
    Returns:
        StreamingResponse: CSV格式的文件流
    """
    try:
        csv_data = keywords_processor.export_filtered_data()
        
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=filtered_keywords.csv"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"导出数据时发生错误: {str(e)}"
        )


@router.get("/export-unique")
async def export_unique_keywords_data():
    """
    导出筛选后的唯一关键词数据为CSV文件
    
    Returns:
        StreamingResponse: CSV格式的文件流，包含去重后的关键词
    """
    try:
        csv_data = keywords_processor.export_unique_filtered_data()
        
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=unique_keywords.csv"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"导出唯一关键词数据时发生错误: {str(e)}"
        )


@router.get("/filter-ranges")
async def get_filter_ranges():
    """
    获取筛选器滑块的最小值和最大值范围
    
    Returns:
        Dict: 包含各个筛选维度的最小值和最大值
        - position: 位置范围
        - search_volume: 搜索量范围  
        - keyword_difficulty: 关键词难度范围
        - cpc: CPC范围
        - keyword_frequency: 关键词频率范围
    """
    try:
        return keywords_processor.get_filter_ranges()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取筛选范围时发生错误: {str(e)}"
        )


@router.get("/health")
async def keywords_health_check():
    """
    关键词分析模块健康检查
    
    Returns:
        Dict: 健康状态信息
    """
    return {
        "status": "healthy",
        "module": "Keywords Analysis",
        "version": "v1"
    }