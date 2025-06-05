from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from typing import Optional, Dict, Any, List
from fastapi.responses import StreamingResponse
import io
import asyncio
from pydantic import BaseModel

from app.core.seo.seo_processor import SEOProcessor

router = APIRouter(prefix="/seo", tags=["SEO Analysis"])

# 设置文件大小限制为 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Singleton instance
seo_processor = SEOProcessor()

# 批量处理请求模型
class BatchSEORequest(BaseModel):
    content_extractor: str = "auto"
    enable_advanced_analysis: bool = True
    
# 导出请求模型
class SEOExportRequest(BaseModel):
    export_type: str = "summary"  # "summary" 或 "detailed"

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

def calculate_timeout_for_files(file_count: int, base_timeout: int = 300) -> int:
    """根据文件数量动态计算超时时间"""
    # 基础超时时间 + 每个文件额外时间
    # 单文件分析通常需要10-30秒，我们预留60秒每个文件
    additional_time_per_file = 60
    total_timeout = base_timeout + (file_count - 1) * additional_time_per_file
    
    # 设置最大超时时间防止过长
    max_timeout = 1800  # 30分钟
    return min(total_timeout, max_timeout)

@router.post("/upload")
async def upload_seo_file(
    file: UploadFile = File(...), 
    content_extractor: Optional[str] = Form("auto"),
    enable_advanced_analysis: bool = Form(True)
):
    """单文件SEO分析（保持原有接口不变）"""
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # 检查文件大小
    await check_file_size([file])
    
    # 检查文件类型是否为HTML
    if not file.filename.lower().endswith(('.html', '.htm')):
        raise HTTPException(status_code=400, detail="Only HTML files are supported")
    
    # 处理文件，传入内容提取引擎和高级分析选项
    result = await seo_processor.process_file(file, content_extractor, enable_advanced_analysis)
    
    return result

@router.post("/batch-upload")
async def batch_upload_seo_files(
    request: Request,
    files: List[UploadFile] = File(...),
    content_extractor: Optional[str] = Form("auto"),
    enable_advanced_analysis: bool = Form(True)
):
    """批量HTML文件SEO分析（新增）"""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 限制文件数量
    if len(files) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 files allowed per batch")
    
    # 检查文件大小
    await check_file_size(files)
    
    # 检查所有文件是否为HTML
    for file in files:
        if not file.filename.lower().endswith(('.html', '.htm')):
            raise HTTPException(
                status_code=400, 
                detail=f"File {file.filename} is not an HTML file. Only HTML files are supported"
            )
    
    # 动态设置超时时间
    timeout = calculate_timeout_for_files(len(files))
    
    try:
        # 批量处理文件
        result = await seo_processor.process_files(files, content_extractor, enable_advanced_analysis)
        
        return {
            "success": True,
            "message": f"Successfully processed {len(files)} files",
            "processing_timeout": timeout,
            **result
        }
        
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=408,
            detail=f"Batch processing timed out after {timeout} seconds. Please try with fewer files."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch processing failed: {str(e)}"
        )

@router.get("/batch-results")
async def get_batch_results():
    """获取批量分析结果"""
    results = seo_processor.get_batch_results()
    stats = seo_processor.get_batch_stats()
    
    if not results:
        raise HTTPException(status_code=404, detail="No batch analysis results found")
    
    return {
        "success": True,
        "results": results,
        "stats": stats,
        "total_results": len(results)
    }

@router.get("/batch-export")
async def export_batch_results(
    export_type: str = "summary"
):
    """导出批量分析结果为CSV文件"""
    if export_type not in ["summary", "detailed"]:
        raise HTTPException(status_code=400, detail="export_type must be 'summary' or 'detailed'")
    
    try:
        if export_type == "summary":
            csv_data = seo_processor.export_batch_results_csv()
            filename = "seo_batch_analysis_summary.csv"
        else:
            csv_data = seo_processor.export_detailed_results_csv()
            filename = "seo_batch_analysis_detailed.csv"
        
        if not csv_data or csv_data == b"No batch analysis results to export":
            raise HTTPException(status_code=404, detail="No batch analysis results available for export")
        
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Export failed: {str(e)}"
        )

@router.post("/batch-export")
async def export_batch_results_post(request: SEOExportRequest):
    """通过POST请求导出批量分析结果（支持更复杂的导出选项）"""
    try:
        if request.export_type == "summary":
            csv_data = seo_processor.export_batch_results_csv()
            filename = "seo_batch_analysis_summary.csv"
        elif request.export_type == "detailed":
            csv_data = seo_processor.export_detailed_results_csv()
            filename = "seo_batch_analysis_detailed.csv"
        else:
            raise HTTPException(status_code=400, detail="export_type must be 'summary' or 'detailed'")
        
        if not csv_data or csv_data == b"No batch analysis results to export":
            raise HTTPException(status_code=404, detail="No batch analysis results available for export")
        
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Export failed: {str(e)}"
        )

@router.delete("/batch-results")
async def clear_batch_results():
    """清除批量分析结果"""
    seo_processor.reset_batch_data()
    
    return {
        "success": True,
        "message": "Batch analysis results cleared"
    }

@router.get("/batch-stats")
async def get_batch_stats():
    """获取批量分析统计信息"""
    stats = seo_processor.get_batch_stats()
    
    return {
        "success": True,
        "stats": stats
    }

@router.get("/categories")
async def get_seo_categories():
    """
    获取所有SEO检查类别
    """
    categories = [
        {"id": "response_codes", "name": "Response Codes", "description": "HTTP响应状态码相关问题"},
        {"id": "security", "name": "Security", "description": "网站安全相关问题，如HTTPS、混合内容等"},
        {"id": "url", "name": "URL", "description": "URL结构和格式相关问题"},
        {"id": "page_titles", "name": "Page Titles", "description": "页面标题相关问题"},
        {"id": "meta_description", "name": "Meta Description", "description": "元描述相关问题"},
        {"id": "h1", "name": "H1", "description": "H1标题相关问题"},
        {"id": "h2", "name": "H2", "description": "H2标题相关问题"},
        {"id": "content", "name": "Content", "description": "内容相关问题，如低质量内容、重复内容等"},
        {"id": "images", "name": "Images", "description": "图片相关问题，如缺少alt文本、图片尺寸等"},
        {"id": "canonicals", "name": "Canonicals", "description": "规范链接相关问题"},
        {"id": "pagination", "name": "Pagination", "description": "分页相关问题"},
        {"id": "hreflang", "name": "Hreflang", "description": "多语言和区域设置相关问题"},
        {"id": "javascript", "name": "JavaScript", "description": "JavaScript相关问题"},
        {"id": "links", "name": "Links", "description": "链接相关问题，如内部链接、锚文本等"},
        {"id": "structured_data", "name": "Structured Data", "description": "结构化数据相关问题"},
        {"id": "mobile", "name": "Mobile", "description": "移动端优化相关问题"},
        {"id": "accessibility", "name": "Accessibility", "description": "无障碍访问相关问题"},
        {"id": "robots_directives", "name": "Robots Directives", "description": "机器人指令相关问题，包括meta robots标签和X-Robots-Tag设置"}
    ]
    return {"categories": categories}

@router.get("/health")
async def seo_health_check():
    """
    SEO service health check endpoint.
    """
    return {"status": "healthy", "service": "SEO Analysis API v1"}