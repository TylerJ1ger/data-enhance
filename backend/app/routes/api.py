from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Optional, Dict, Any
from fastapi.responses import StreamingResponse
import io
import json
import xml.etree.ElementTree as ET
from pydantic import BaseModel

from app.services.csv_processor import CSVProcessor
from app.services.sitemap_processor import SitemapProcessor
from app.services.seo_processor import SEOProcessor

router = APIRouter()

# Singleton instances
csv_processor = CSVProcessor()
sitemap_processor = SitemapProcessor()
seo_processor = SEOProcessor()

class FilterRanges(BaseModel):
    position_range: Optional[List[float]] = None
    search_volume_range: Optional[List[float]] = None
    keyword_difficulty_range: Optional[List[float]] = None
    cpc_range: Optional[List[float]] = None
    keyword_frequency_range: Optional[List[float]] = None

class KeywordFilterRequest(BaseModel):
    keyword: str

class SitemapFilterRequest(BaseModel):
    domain: Optional[str] = None
    path: Optional[str] = None
    paths: Optional[List[str]] = None  # 新增的多路径支持
    path_filter_type: Optional[str] = "contains"  # 路径筛选类型
    depth: Optional[int] = None

class FilteredVisualizationRequest(BaseModel):
    visualization_type: str = "tree"
    urls: List[str] = []

@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Upload and process CSV/XLSX files.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Process files
    result = await csv_processor.process_files(files)
    
    return result

@router.post("/filter")
async def apply_filters(filter_ranges: FilterRanges):
    """
    Apply filters to processed data.
    """
    # Convert list ranges to tuples
    position_range = tuple(filter_ranges.position_range) if filter_ranges.position_range else None
    search_volume_range = tuple(filter_ranges.search_volume_range) if filter_ranges.search_volume_range else None
    keyword_difficulty_range = tuple(filter_ranges.keyword_difficulty_range) if filter_ranges.keyword_difficulty_range else None
    cpc_range = tuple(filter_ranges.cpc_range) if filter_ranges.cpc_range else None
    keyword_frequency_range = tuple(filter_ranges.keyword_frequency_range) if filter_ranges.keyword_frequency_range else None
    
    # Apply filters
    result = csv_processor.apply_filters(
        position_range,
        search_volume_range,
        keyword_difficulty_range,
        cpc_range,
        keyword_frequency_range
    )
    
    return result

@router.post("/keyword-filter")
async def filter_by_keyword(request: KeywordFilterRequest):
    """
    Filter data by a specific keyword and return its position, URL, and traffic across different brands.
    """
    if not request.keyword:
        raise HTTPException(status_code=400, detail="No keyword provided")
    
    result = csv_processor.filter_by_keyword(request.keyword)
    
    return result

@router.get("/brand-overlap")
async def get_brand_overlap():
    """
    Get brand keyword overlap data.
    """
    result = csv_processor.get_brand_overlap()
    
    return result

@router.get("/export")
async def export_data():
    """
    Export filtered data as a CSV file.
    """
    csv_data = csv_processor.export_filtered_data()
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=filtered_data.csv"}
    )

@router.get("/export-unique")
async def export_unique_data():
    """
    Export filtered unique keywords as a CSV file.
    """
    csv_data = csv_processor.export_unique_filtered_data()
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=unique_keywords.csv"}
    )

@router.get("/filter-ranges")
async def get_filter_ranges():
    """
    Get minimum and maximum values for filter sliders.
    """
    return csv_processor.get_filter_ranges()

# 以下是Sitemap相关API端点

@router.post("/sitemap/upload")
async def upload_sitemap_files(files: List[UploadFile] = File(...)):
    """
    Upload and process Sitemap XML files.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Process sitemap files
    result = await sitemap_processor.process_files(files)
    
    return result

@router.get("/sitemap/visualization")
async def get_sitemap_visualization(visualization_type: str = "tree"):
    """
    Get sitemap visualization data in the specified format.
    """
    result = sitemap_processor.get_visualization_data(visualization_type)
    
    return result

@router.post("/sitemap/filtered-visualization")
async def get_filtered_visualization(request: FilteredVisualizationRequest):
    """
    Get visualization data for a filtered set of URLs.
    """
    result = sitemap_processor.get_filtered_visualization_data(
        request.visualization_type,
        request.urls
    )
    
    return result

@router.post("/sitemap/filter")
async def filter_sitemap(filters: SitemapFilterRequest):
    """
    Filter sitemap URLs based on specified criteria.
    """
    result = sitemap_processor.filter_urls({
        "domain": filters.domain,
        "path": filters.path,
        "paths": filters.paths,  # 新增多路径筛选
        "path_filter_type": filters.path_filter_type,  # 路径筛选类型
        "depth": filters.depth
    })
    
    return result

@router.get("/sitemap/common-paths")
async def get_common_paths(min_count: int = 5):
    """
    获取常见URL路径(出现频率>=min_count)
    """
    common_paths = sitemap_processor.get_common_paths(min_count)
    return {"common_paths": common_paths}

@router.get("/sitemap/analyze")
async def analyze_sitemap(detailed: bool = False):
    """
    Analyze sitemap structure and characteristics.
    """
    result = sitemap_processor.analyze_url_structure(detailed)
    
    return result

@router.get("/sitemap/export")
async def export_merged_sitemap(format: str = "xml"):
    """
    Export merged sitemap as XML or CSV file.
    """
    data = sitemap_processor.generate_merged_sitemap(format)
    
    filename = f"merged_sitemap.{format}"
    media_type = "application/xml" if format.lower() == "xml" else "text/csv"
    
    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/sitemap/export-filtered")
async def export_filtered_urls(format: str = "csv"):
    """
    导出筛选后的URLs列表
    """
    if not sitemap_processor.filtered_urls:
        return StreamingResponse(
            io.BytesIO(b"No filtered URLs to export"),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=no_urls.txt"}
        )
    
    filename = f"filtered_urls.{format}"
    
    if format.lower() == "csv":
        # 创建CSV格式
        csv_data = "URL\n"
        for url in sorted(sitemap_processor.filtered_urls):
            csv_data += f"{url}\n"
        data = csv_data.encode('utf-8')
        media_type = "text/csv"
    elif format.lower() == "txt":
        # 创建纯文本格式，每行一个URL
        txt_data = "\n".join(sorted(sitemap_processor.filtered_urls))
        data = txt_data.encode('utf-8')
        media_type = "text/plain"
    elif format.lower() == "xml":
        # 创建XML格式的sitemap
        root = ET.Element("{http://www.sitemaps.org/schemas/sitemap/0.9}urlset")
        root.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
        
        for url in sorted(sitemap_processor.filtered_urls):
            url_elem = ET.SubElement(root, "url")
            loc = ET.SubElement(url_elem, "loc")
            loc.text = url
        
        xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding='utf-8').decode('utf-8')
        data = xml_str.encode('utf-8')
        media_type = "application/xml"
    else:
        data = b"Unsupported format"
        media_type = "text/plain"
    
    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# 以下是SEO分析相关API端点

@router.post("/seo/upload")
async def upload_seo_file(file: UploadFile = File(...)):
    """
    Upload and analyze HTML file for SEO issues.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # 检查文件类型是否为HTML
    if not file.filename.lower().endswith(('.html', '.htm')):
        raise HTTPException(status_code=400, detail="Only HTML files are supported")
    
    # 处理文件
    result = await seo_processor.process_file(file)
    
    return result

@router.get("/seo/categories")
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
        {"id": "accessibility", "name": "Accessibility", "description": "无障碍访问相关问题"}
    ]
    return {"categories": categories}

@router.get("/health")
async def health_check():
    """
    API health check endpoint.
    """
    return {"status": "healthy", "service": "CSV & Sitemap & SEO Processor API"}