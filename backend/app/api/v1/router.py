"""
API v1 主路由文件
整合所有业务模块的路由，提供统一的接口入口
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Optional, Dict, Any
from fastapi.responses import StreamingResponse
import io
import json
import xml.etree.ElementTree as ET
from pydantic import BaseModel

# 导入重构后的处理器
from app.core.keywords.keywords_processor import KeywordsProcessor
from app.core.sitemaps.sitemaps_processor import SitemapsProcessor
from app.core.seo.seo_processor import SEOProcessor
from app.core.backlinks.backlinks_processor import BacklinksProcessor
from app.core.backlinks.cross_analysis_processor import CrossAnalysisProcessor

# 创建主路由器
router = APIRouter(prefix="/v1", tags=["API v1"])

# 设置文件大小限制为 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Singleton instances - 保持与原代码一致的单例模式
keywords_processor = KeywordsProcessor()
sitemaps_processor = SitemapsProcessor()
seo_processor = SEOProcessor()
backlinks_processor = BacklinksProcessor()
cross_analysis_processor = CrossAnalysisProcessor()

# ================================
# Pydantic 模型定义
# ================================

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
    paths: Optional[List[str]] = None
    path_filter_type: Optional[str] = "contains"
    depth: Optional[int] = None

class FilteredVisualizationRequest(BaseModel):
    visualization_type: str = "tree"
    urls: List[str] = []

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

# ================================
# 通用辅助函数
# ================================

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

# ================================
# 关键词分析相关路由 (Keywords)
# ================================

@router.post("/keywords/upload", tags=["Keywords"])
async def upload_keywords_files(files: List[UploadFile] = File(...)):
    """
    上传和处理关键词 CSV/XLSX 文件
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    await check_file_size(files)
    result = await keywords_processor.process_files(files)
    return result

@router.post("/keywords/filter", tags=["Keywords"])
async def apply_keywords_filters(filter_ranges: FilterRanges):
    """
    对关键词数据应用筛选条件
    """
    position_range = tuple(filter_ranges.position_range) if filter_ranges.position_range else None
    search_volume_range = tuple(filter_ranges.search_volume_range) if filter_ranges.search_volume_range else None
    keyword_difficulty_range = tuple(filter_ranges.keyword_difficulty_range) if filter_ranges.keyword_difficulty_range else None
    cpc_range = tuple(filter_ranges.cpc_range) if filter_ranges.cpc_range else None
    keyword_frequency_range = tuple(filter_ranges.keyword_frequency_range) if filter_ranges.keyword_frequency_range else None
    
    result = keywords_processor.apply_filters(
        position_range,
        search_volume_range,
        keyword_difficulty_range,
        cpc_range,
        keyword_frequency_range
    )
    
    return result

@router.post("/keywords/search", tags=["Keywords"])
async def filter_keywords_by_keyword(request: KeywordFilterRequest):
    """
    根据特定关键词筛选数据并返回其在不同品牌中的位置、URL和流量
    """
    if not request.keyword:
        raise HTTPException(status_code=400, detail="No keyword provided")
    
    result = keywords_processor.filter_by_keyword(request.keyword)
    return result

@router.get("/keywords/brand-overlap", tags=["Keywords"])
async def get_keywords_brand_overlap():
    """
    获取品牌关键词重叠数据
    """
    result = keywords_processor.get_brand_overlap()
    return result

@router.get("/keywords/export", tags=["Keywords"])
async def export_keywords_data():
    """
    导出筛选后的关键词数据为CSV文件
    """
    csv_data = keywords_processor.export_filtered_data()
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=filtered_keywords.csv"}
    )

@router.get("/keywords/export-unique", tags=["Keywords"])
async def export_unique_keywords_data():
    """
    导出筛选后的唯一关键词为CSV文件
    """
    csv_data = keywords_processor.export_unique_filtered_data()
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=unique_keywords.csv"}
    )

@router.get("/keywords/filter-ranges", tags=["Keywords"])
async def get_keywords_filter_ranges():
    """
    获取关键词筛选器的最小值和最大值
    """
    return keywords_processor.get_filter_ranges()

# ================================
# 外链分析相关路由 (Backlinks)
# ================================

@router.post("/backlinks/upload", tags=["Backlinks"])
async def upload_backlinks_files(files: List[UploadFile] = File(...)):
    """
    上传和处理外链 CSV/XLSX 文件
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    await check_file_size(files)
    result = await backlinks_processor.process_files(files)
    return result

@router.post("/backlinks/filter", tags=["Backlinks"])
async def apply_backlinks_filters(filter_ranges: BacklinkFilterRanges):
    """
    对外链数据应用筛选条件
    """
    domain_ascore_range = tuple(filter_ranges.domain_ascore_range) if filter_ranges.domain_ascore_range else None
    backlinks_range = tuple(filter_ranges.backlinks_range) if filter_ranges.backlinks_range else None
    domain_frequency_range = tuple(filter_ranges.domain_frequency_range) if filter_ranges.domain_frequency_range else None
    
    result = backlinks_processor.apply_filters(
        domain_ascore_range,
        backlinks_range,
        domain_frequency_range
    )
    
    return result

@router.post("/backlinks/search", tags=["Backlinks"])
async def filter_backlinks_by_domain(request: DomainFilterRequest):
    """
    根据特定域名筛选数据并返回其在不同品牌中的信息
    """
    if not request.domain:
        raise HTTPException(status_code=400, detail="No domain provided")
    
    result = backlinks_processor.filter_by_domain(request.domain)
    return result

@router.get("/backlinks/brand-overlap", tags=["Backlinks"])
async def get_backlinks_brand_overlap():
    """
    获取品牌域名重叠数据
    """
    result = backlinks_processor.get_brand_overlap()
    return result

@router.get("/backlinks/export", tags=["Backlinks"])
async def export_backlinks_data():
    """
    导出筛选后的外链数据为CSV文件
    """
    csv_data = backlinks_processor.export_filtered_data()
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=filtered_backlinks.csv"}
    )

@router.get("/backlinks/export-unique", tags=["Backlinks"])
async def export_unique_backlinks_data():
    """
    导出筛选后的唯一域名为CSV文件
    """
    csv_data = backlinks_processor.export_unique_filtered_data()
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=unique_domains.csv"}
    )

@router.get("/backlinks/filter-ranges", tags=["Backlinks"])
async def get_backlinks_filter_ranges():
    """
    获取外链筛选器的最小值和最大值
    """
    return backlinks_processor.get_filter_ranges()

# ================================
# 交叉分析相关路由 (Cross Analysis)
# ================================

@router.post("/backlinks/cross-analysis/upload-first", tags=["Cross Analysis"])
async def upload_cross_analysis_first_round(files: List[UploadFile] = File(...)):
    """
    上传交叉分析第一轮文件（包含Domain和Domain ascore字段）
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    await check_file_size(files)
    result = await cross_analysis_processor.process_first_round(files)
    return result

@router.post("/backlinks/cross-analysis/upload-second", tags=["Cross Analysis"])
async def upload_cross_analysis_second_round(files: List[UploadFile] = File(...)):
    """
    上传交叉分析第二轮文件（包含Source url和Target url字段）并执行交叉分析
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    await check_file_size(files)
    result = await cross_analysis_processor.process_second_round(files)
    return result

@router.get("/backlinks/cross-analysis/export", tags=["Cross Analysis"])
async def export_cross_analysis_results(
    display_mode: str = "flat",
    search_term: str = "",
    sort_column: str = "page_ascore",
    sort_direction: str = "desc",
    cell_display_type: str = "target_url"
):
    """
    导出交叉分析结果为CSV文件，支持简单的URL参数筛选
    """
    if display_mode == "flat" and not search_term:
        csv_data = cross_analysis_processor.export_results()
    else:
        csv_data = cross_analysis_processor.export_filtered_results(
            display_mode=display_mode,
            search_term=search_term,
            sort_column=sort_column,
            sort_direction=sort_direction,
            cell_display_type=cell_display_type
        )
    
    filename = "cross_analysis_results.csv"
    if display_mode == "compare":
        filename = "cross_analysis_comparison.csv"
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/backlinks/cross-analysis/export-filtered", tags=["Cross Analysis"])
async def export_filtered_cross_analysis_results(request: CrossAnalysisExportRequest):
    """
    导出交叉分析结果为CSV文件，支持复杂的筛选条件和对比视图数据
    """
    csv_data = cross_analysis_processor.export_filtered_results(
        display_mode=request.display_mode,
        search_term=request.search_term,
        sort_column=request.sort_column,
        sort_direction=request.sort_direction,
        comparison_data=request.comparison_data,
        cell_display_type=request.cell_display_type
    )
    
    filename = "cross_analysis_results.csv"
    if request.display_mode == "compare":
        filename = "cross_analysis_comparison.csv"
    
    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ================================
# SEO分析相关路由 (SEO)
# ================================

@router.post("/seo/upload", tags=["SEO"])
async def upload_seo_file(
    file: UploadFile = File(...), 
    content_extractor: Optional[str] = Form("auto"),
    enable_advanced_analysis: bool = Form(True)
):
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"文件 {file.filename} 超过最大大小限制 {MAX_FILE_SIZE/(1024*1024)}MB"
        )
    await file.seek(0)
    
    if not file.filename.lower().endswith(('.html', '.htm')):
        raise HTTPException(status_code=400, detail="Only HTML files are supported")
    
    result = await seo_processor.process_file(file, content_extractor, enable_advanced_analysis)
    return result

@router.get("/seo/categories", tags=["SEO"])
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

# ================================
# 站点地图相关路由 (Sitemaps)
# ================================

@router.post("/sitemaps/upload", tags=["Sitemaps"])
async def upload_sitemaps_files(files: List[UploadFile] = File(...)):
    """
    上传和处理站点地图 XML 文件
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    await check_file_size(files)
    result = await sitemaps_processor.process_files(files)
    return result

@router.get("/sitemaps/visualization", tags=["Sitemaps"])
async def get_sitemaps_visualization(visualization_type: str = "tree"):
    """
    获取指定格式的站点地图可视化数据
    """
    result = sitemaps_processor.get_visualization_data(visualization_type)
    return result

@router.post("/sitemaps/filtered-visualization", tags=["Sitemaps"])
async def get_filtered_sitemaps_visualization(request: FilteredVisualizationRequest):
    """
    获取筛选后URL集合的可视化数据
    """
    result = sitemaps_processor.get_filtered_visualization_data(
        request.visualization_type,
        request.urls
    )
    return result

@router.post("/sitemaps/filter", tags=["Sitemaps"])
async def filter_sitemaps(filters: SitemapFilterRequest):
    """
    基于指定条件筛选站点地图URL
    """
    result = sitemaps_processor.filter_urls({
        "domain": filters.domain,
        "path": filters.path,
        "paths": filters.paths,
        "path_filter_type": filters.path_filter_type,
        "depth": filters.depth
    })
    return result

@router.get("/sitemaps/common-paths", tags=["Sitemaps"])
async def get_sitemaps_common_paths(min_count: int = 5):
    """
    获取常见URL路径（出现频率>=min_count）
    """
    common_paths = sitemaps_processor.get_common_paths(min_count)
    return {"common_paths": common_paths}

@router.get("/sitemaps/analyze", tags=["Sitemaps"])
async def analyze_sitemaps(detailed: bool = False):
    """
    分析站点地图结构和特征
    """
    result = sitemaps_processor.analyze_url_structure(detailed)
    return result

@router.get("/sitemaps/export", tags=["Sitemaps"])
async def export_merged_sitemaps(format: str = "xml"):
    """
    导出合并的站点地图为XML或CSV文件
    """
    data = sitemaps_processor.generate_merged_sitemap(format)
    
    filename = f"merged_sitemap.{format}"
    media_type = "application/xml" if format.lower() == "xml" else "text/csv"
    
    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/sitemaps/export-filtered", tags=["Sitemaps"])
async def export_filtered_sitemaps_urls(format: str = "csv"):
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
        csv_data = "URL\n"
        for url in sorted(sitemaps_processor.filtered_urls):
            csv_data += f"{url}\n"
        data = csv_data.encode('utf-8')
        media_type = "text/csv"
    elif format.lower() == "txt":
        txt_data = "\n".join(sorted(sitemaps_processor.filtered_urls))
        data = txt_data.encode('utf-8')
        media_type = "text/plain"
    elif format.lower() == "xml":
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

# ================================
# 健康检查和通用路由
# ================================

@router.get("/health", tags=["System"])
async def health_check():
    """
    API健康检查端点
    """
    return {"status": "healthy", "service": "CSV & Sitemap & SEO Processor API v1"}

@router.get("/", tags=["System"])
async def api_info():
    """
    API v1 信息端点
    """
    return {
        "api_version": "v1",
        "service": "CSV & Sitemap & SEO Processor API",
        "status": "running",
        "endpoints": {
            "keywords": "/v1/keywords/",
            "backlinks": "/v1/backlinks/", 
            "seo": "/v1/seo/",
            "sitemaps": "/v1/sitemaps/",
            "health": "/v1/health"
        }
    }