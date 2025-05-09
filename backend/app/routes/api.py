from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Optional, Dict, Any
from fastapi.responses import StreamingResponse
import io
import json
from pydantic import BaseModel

from app.services.csv_processor import CSVProcessor
from app.services.sitemap_processor import SitemapProcessor

router = APIRouter()

# Singleton instances
csv_processor = CSVProcessor()
sitemap_processor = SitemapProcessor()

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
    depth: Optional[int] = None

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

# 以下是新增的Sitemap相关API端点

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

@router.post("/sitemap/filter")
async def filter_sitemap(filters: SitemapFilterRequest):
    """
    Filter sitemap URLs based on specified criteria.
    """
    result = sitemap_processor.filter_urls({
        "domain": filters.domain,
        "path": filters.path,
        "depth": filters.depth
    })
    
    return result

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

@router.get("/health")
async def health_check():
    """
    API health check endpoint.
    """
    return {"status": "healthy", "service": "CSV & Sitemap Processor API"}