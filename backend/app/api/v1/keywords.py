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
    try:
        return keywords_processor.get_filter_ranges()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取筛选范围时发生错误: {str(e)}"
        )


@router.get("/health")
async def keywords_health_check():
    return {
        "status": "healthy",
        "module": "Keywords Analysis",
        "version": "v1"
    }