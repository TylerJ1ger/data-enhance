from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, Dict, Any
from pydantic import BaseModel

from app.core.seo.seo_processor import SEOProcessor

router = APIRouter(prefix="/seo", tags=["SEO Analysis"])

# 设置文件大小限制为 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Singleton instance
seo_processor = SEOProcessor()

async def check_file_size(file: UploadFile):
    """检查上传文件的大小是否超过限制"""
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"文件 {file.filename} 超过最大大小限制 {MAX_FILE_SIZE/(1024*1024)}MB"
        )
    # 重置文件指针，以便后续处理
    await file.seek(0)

@router.post("/upload")
async def upload_seo_file(
    file: UploadFile = File(...), 
    content_extractor: Optional[str] = Form("auto"),
    enable_advanced_analysis: bool = Form(True)
):
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # 检查文件大小
    await check_file_size(file)
    
    # 检查文件类型是否为HTML
    if not file.filename.lower().endswith(('.html', '.htm')):
        raise HTTPException(status_code=400, detail="Only HTML files are supported")
    
    # 处理文件，传入内容提取引擎和高级分析选项
    result = await seo_processor.process_file(file, content_extractor, enable_advanced_analysis)
    
    return result

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