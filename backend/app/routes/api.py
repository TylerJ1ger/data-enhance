from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Optional, Dict, Any
from fastapi.responses import StreamingResponse
import io
import json
from pydantic import BaseModel

from app.services.csv_processor import CSVProcessor

router = APIRouter()

# Singleton instance of CSVProcessor
csv_processor = CSVProcessor()

class FilterRanges(BaseModel):
    position_range: Optional[List[float]] = None
    search_volume_range: Optional[List[float]] = None
    keyword_difficulty_range: Optional[List[float]] = None
    cpc_range: Optional[List[float]] = None
    keyword_frequency_range: Optional[List[float]] = None  # 新增参数

class KeywordFilterRequest(BaseModel):
    keyword: str

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
    keyword_frequency_range = tuple(filter_ranges.keyword_frequency_range) if filter_ranges.keyword_frequency_range else None  # 新增参数
    
    # Apply filters
    result = csv_processor.apply_filters(
        position_range,
        search_volume_range,
        keyword_difficulty_range,
        cpc_range,
        keyword_frequency_range  # 新增参数
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

@router.get("/health")
async def health_check():
    """
    API health check endpoint.
    """
    return {"status": "healthy", "service": "CSV Processor API"}