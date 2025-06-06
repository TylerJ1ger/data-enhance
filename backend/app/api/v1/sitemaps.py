from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Optional, Dict, Any
from fastapi.responses import StreamingResponse
import io
import xml.etree.ElementTree as ET
from pydantic import BaseModel

from app.core.sitemaps.sitemaps_processor import SitemapsProcessor

# 创建路由器
router = APIRouter(prefix="/sitemaps", tags=["Sitemaps v1"])

# 设置文件大小限制为 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# 单例实例
sitemaps_processor = SitemapsProcessor()

# Pydantic 模型定义
class SitemapFilterRequest(BaseModel):
    """Sitemap过滤请求模型"""
    domain: Optional[str] = None
    path: Optional[str] = None
    paths: Optional[List[str]] = None  # 多路径支持
    path_filter_type: Optional[str] = "contains"  # 路径筛选类型: contains, not_contains
    depth: Optional[int] = None

class FilteredVisualizationRequest(BaseModel):
    """过滤后可视化请求模型"""
    visualization_type: str = "tree"
    urls: List[str] = []

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
async def upload_sitemap_files(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 检查文件大小
    await check_file_size(files)
    
    try:
        # 处理sitemap文件
        result = await sitemaps_processor.process_files(files)
        return {
            "success": True,
            "message": f"成功处理 {len(files)} 个文件",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"处理文件时发生错误: {str(e)}"
        )

@router.get("/visualization")
async def get_sitemap_visualization(
    visualization_type: str = "tree",
    max_depth: int = 3,
    max_nodes: int = 500
):
    try:
        result = sitemaps_processor.get_visualization_data(
            visualization_type, max_depth, max_nodes
        )
        return {
            "success": True,
            "data": result,
            "visualization_type": visualization_type
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成可视化数据时发生错误: {str(e)}"
        )

@router.post("/filtered-visualization")
async def get_filtered_visualization(request: FilteredVisualizationRequest):
    try:
        result = sitemaps_processor.get_filtered_visualization_data(
            request.visualization_type,
            request.urls
        )
        return {
            "success": True,
            "data": result,
            "visualization_type": request.visualization_type,
            "filtered_urls_count": len(request.urls)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成过滤可视化数据时发生错误: {str(e)}"
        )

@router.post("/filter")
async def filter_sitemap(filters: SitemapFilterRequest):
    try:
        filter_dict = {
            "domain": filters.domain,
            "path": filters.path,
            "paths": filters.paths,
            "path_filter_type": filters.path_filter_type,
            "depth": filters.depth
        }
        
        result = sitemaps_processor.filter_urls(filter_dict)
        
        return {
            "success": True,
            "message": f"过滤完成，找到 {result['total_filtered']} 个匹配的URLs",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"过滤URLs时发生错误: {str(e)}"
        )

@router.get("/common-paths")
async def get_common_paths(min_count: int = 5):
    try:
        common_paths = sitemaps_processor.get_common_paths(min_count)
        return {
            "success": True,
            "data": {
                "common_paths": common_paths,
                "min_count": min_count,
                "total_found": len(common_paths)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取常见路径时发生错误: {str(e)}"
        )

@router.get("/analyze")
async def analyze_sitemap(detailed: bool = False):
    try:
        result = sitemaps_processor.analyze_url_structure(detailed)
        return {
            "success": True,
            "data": result,
            "detailed_analysis": detailed
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"分析sitemap时发生错误: {str(e)}"
        )

@router.get("/export")
async def export_merged_sitemap(format: str = "xml"):
    try:
        data = sitemaps_processor.generate_merged_sitemap(format)
        
        filename = f"merged_sitemap.{format}"
        media_type = "application/xml" if format.lower() == "xml" else "text/csv"
        
        return StreamingResponse(
            io.BytesIO(data),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"导出合并sitemap时发生错误: {str(e)}"
        )

@router.get("/export-filtered")
async def export_filtered_urls(format: str = "csv"):
    try:
        if not sitemaps_processor.filtered_urls:
            return StreamingResponse(
                io.BytesIO(b"No filtered URLs to export"),
                media_type="text/plain",
                headers={"Content-Disposition": f"attachment; filename=no_urls.txt"}
            )
        
        filename = f"filtered_urls.{format}"
        
        if format.lower() == "csv":
            # 创建CSV格式
            csv_data = "URL\n"
            for url in sorted(sitemaps_processor.filtered_urls):
                csv_data += f"{url}\n"
            data = csv_data.encode('utf-8')
            media_type = "text/csv"
        elif format.lower() == "txt":
            # 创建纯文本格式，每行一个URL
            txt_data = "\n".join(sorted(sitemaps_processor.filtered_urls))
            data = txt_data.encode('utf-8')
            media_type = "text/plain"
        elif format.lower() == "xml":
            # 创建XML格式的sitemap
            root = ET.Element("{http://www.sitemaps.org/schemas/sitemap/0.9}urlset")
            root.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
            
            for url in sorted(sitemaps_processor.filtered_urls):
                url_elem = ET.SubElement(root, "url")
                loc = ET.SubElement(url_elem, "loc")
                loc.text = url
            
            xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding='utf-8').decode('utf-8')
            data = xml_str.encode('utf-8')
            media_type = "application/xml"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的导出格式: {format}。支持的格式: csv, txt, xml"
            )
        
        return StreamingResponse(
            io.BytesIO(data),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"导出过滤URLs时发生错误: {str(e)}"
        )

@router.get("/stats")
async def get_sitemap_stats():
    try:
        total_urls = len(sitemaps_processor.merged_urls)
        filtered_urls = len(sitemaps_processor.filtered_urls)
        
        # 获取域名统计
        domains = set()
        for url in sitemaps_processor.merged_urls:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            if parsed.netloc:
                domains.add(parsed.netloc)
        
        return {
            "success": True,
            "data": {
                "total_urls": total_urls,
                "filtered_urls": filtered_urls,
                "unique_domains": len(domains),
                "domains": list(domains),
                "has_data": total_urls > 0
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取统计信息时发生错误: {str(e)}"
        )