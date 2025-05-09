import os
import pandas as pd
import tempfile
from typing import List, Dict, Any, Tuple, Optional
from fastapi import UploadFile

from app.utils.helpers import (
    read_file, 
    merge_dataframes, 
    count_keywords, 
    filter_dataframe, 
    calculate_brand_keyword_overlap,
    get_dataframe_stats
)

class CSVProcessor:
    def __init__(self):
        self.data = pd.DataFrame()
        self.original_files_data = []
        self.merged_data = pd.DataFrame()
        self.filtered_data = pd.DataFrame()
    
    async def process_files(self, files: List[UploadFile]) -> Dict[str, Any]:
        """Process multiple uploaded files."""
        dataframes = []
        file_stats = []
        
        for file in files:
            # Create a temporary file to store the uploaded content
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                # Write the uploaded file content to the temporary file
                content = await file.read()
                temp_file.write(content)
                temp_file.flush()
                
                # Read the file into a DataFrame
                df = read_file(temp_file.name)
                
                # Store original file statistics
                file_stats.append({
                    "filename": file.filename,
                    "stats": get_dataframe_stats(df)
                })
                
                dataframes.append(df)
                
                # Close and remove the temporary file
                temp_file.close()
                os.unlink(temp_file.name)
        
        # Store original data
        self.original_files_data = file_stats
        
        # Merge dataframes
        self.merged_data = merge_dataframes(dataframes)
        self.data = self.merged_data
        self.filtered_data = self.merged_data
        
        # Return processing results
        return {
            "file_stats": file_stats,
            "merged_stats": get_dataframe_stats(self.merged_data)
        }
    
    def apply_filters(
        self, 
        position_range: Optional[Tuple[float, float]] = None,
        search_volume_range: Optional[Tuple[float, float]] = None,
        keyword_difficulty_range: Optional[Tuple[float, float]] = None,
        cpc_range: Optional[Tuple[float, float]] = None,
        keyword_frequency_range: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """Apply filters to the merged data."""
        self.filtered_data = filter_dataframe(
            self.merged_data,
            position_range,
            search_volume_range,
            keyword_difficulty_range,
            cpc_range,
            keyword_frequency_range
        )
        
        return {
            "filtered_stats": get_dataframe_stats(self.filtered_data),
            "keyword_counts": count_keywords(self.filtered_data)
        }
    
    def filter_by_keyword(self, keyword: str) -> Dict[str, Any]:
        """Filter data by a specific keyword and return its position, URL, and traffic across different brands."""
        if self.filtered_data.empty:
            return {"results": []}
        
        # Filter for the specific keyword (case insensitive)
        keyword_data = self.filtered_data[self.filtered_data['Keyword'].str.lower() == keyword.lower()]
        
        if keyword_data.empty:
            return {"results": []}
        
        # Extract relevant columns - Position, URL, Traffic (which might be called Search Volume)
        # Ensure these columns exist
        required_columns = ['Brand', 'Position', 'URL']
        traffic_col = 'Search Volume' if 'Search Volume' in keyword_data.columns else 'Traffic'
        
        # Add Traffic column if it exists
        if traffic_col in keyword_data.columns:
            required_columns.append(traffic_col)
        
        # Filter columns that exist in the dataframe
        available_columns = [col for col in required_columns if col in keyword_data.columns]
        
        # If missing essential columns, return empty result
        if 'Brand' not in available_columns or len(available_columns) < 2:
            return {"results": []}
        
        # Group by Brand and fetch the relevant data
        results = []
        for brand, group in keyword_data.groupby('Brand'):
            if pd.isna(brand) or brand == '':
                continue
                
            brand_result = {"brand": brand, "data": []}
            
            for _, row in group.iterrows():
                item = {"keyword": keyword}
                
                # Add available columns
                if 'Position' in available_columns:
                    item["position"] = float(row['Position']) if pd.notna(row['Position']) else None
                
                if 'URL' in available_columns:
                    item["url"] = row['URL'] if pd.notna(row['URL']) else None
                
                if traffic_col in available_columns:
                    item["traffic"] = float(row[traffic_col]) if pd.notna(row[traffic_col]) else None
                
                brand_result["data"].append(item)
            
            results.append(brand_result)
        
        return {"results": results}
    
    def get_brand_overlap(self) -> Dict[str, Any]:
        """Get brand keyword overlap data."""
        overlap_data = calculate_brand_keyword_overlap(self.filtered_data)
        
        # Get brand stats
        brand_stats = {}
        if not self.filtered_data.empty and 'Brand' in self.filtered_data.columns:
            brand_counts = self.filtered_data['Brand'].value_counts()
            for brand, count in brand_counts.items():
                if pd.notna(brand) and brand != '':
                    brand_stats[brand] = {
                        "total_keywords": count,
                        "unique_keywords": self.filtered_data[self.filtered_data['Brand'] == brand]['Keyword'].nunique()
                    }
        
        return {
            "overlap_matrix": overlap_data,
            "brand_stats": brand_stats
        }
    
    def export_filtered_data(self) -> bytes:
        """Export filtered data as CSV."""
        if self.filtered_data.empty:
            return b"No data to export"
        
        # Convert DataFrame to CSV
        csv_bytes = self.filtered_data.to_csv(index=False).encode('utf-8')
        return csv_bytes
    
    def export_unique_filtered_data(self) -> bytes:
        """Export unique keywords from filtered data as CSV."""
        if self.filtered_data.empty:
            return b"No data to export"
        
        # Get unique keywords
        if 'Keyword' in self.filtered_data.columns:
            unique_keywords = self.filtered_data.drop_duplicates(subset=['Keyword'])
            
            # Convert DataFrame to CSV
            csv_bytes = unique_keywords.to_csv(index=False).encode('utf-8')
            return csv_bytes
        else:
            return b"No keyword column found in data"
    
    def get_filter_ranges(self) -> Dict[str, Any]:
        """Get min and max values for filter sliders."""
        if self.merged_data.empty:
            return {
                "position": [0, 100],
                "search_volume": [0, 1000000],
                "keyword_difficulty": [0, 100],
                "cpc": [0, 10],
                "keyword_frequency": [1, 100]  # 添加默认的关键词频率范围
            }
        
        stats = get_dataframe_stats(self.merged_data)
        
        # 计算关键词频率范围
        keyword_frequency_min = 1
        keyword_frequency_max = 100
        
        if 'Keyword' in self.merged_data.columns:
            keyword_counts = self.merged_data['Keyword'].value_counts()
            if not keyword_counts.empty:
                keyword_frequency_min = 1
                keyword_frequency_max = max(100, int(keyword_counts.max()))
        
        return {
            "position": [
                stats["min_values"].get("Position", 0),
                stats["max_values"].get("Position", 100)
            ],
            "search_volume": [
                stats["min_values"].get("Search Volume", 0),
                stats["max_values"].get("Search Volume", 1000000)
            ],
            "keyword_difficulty": [
                stats["min_values"].get("Keyword Difficulty", 0),
                stats["max_values"].get("Keyword Difficulty", 100)
            ],
            "cpc": [
                stats["min_values"].get("CPC", 0),
                stats["max_values"].get("CPC", 10)
            ],
            "keyword_frequency": [
                keyword_frequency_min,
                keyword_frequency_max
            ]
        }