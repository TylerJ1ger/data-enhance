from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Optional, Dict, Any
from fastapi.responses import StreamingResponse
import io
from pydantic import BaseModel

from app.core.backlinks.backlinks_processor import BacklinksProcessor
from app.core.backlinks.cross_analysis_processor import CrossAnalysisProcessor

router = APIRouter()

# 设置文件大小限制为 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Singleton instances
backlinks_processor = BacklinksProcessor()
cross_analysis_processor = CrossAnalysisProcessor()

class BacklinkFilterRanges(BaseModel):
    domain_ascore_range: Optional[List[float]] = None
    backlinks_range: Optional[List[float]] = None
    domain_frequency_range: Optional[List[float]] = None

class DomainFilterRequest(BaseModel):
    domain: str

class CrossAnalysisExportRequest(BaseModel):
    display_mode: str = "flat"
    search_term: str = ""
    sort_column: str = "page_ascore"
    sort_direction: str = "desc"
    cell_display_type: str = "target_url" 
    comparison_data: Optional[Dict[str, Any]] = None

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
async def upload_backlink_files(files: List[UploadFile] = File(...)):
    """
    Upload and process backlink CSV/XLSX files.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 检查文件大小
    await check_file_size(files)
    
    # Process files
    result = await backlinks_processor.process_files(files)
    
    return result

@router.post("/filter")
async def apply_backlink_filters(filter_ranges: BacklinkFilterRanges):
    """
    Apply filters to processed backlink data.
    """
    # Convert list ranges to tuples
    domain_ascore_range = tuple(filter_ranges.domain_ascore_range) if filter_ranges.domain_ascore_range else None
    backlinks_range = tuple(filter_ranges.backlinks_range) if filter_ranges.backlinks_range else None
    domain_frequency_range = tuple(filter_ranges.domain_frequency_range) if filter_ranges.domain_frequency_range else None
    
    # Apply filters
    result = backlinks_processor.apply_filters(
        domain_ascore_range,
        backlinks_range,
        domain_frequency_range
    )
    
    return result

@router.post("/search")
async def filter_by_domain(request: DomainFilterRequest):
    """
    Filter data by a specific domain and return its information across different brands.
    """
    if not request.domain:
        raise HTTPException(status_code=400, detail="No domain provided")
    
    result = backlinks_processor.filter_by_domain(request.domain)
    
    return result

@router.get("/brand-overlap")
async def get_backlink_brand_overlap():
    """
    Get brand domain overlap data.
    """
    result = backlinks_processor.get_brand_overlap()
    
    return result

@router.get("/export")
async def export_backlink_data():
    """
    Export filtered backlink data as a CSV file.
    """
    csv_data = backlinks_processor.export_filtered_data()
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=filtered_backlinks.csv"}
    )

@router.get("/export-unique")
async def export_unique_backlink_data():
    """
    Export filtered unique domains as a CSV file.
    """
    csv_data = backlinks_processor.export_unique_filtered_data()
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=unique_domains.csv"}
    )

@router.get("/filter-ranges")
async def get_backlink_filter_ranges():
    """
    Get minimum and maximum values for filter sliders.
    """
    return backlinks_processor.get_filter_ranges()

# 交叉分析相关端点
@router.post("/cross-analysis/upload-first")
async def upload_cross_analysis_first_round(files: List[UploadFile] = File(...)):
    """
    上传交叉分析第一轮文件（包含Domain和Domain ascore字段）
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 检查文件大小
    await check_file_size(files)
    
    # 使用交叉分析处理器
    result = await cross_analysis_processor.process_first_round(files)
    
    return result

@router.post("/cross-analysis/upload-second")
async def upload_cross_analysis_second_round(files: List[UploadFile] = File(...)):
    """
    上传交叉分析第二轮文件（包含Source url和Target url字段）并执行交叉分析
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 检查文件大小
    await check_file_size(files)
    
    # 使用交叉分析处理器
    result = await cross_analysis_processor.process_second_round(files)
    
    return result

@router.get("/cross-analysis/export")
async def export_cross_analysis_results(
    display_mode: str = "flat",
    search_term: str = "",
    sort_column: str = "page_ascore",
    sort_direction: str = "desc",
    cell_display_type: str = "target_url"
):
    """
    导出交叉分析结果为CSV文件,支持简单的URL参数筛选
    """
    # 导出对应格式的数据 - 直接调用原方法作为默认导出
    if display_mode == "flat" and not search_term:
        csv_data = cross_analysis_processor.export_results()
    else:
        # 使用新增的筛选导出功能
        csv_data = cross_analysis_processor.export_filtered_results(
            display_mode=display_mode,
            search_term=search_term,
            sort_column=sort_column,
            sort_direction=sort_direction,
            cell_display_type=cell_display_type
        )
    
    # 根据显示模式设置不同的文件名
    filename = "cross_analysis_results.csv"
    if display_mode == "compare":
        filename = "cross_analysis_comparison.csv"
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/cross-analysis/export-filtered")
async def export_filtered_cross_analysis_results(request: CrossAnalysisExportRequest):
    """
    导出交叉分析结果为CSV文件,支持复杂的筛选条件和对比视图数据
    """
    # 导出对应格式的数据
    csv_data = cross_analysis_processor.export_filtered_results(
        display_mode=request.display_mode,
        search_term=request.search_term,
        sort_column=request.sort_column,
        sort_direction=request.sort_direction,
        comparison_data=request.comparison_data,
        cell_display_type=request.cell_display_type
    )
    
    # 根据显示模式设置不同的文件名
    filename = "cross_analysis_results.csv"
    if request.display_mode == "compare":
        filename = "cross_analysis_comparison.csv"
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/health")
async def health_check():
    """
    Backlinks API health check endpoint.
    """
    return {"status": "healthy", "service": "Backlinks API v1"}