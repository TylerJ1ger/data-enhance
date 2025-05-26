from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Optional, Dict, Any
from fastapi.responses import StreamingResponse
import io
import json
import xml.etree.ElementTree as ET
from pydantic import BaseModel

# 更新导入路径 - 使用新的重构后的路径
from app.core.keywords.keywords_processor import KeywordsProcessor
from app.core.sitemaps.sitemaps_processor import SitemapsProcessor
from app.core.seo.seo_processor import SEOProcessor
from app.core.backlinks.backlinks_processor import BacklinksProcessor
from app.core.backlinks.cross_analysis_processor import CrossAnalysisProcessor

router = APIRouter()

# 设置文件大小限制为 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Singleton instances - 更新实例化的类名
keywords_processor = KeywordsProcessor()
sitemaps_processor = SitemapsProcessor()
seo_processor = SEOProcessor()
backlinks_processor = BacklinksProcessor()
cross_analysis_processor = CrossAnalysisProcessor()

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

# 新增外链分析相关模型
class BacklinkFilterRanges(BaseModel):
    domain_ascore_range: Optional[List[float]] = None
    backlinks_range: Optional[List[float]] = None
    domain_frequency_range: Optional[List[float]] = None

class DomainFilterRequest(BaseModel):
    domain: str

# 新增交叉分析导出请求模型
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
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Upload and process CSV/XLSX files.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 检查文件大小
    await check_file_size(files)
    
    # Process files - 使用重命名后的处理器
    result = await keywords_processor.process_files(files)
    
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
    result = keywords_processor.apply_filters(
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
    
    result = keywords_processor.filter_by_keyword(request.keyword)
    
    return result

@router.get("/brand-overlap")
async def get_brand_overlap():
    """
    Get brand keyword overlap data.
    """
    result = keywords_processor.get_brand_overlap()
    
    return result

@router.get("/export")
async def export_data():
    """
    Export filtered data as a CSV file.
    """
    csv_data = keywords_processor.export_filtered_data()
    
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
    csv_data = keywords_processor.export_unique_filtered_data()
    
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
    return keywords_processor.get_filter_ranges()

# 以下是Sitemap相关API端点

@router.post("/sitemap/upload")
async def upload_sitemap_files(files: List[UploadFile] = File(...)):
    """
    Upload and process Sitemap XML files.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 检查文件大小
    await check_file_size(files)
    
    # Process sitemap files
    result = await sitemaps_processor.process_files(files)
    
    return result

@router.get("/sitemap/visualization")
async def get_sitemap_visualization(visualization_type: str = "tree"):
    """
    Get sitemap visualization data in the specified format.
    """
    result = sitemaps_processor.get_visualization_data(visualization_type)
    
    return result

@router.post("/sitemap/filtered-visualization")
async def get_filtered_visualization(request: FilteredVisualizationRequest):
    """
    Get visualization data for a filtered set of URLs.
    """
    result = sitemaps_processor.get_filtered_visualization_data(
        request.visualization_type,
        request.urls
    )
    
    return result

@router.post("/sitemap/filter")
async def filter_sitemap(filters: SitemapFilterRequest):
    """
    Filter sitemap URLs based on specified criteria.
    """
    result = sitemaps_processor.filter_urls({
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
    common_paths = sitemaps_processor.get_common_paths(min_count)
    return {"common_paths": common_paths}

@router.get("/sitemap/analyze")
async def analyze_sitemap(detailed: bool = False):
    """
    Analyze sitemap structure and characteristics.
    """
    result = sitemaps_processor.analyze_url_structure(detailed)
    
    return result

@router.get("/sitemap/export")
async def export_merged_sitemap(format: str = "xml"):
    """
    Export merged sitemap as XML or CSV file.
    """
    data = sitemaps_processor.generate_merged_sitemap(format)
    
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
        data = b"Unsupported format"
        media_type = "text/plain"
    
    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# 以下是SEO分析相关API端点

@router.post("/seo/upload")
async def upload_seo_file(
    file: UploadFile = File(...), 
    content_extractor: Optional[str] = Form("auto"),
    enable_advanced_analysis: bool = Form(True)
):
    """
    Upload and analyze HTML file for SEO issues.
    
    Args:
        file: The HTML file to analyze
        content_extractor: The content extraction engine to use (auto, trafilatura, newspaper, readability, goose3, custom)
        enable_advanced_analysis: Whether to enable advanced content analysis using language-tool-python and textstat
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # 检查文件大小
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"文件 {file.filename} 超过最大大小限制 {MAX_FILE_SIZE/(1024*1024)}MB"
        )
    # 重置文件指针
    await file.seek(0)
    
    # 检查文件类型是否为HTML
    if not file.filename.lower().endswith(('.html', '.htm')):
        raise HTTPException(status_code=400, detail="Only HTML files are supported")
    
    # 处理文件，传入内容提取引擎和高级分析选项
    result = await seo_processor.process_file(file, content_extractor, enable_advanced_analysis)
    
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
        {"id": "accessibility", "name": "Accessibility", "description": "无障碍访问相关问题"},
        {"id": "robots_directives", "name": "Robots Directives", "description": "机器人指令相关问题，包括meta robots标签和X-Robots-Tag设置"}
    ]
    return {"categories": categories}

# 以下是Backlink相关API端点

@router.post("/backlink/upload")
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

@router.post("/backlink/filter")
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

@router.post("/backlink/domain-filter")
async def filter_by_domain(request: DomainFilterRequest):
    """
    Filter data by a specific domain and return its information across different brands.
    """
    if not request.domain:
        raise HTTPException(status_code=400, detail="No domain provided")
    
    result = backlinks_processor.filter_by_domain(request.domain)
    
    return result

@router.get("/backlink/brand-overlap")
async def get_backlink_brand_overlap():
    """
    Get brand domain overlap data.
    """
    result = backlinks_processor.get_brand_overlap()
    
    return result

@router.get("/backlink/export")
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

@router.get("/backlink/export-unique")
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

@router.get("/backlink/filter-ranges")
async def get_backlink_filter_ranges():
    """
    Get minimum and maximum values for filter sliders.
    """
    return backlinks_processor.get_filter_ranges()

# 新增交叉分析相关端点 - 使用新的处理器

@router.post("/backlink/cross-analysis/upload-first")
async def upload_cross_analysis_first_round(files: List[UploadFile] = File(...)):
    """
    上传交叉分析第一轮文件（包含Domain和Domain ascore字段）
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 检查文件大小
    await check_file_size(files)
    
    # 使用新的处理器
    result = await cross_analysis_processor.process_first_round(files)
    
    return result

@router.post("/backlink/cross-analysis/upload-second")
async def upload_cross_analysis_second_round(files: List[UploadFile] = File(...)):
    """
    上传交叉分析第二轮文件（包含Source url和Target url字段）并执行交叉分析
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 检查文件大小
    await check_file_size(files)
    
    # 使用新的处理器
    result = await cross_analysis_processor.process_second_round(files)
    
    return result

# 保留原有GET路由,但增加筛选参数支持
@router.get("/backlink/cross-analysis/export")
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

# 新增POST路由,用于复杂筛选(如对比视图)
@router.post("/backlink/cross-analysis/export-filtered")
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
    API health check endpoint.
    """
    return {"status": "healthy", "service": "CSV & Sitemap & SEO Processor API"}