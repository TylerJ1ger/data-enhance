"""
API v1 主路由文件 - 完整增强版本
整合所有业务模块的路由，提供统一的接口入口
新增动态CSV模板支持和SEO批量处理功能，以及关键词库功能
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Path, Request
from typing import List, Optional, Dict, Any
from fastapi.responses import StreamingResponse, Response
import io
import json
import xml.etree.ElementTree as ET
import asyncio
from pydantic import BaseModel, validator
from datetime import datetime
import logging

# 导入重构后的处理器
from app.core.keywords.keywords_processor import KeywordsProcessor
from app.core.sitemaps.sitemaps_processor import SitemapsProcessor
from app.core.seo.seo_processor import SEOProcessor
from app.core.backlinks.backlinks_processor import BacklinksProcessor
from app.core.backlinks.cross_analysis_processor import CrossAnalysisProcessor
from app.core.orders.orders_processor import OrdersProcessor
from app.core.schema.schema_processor import SchemaProcessor
from app.core.keystore.keystore_processor_redis import KeystoreProcessorRedis  # Redis关键词库处理器

# 创建主路由器
router = APIRouter(tags=["API v1"])

# 设置日志记录器
logger = logging.getLogger(__name__)

# 设置文件大小限制为 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Singleton instances - 保持与原代码一致的单例模式
keywords_processor = KeywordsProcessor()
sitemaps_processor = SitemapsProcessor()
seo_processor = SEOProcessor()
backlinks_processor = BacklinksProcessor()
cross_analysis_processor = CrossAnalysisProcessor()
orders_processor = OrdersProcessor()
schema_processor = SchemaProcessor()
keystore_processor = KeystoreProcessorRedis()  # Redis关键词库处理器实例

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

class VirtualDataGenerateRequest(BaseModel):
    """虚拟数据生成请求模型 - 支持自定义日期范围"""
    count: int = 100
    date_range: Optional[Dict[str, str]] = None  # {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
    
    @validator('count')
    def validate_count(cls, v):
        """验证订单数量"""
        if v <= 0:
            raise ValueError('数据条数必须大于0')
        if v > 10000:
            raise ValueError('数据条数不能超过10000')
        return v
    
    @validator('date_range')
    def validate_date_range(cls, v):
        """验证日期范围"""
        if v is None:
            return v
        
        if not isinstance(v, dict):
            raise ValueError('日期范围必须是字典格式')
        
        if 'start_date' not in v or 'end_date' not in v:
            raise ValueError('日期范围必须包含 start_date 和 end_date')
        
        try:
            start_date = datetime.strptime(v['start_date'], '%Y-%m-%d')
            end_date = datetime.strptime(v['end_date'], '%Y-%m-%d')
        except ValueError:
            raise ValueError('日期格式必须为 YYYY-MM-DD')
        
        if start_date >= end_date:
            raise ValueError('结束日期必须晚于开始日期')
        
        # 限制日期范围最大为365天
        if (end_date - start_date).days > 365:
            raise ValueError('日期范围不能超过365天')
        
        # 检查日期是否在合理范围内
        min_date = datetime(2020, 1, 1)
        max_date = datetime(2030, 12, 31)
        
        if start_date < min_date or end_date > max_date:
            raise ValueError(f'日期必须在 {min_date.strftime("%Y-%m-%d")} 到 {max_date.strftime("%Y-%m-%d")} 之间')
        
        return v

class OrderFilterRequest(BaseModel):
    """订单筛选请求模型"""
    date_range: Optional[List[str]] = None  # ["start_date", "end_date"]
    order_types: Optional[List[str]] = None
    license_ids: Optional[List[int]] = None
    currencies: Optional[List[str]] = None
    payment_platforms: Optional[List[str]] = None
    order_statuses: Optional[List[str]] = None
    sales_amount_range: Optional[List[float]] = None  # [min_amount, max_amount]
    has_coupon: Optional[bool] = None
    ab_test_filter: Optional[str] = None  # "with", "without", None

# 结构化数据生成器相关模型
class SchemaGenerateRequest(BaseModel):
    """结构化数据生成请求模型"""
    schema_type: str
    data: Dict[str, Any]
    
    @validator('schema_type')
    def validate_schema_type(cls, v):
        """验证结构化数据类型"""
        supported_types = [
            'Article', 'Breadcrumb', 'Event', 'FAQPage', 'HowTo', 
            'Organization', 'Person', 'Product', 'VideoObject', 'WebSite'
        ]
        if v not in supported_types:
            raise ValueError(f'不支持的结构化数据类型。支持的类型: {", ".join(supported_types)}')
        return v

# 批量处理相关的Pydantic模型
class SchemaBatchGenerateRequest(BaseModel):
    """批量生成结构化数据请求模型"""
    url_filter: Optional[str] = None  # URL过滤器，可选
    
    @validator('url_filter')
    def validate_url_filter(cls, v):
        """验证URL过滤器"""
        if v is not None and len(v.strip()) == 0:
            return None
        return v

class SchemaBatchExportRequest(BaseModel):
    """批量导出结构化数据请求模型"""
    export_type: str = "combined"  # "combined" | "separated"
    
    @validator('export_type')
    def validate_export_type(cls, v):
        """验证导出类型"""
        if v not in ['combined', 'separated']:
            raise ValueError('导出类型必须是 "combined" 或 "separated"')
        return v

# SEO批量处理相关模型（新增）
class SEOExportRequest(BaseModel):
    """SEO导出请求模型"""
    export_type: str = "summary"  # "summary" 或 "detailed"
    
    @validator('export_type')
    def validate_export_type(cls, v):
        """验证导出类型"""
        if v not in ['summary', 'detailed']:
            raise ValueError('导出类型必须是 "summary" 或 "detailed"')
        return v

# 关键词库相关模型
class KeywordMoveRequest(BaseModel):
    """关键词移动请求模型"""
    keyword: str
    source_group: str
    target_group: str
    
    @validator('keyword', 'source_group', 'target_group')
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('字段不能为空')
        return v.strip()

class KeywordRemoveRequest(BaseModel):
    """关键词删除请求模型"""
    keyword: str
    group: str
    
    @validator('keyword', 'group')
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('字段不能为空')
        return v.strip()

class GroupRenameRequest(BaseModel):
    """组重命名请求模型"""
    old_name: str
    new_name: str
    
    @validator('old_name', 'new_name')
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('字段不能为空')
        return v.strip()

class ClusterCreateRequest(BaseModel):
    """族创建请求模型"""
    cluster_name: str
    group_names: List[str]
    
    @validator('cluster_name')
    def validate_cluster_name(cls, v):
        if not v or not v.strip():
            raise ValueError('族名不能为空')
        return v.strip()
    
    @validator('group_names')
    def validate_group_names(cls, v):
        if not v:
            raise ValueError('至少需要一个组')
        return [name.strip() for name in v if name.strip()]

class ClusterUpdateRequest(BaseModel):
    """族更新请求模型"""
    cluster_name: str
    group_names: List[str]
    
    @validator('cluster_name')
    def validate_cluster_name(cls, v):
        if not v or not v.strip():
            raise ValueError('族名不能为空')
        return v.strip()
    
    @validator('group_names')
    def validate_group_names(cls, v):
        if not v:
            raise ValueError('至少需要一个组')
        return [name.strip() for name in v if name.strip()]

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

def calculate_seo_timeout_for_files(file_count: int, base_timeout: int = 300) -> int:
    """根据文件数量动态计算SEO分析超时时间"""
    # 基础超时时间 + 每个文件额外时间
    # 单文件SEO分析通常需要10-30秒，我们预留60秒每个文件
    additional_time_per_file = 60
    total_timeout = base_timeout + (file_count - 1) * additional_time_per_file
    
    # 设置最大超时时间防止过长
    max_timeout = 1800  # 30分钟
    return min(total_timeout, max_timeout)

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

@router.get("/keywords/list", tags=["Keywords"])
async def get_keywords_list():
    """
    获取所有关键词列表数据
    """
    try:
        result = keywords_processor.get_keywords_list()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取关键词列表时发生错误: {str(e)}"
        )

# ================================
# 关键词库相关路由 (Keystore)
# ================================

@router.post("/keystore/upload", tags=["Keystore"])
async def upload_keystore_files(
    files: List[UploadFile] = File(...),
    mode: str = Form("replace"),  # "replace" 或 "append" 
    preserve_duplicates: bool = Form(False)  # 是否保留重复项
):
    """
    上传关键词库CSV文件
    
    支持的CSV格式:
    - Keywords: 关键词 (必需)
    - group_name_map: 组名 (必需)
    - QPM: 搜索量 (必需)
    - DIFF: 难度 (必需)
    - 其他列如Group, Force Group, Task Name等为可选
    
    参数:
    - mode: "replace" (默认，覆盖现有数据) 或 "append" (增量添加)
    - preserve_duplicates: 是否保留重复项 (默认False，会自动去重)
    """
    if not files:
        raise HTTPException(status_code=400, detail="未提供文件")
    
    if mode not in ["replace", "append"]:
        raise HTTPException(status_code=400, detail="mode参数必须是'replace'或'append'")
    
    await check_file_size(files)
    result = await keystore_processor.process_files(files, mode=mode, preserve_duplicates=preserve_duplicates)
    return result

@router.post("/keystore/preview-upload", tags=["Keystore"])
async def preview_keystore_upload(files: List[UploadFile] = File(...)):
    """
    预览上传文件的差异，显示新增的族、组、关键词
    用于增量上传前的确认
    """
    if not files:
        raise HTTPException(status_code=400, detail="未提供文件")
    
    await check_file_size(files)
    result = await keystore_processor.preview_upload_diff(files)
    return result

@router.get("/keystore/summary", tags=["Keystore"])
async def get_keystore_summary():
    """获取关键词库摘要信息"""
    summary = keystore_processor.get_summary()
    groups_overview = keystore_processor.get_groups_overview()
    
    return {
        "success": True,
        "summary": summary,
        "groups_overview": groups_overview
    }

@router.get("/keystore/groups", tags=["Keystore"])
async def get_keystore_groups_data():
    """获取所有关键词组数据（优化版本，减少数据传输）"""
    groups_data = keystore_processor.get_groups_data()
    
    # Apply additional float validation to ensure JSON compliance
    def validate_floats(obj):
        import math
        if isinstance(obj, dict):
            return {k: validate_floats(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [validate_floats(item) for item in obj]
        elif isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return 0.0
            return obj
        else:
            return obj
    
    validated_groups_data = validate_floats(groups_data)
    
    return {
        "success": True,
        "groups": validated_groups_data,
        "total_groups": len(validated_groups_data)
    }

@router.get("/keystore/groups/{group_name}", tags=["Keystore"])
async def get_keystore_group_detail(group_name: str):
    """获取单个关键词组的详细数据"""
    group_detail = keystore_processor.get_group_detail(group_name)
    
    if not group_detail:
        raise HTTPException(status_code=404, detail=f"组 '{group_name}' 不存在")
    
    # Apply float validation
    def validate_floats(obj):
        import math
        if isinstance(obj, dict):
            return {k: validate_floats(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [validate_floats(item) for item in obj]
        elif isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return 0.0
            return obj
        else:
            return obj
    
    validated_group_detail = validate_floats(group_detail)
    
    return {
        "success": True,
        "group": validated_group_detail
    }

@router.get("/keystore/clusters", tags=["Keystore"])
async def get_keystore_clusters_data():
    """获取所有关键词族数据"""
    clusters_data = keystore_processor.get_clusters_data()
    return {
        "success": True,
        "clusters": clusters_data
    }

@router.get("/keystore/files", tags=["Keystore"])
async def get_keystore_files_data():
    """获取所有导入文件的统计信息"""
    files_data = keystore_processor.get_files_data()
    return {
        "success": True,
        "files": files_data,
        "total_files": len(files_data)
    }

@router.get("/keystore/visualization", tags=["Keystore"])
async def get_keystore_groups_visualization():
    """获取关键词组可视化数据"""
    visualization_data = keystore_processor.get_groups_visualization_data()
    return {
        "success": True,
        "visualization": visualization_data
    }

@router.get("/keystore/duplicates", tags=["Keystore"])
async def get_keystore_duplicate_keywords():
    """获取重复关键词分析"""
    duplicates_analysis = keystore_processor.get_duplicate_keywords_analysis()
    return {
        "success": True,
        "duplicates": duplicates_analysis
    }

@router.post("/keystore/keywords/move", tags=["Keystore"])
async def move_keystore_keyword(request: KeywordMoveRequest):
    """将关键词从一个组移动到另一个组"""
    # 在异步上下文中执行，避免阻塞其他请求
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        keystore_processor.move_keyword_to_group,
        request.keyword,
        request.source_group,
        request.target_group
    )
    return result

@router.post("/keystore/keywords/remove", tags=["Keystore"])
async def remove_keystore_keyword(request: KeywordRemoveRequest):
    """从组中删除关键词"""
    # 在异步上下文中执行，避免阻塞其他请求
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        keystore_processor.remove_keyword_from_group,
        request.keyword,
        request.group
    )
    return result

@router.post("/keystore/groups/rename", tags=["Keystore"])
async def rename_keystore_group(request: GroupRenameRequest):
    """重命名关键词组"""
    result = keystore_processor.rename_group(
        request.old_name,
        request.new_name
    )
    return result

@router.post("/keystore/clusters/create", tags=["Keystore"])
async def create_keystore_cluster(request: ClusterCreateRequest):
    """创建关键词族"""
    result = keystore_processor.create_cluster(
        request.cluster_name,
        request.group_names
    )
    return result

@router.put("/keystore/clusters/update", tags=["Keystore"])
async def update_keystore_cluster(request: ClusterUpdateRequest):
    """更新关键词族"""
    result = keystore_processor.update_cluster(
        request.cluster_name,
        request.group_names
    )
    return result

@router.delete("/keystore/clusters/{cluster_name}", tags=["Keystore"])
async def delete_keystore_cluster(cluster_name: str):
    """删除关键词族"""
    result = keystore_processor.delete_cluster(cluster_name)
    return result

@router.get("/keystore/clusters/suggestions", tags=["Keystore"])
async def get_cluster_suggestions():
    """
    基于组间重复关键词分析生成族建议
    
    分析逻辑：
    1. 找出所有组之间共享的关键词
    2. 基于共享关键词的传递性建议族
    3. 如果A组和B组有共同关键词，B组和C组有共同关键词，则建议将A、B、C放入同一族
    
    返回族建议列表，每个建议包含：
    - 建议的族名称（可修改）
    - 应该组合的组列表
    - 共享关键词数量和示例
    - 置信度评分
    """
    try:
        result = keystore_processor.analyze_group_overlaps_for_clusters()
        return result
    except Exception as e:
        logger.error(f"获取族建议时发生错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取族建议失败: {str(e)}"
        )

@router.get("/keystore/export", tags=["Keystore"])
async def export_keystore_data():
    """导出关键词库数据为CSV文件，包含族信息和清理后的数据"""
    try:
        csv_data = keystore_processor.export_keystore_data()
        
        if csv_data == b"No data to export":
            raise HTTPException(status_code=404, detail="没有可导出的关键词库数据")
        
        # 生成带时间戳的文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"keystore_data_with_clusters_{timestamp}.csv"
        
        logger.info(f"成功导出关键词库数据，文件名: {filename}")
        
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"导出关键词库数据时发生错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"导出关键词库数据失败: {str(e)}"
        )

@router.get("/keystore/export-groups", tags=["Keystore"])
async def export_keystore_groups():
    """导出关键词组汇总数据为CSV文件，包含组级别统计信息"""
    try:
        csv_data = keystore_processor.export_groups_data()
        
        if csv_data == b"No groups data to export":
            raise HTTPException(status_code=404, detail="没有可导出的关键词组数据")
        
        # 生成带时间戳的文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"keystore_groups_summary_{timestamp}.csv"
        
        logger.info(f"成功导出关键词组数据，文件名: {filename}")
        
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"导出关键词组数据时发生错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"导出关键词组数据失败: {str(e)}"
        )

@router.post("/keystore/reset", tags=["Keystore"])
async def reset_keystore_data():
    """重置关键词库数据"""
    try:
        result = keystore_processor.reset_data()
        logger.info("关键词库数据已重置")
        return result
    except Exception as e:
        logger.error(f"重置关键词库数据时发生错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"重置关键词库数据失败: {str(e)}"
        )

@router.get("/keystore/health", tags=["Keystore"])
async def get_keystore_health():
    """检查关键词库和Redis连接健康状态"""
    try:
        health_result = keystore_processor.health_check()
        return {
            "success": True,
            **health_result
        }
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return {
            "success": False,
            "processor_status": "unhealthy",
            "error": str(e)
        }

@router.post("/keystore/load-from-indexdb", tags=["Keystore"])
async def load_keystore_from_indexdb():
    """从前端IndexDB加载关键词数据到后端Redis"""
    try:
        # 这个接口主要用于前端触发从IndexDB同步数据到Redis
        # 实际的数据同步逻辑会在前端处理
        return {
            "success": True,
            "message": "请从前端IndexDB加载数据",
            "note": "此接口用于触发前端数据同步"
        }
    except Exception as e:
        logger.error(f"从IndexDB加载数据时出错: {str(e)}")
        return {
            "success": False,
            "message": f"从IndexDB加载数据失败: {str(e)}"
        }

@router.post("/keystore/load-from-redis", tags=["Keystore"])
async def load_keystore_from_redis():
    """从Redis重新加载关键词数据（刷新缓存）"""
    try:
        # 检查Redis中是否有数据
        summary = keystore_processor.get_summary()
        groups_overview = keystore_processor.get_groups_overview()
        
        if summary.get("total_keywords", 0) > 0:
            logger.info(f"从Redis加载了 {summary['total_keywords']} 个关键词")
            return {
                "success": True,
                "message": f"成功从Redis加载 {summary['total_keywords']} 个关键词",
                "summary": summary,
                "groups_overview": groups_overview
            }
        else:
            return {
                "success": False,
                "message": "Redis中没有找到关键词数据，请先上传文件或从IndexDB同步数据"
            }
    except Exception as e:
        logger.error(f"从Redis加载数据时出错: {str(e)}")
        return {
            "success": False,
            "message": f"从Redis加载数据失败: {str(e)}"
        }

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

@router.get("/backlinks/list", tags=["Backlinks"])
async def get_backlinks_list():
    """
    获取所有外链列表数据
    """
    try:
        result = backlinks_processor.get_backlinks_list()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取外链列表时发生错误: {str(e)}"
        )

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
# SEO批量分析相关路由 (SEO Batch)
# ================================

@router.post("/seo/batch-upload", tags=["SEO"])
async def batch_upload_seo_files(
    files: List[UploadFile] = File(...),
    content_extractor: Optional[str] = Form("auto"),
    enable_advanced_analysis: bool = Form(True)
):
    """
    批量上传HTML文件进行SEO分析
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 限制文件数量
    if len(files) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 files allowed per batch")
    
    await check_file_size(files)
    
    # 检查所有文件是否为HTML
    for file in files:
        if not file.filename.lower().endswith(('.html', '.htm')):
            raise HTTPException(
                status_code=400, 
                detail=f"File {file.filename} is not an HTML file. Only HTML files are supported"
            )
    
    try:
        # 批量处理文件
        result = await seo_processor.process_files(files, content_extractor, enable_advanced_analysis)
        
        return {
            "success": True,
            "message": f"Successfully processed {len(files)} files",
            **result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch processing failed: {str(e)}"
        )

@router.get("/seo/batch-results", tags=["SEO"])
async def get_seo_batch_results():
    """
    获取批量SEO分析结果
    """
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

@router.get("/seo/batch-export", tags=["SEO"])
async def export_seo_batch_results(
    export_type: str = "summary"
):
    """
    导出批量SEO分析结果为CSV文件
    """
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

@router.post("/seo/batch-export", tags=["SEO"])
async def export_seo_batch_results_post(request: SEOExportRequest):
    """
    通过POST请求导出批量SEO分析结果（支持更复杂的导出选项）
    """
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

@router.delete("/seo/batch-results", tags=["SEO"])
async def clear_seo_batch_results():
    """
    清除批量SEO分析结果
    """
    seo_processor.reset_batch_data()
    
    return {
        "success": True,
        "message": "Batch analysis results cleared"
    }

@router.get("/seo/batch-stats", tags=["SEO"])
async def get_seo_batch_stats():
    """
    获取批量SEO分析统计信息
    """
    stats = seo_processor.get_batch_stats()
    
    return {
        "success": True,
        "stats": stats
    }

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
# 虚拟订单分析相关路由 (Orders)
# ================================

@router.post("/orders/generate", tags=["Orders"])
async def generate_virtual_orders(request: VirtualDataGenerateRequest):
    """
    生成虚拟订单数据 - 支持自定义日期范围
    """
    try:
        result = orders_processor.generate_virtual_data(
            count=request.count,
            date_range=request.date_range
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "生成虚拟数据失败")
            )
        
        return result
    except ValueError as e:
        # 处理Pydantic验证错误
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成虚拟订单数据时发生错误: {str(e)}"
        )

@router.post("/orders/filter", tags=["Orders"])
async def apply_order_filters(filter_request: OrderFilterRequest):
    """
    应用订单筛选条件
    """
    try:
        # 转换筛选参数
        date_range = tuple(filter_request.date_range) if filter_request.date_range else None
        sales_amount_range = tuple(filter_request.sales_amount_range) if filter_request.sales_amount_range else None
        
        result = orders_processor.apply_filters(
            date_range=date_range,
            order_types=filter_request.order_types,
            license_ids=filter_request.license_ids,
            currencies=filter_request.currencies,
            payment_platforms=filter_request.payment_platforms,
            order_statuses=filter_request.order_statuses,
            sales_amount_range=sales_amount_range,
            has_coupon=filter_request.has_coupon,
            ab_test_filter=filter_request.ab_test_filter
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "应用筛选条件失败")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"应用筛选条件时发生错误: {str(e)}"
        )

@router.get("/orders/charts", tags=["Orders"])
async def get_order_charts():
    """
    获取订单图表数据
    """
    try:
        result = orders_processor.get_chart_data()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取图表数据时发生错误: {str(e)}"
        )

@router.get("/orders/export", tags=["Orders"])
async def export_order_data():
    """
    导出筛选后的订单数据为CSV文件
    """
    try:
        csv_data = orders_processor.export_filtered_data()
        
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=virtual_orders.csv"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"导出数据时发生错误: {str(e)}"
        )

@router.get("/orders/filter-ranges", tags=["Orders"])
async def get_order_filter_ranges():
    """
    获取订单筛选范围
    """
    try:
        return orders_processor.get_filter_ranges()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取筛选范围时发生错误: {str(e)}"
        )

@router.get("/orders/summary", tags=["Orders"])
async def get_order_summary():
    """
    获取订单数据摘要
    """
    try:
        return orders_processor.get_data_summary()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取数据摘要时发生错误: {str(e)}"
        )

@router.post("/orders/reset", tags=["Orders"])
async def reset_order_data():
    """
    重置所有订单数据
    """
    try:
        orders_processor.reset_data()
        return {
            "success": True,
            "message": "订单数据已重置"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"重置数据时发生错误: {str(e)}"
        )

# ================================
# 结构化数据生成相关路由 (Schema) - 包含原有功能和新增批量处理
# ================================

@router.get("/schema/types", tags=["Schema"])
async def get_schema_types():
    """
    获取支持的结构化数据类型 (原有功能)
    """
    try:
        schema_types = schema_processor.get_supported_schemas()
        return {
            "success": True,
            "schema_types": schema_types
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取结构化数据类型时发生错误: {str(e)}"
        )

@router.post("/schema/generate", tags=["Schema"])
async def generate_schema(request: SchemaGenerateRequest):
    """
    生成结构化数据 (原有功能)
    """
    try:
        result = schema_processor.generate_schema(
            request.schema_type, 
            request.data
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成结构化数据时发生错误: {str(e)}"
        )

# 新增：动态CSV模板相关路由
@router.get("/schema/batch/template/{schema_type}", tags=["Schema Dynamic Template"])
async def get_dynamic_csv_template(schema_type: str = Path(..., description="结构化数据类型")):
    """
    获取指定类型的动态CSV模板
    
    支持的类型包括：Article, Product, Organization, Person, Event, VideoObject, WebSite, Breadcrumb, FAQPage, HowTo
    """
    try:
        result = schema_processor.get_dynamic_csv_template(schema_type)
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "生成模板失败")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取动态CSV模板时发生错误: {str(e)}"
        )

@router.get("/schema/batch/templates", tags=["Schema Dynamic Template"])
async def get_all_dynamic_csv_templates():
    """
    获取所有支持类型的动态CSV模板列表
    """
    try:
        schema_types = schema_processor.get_supported_schemas()
        templates = []
        
        for schema_type in schema_types.keys():
            try:
                template = schema_processor.get_dynamic_csv_template(schema_type)
                if template["success"]:
                    templates.append({
                        "schema_type": schema_type,
                        "name": f"{schema_types[schema_type]['name']}模板（动态字段）",
                        "description": f"使用分离字段格式的{schema_types[schema_type]['name']}信息模板",
                        "headers": template["headers"],
                        "required_fields": template["required_fields"],
                        "field_descriptions": template["field_descriptions"]
                    })
            except Exception as e:
                print(f"生成 {schema_type} 模板时出错: {str(e)}")
                continue
        
        return {
            "success": True,
            "templates": templates,
            "total_count": len(templates)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取模板列表时发生错误: {str(e)}"
        )

@router.get("/schema/batch/template/{schema_type}/download", tags=["Schema Dynamic Template"])
async def download_dynamic_csv_template(schema_type: str = Path(..., description="结构化数据类型")):
    """
    下载指定类型的动态CSV模板文件
    """
    try:
        result = schema_processor.get_dynamic_csv_template(schema_type)
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "生成模板失败")
            )
        
        csv_content = result["csv_content"]
        filename = f"{schema_type.lower()}_dynamic_template.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"下载模板时发生错误: {str(e)}"
        )

# 批量处理相关路由（增强版本）
@router.post("/schema/batch/upload", tags=["Schema Batch"])
async def upload_schema_batch_files(files: List[UploadFile] = File(...)):
    """
    批量上传结构化数据CSV文件（支持动态字段格式）
    
    支持两种CSV格式：
    1. 动态字段格式：url, schema_type, [dynamic_fields...]
    2. 传统格式：url, schema_type, data_json
    
    系统会自动检测格式类型并进行相应处理
    """
    if not files:
        raise HTTPException(status_code=400, detail="未提供文件")
    
    # 检查文件大小
    await check_file_size(files)
    
    # 验证文件类型
    for file in files:
        if not file.filename.lower().endswith(('.csv', '.xlsx')):
            raise HTTPException(
                status_code=400, 
                detail=f"不支持的文件类型: {file.filename}。仅支持CSV和XLSX文件"
            )
    
    try:
        result = await schema_processor.process_batch_files(files)
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "文件处理失败")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量文件上传处理失败: {str(e)}"
        )

@router.post("/schema/batch/generate", tags=["Schema Batch"])
async def generate_batch_schemas(request: SchemaBatchGenerateRequest):
    """
    批量生成结构化数据（支持动态字段格式）
    
    基于已上传的CSV数据批量生成结构化数据
    可选择性过滤特定URL模式
    """
    try:
        result = schema_processor.generate_batch_schemas(
            url_filter=request.url_filter
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "批量生成失败")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量生成结构化数据时发生错误: {str(e)}"
        )

@router.post("/schema/batch/export", tags=["Schema Batch"])
async def export_batch_schemas(request: SchemaBatchExportRequest):
    """
    导出批量生成的结构化数据
    
    支持两种导出模式：
    - combined: 导出为单个JSON文件，包含所有URL的数据
    - separated: 按URL分别导出JSON-LD文件
    """
    try:
        result = schema_processor.export_batch_schemas(
            export_type=request.export_type
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "导出失败")
            )
        
        if request.export_type == "combined":
            # 返回单个JSON文件
            return StreamingResponse(
                io.BytesIO(result["data"].encode('utf-8')),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={result['filename']}"}
            )
        else:
            # 返回分离的文件信息
            return result
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"导出批量结构化数据时发生错误: {str(e)}"
        )

@router.get("/schema/batch/export-separated/{filename}", tags=["Schema Batch"])
async def download_separated_schema_file(filename: str):
    """
    下载分离导出中的单个JSON-LD文件
    """
    try:
        # 先获取分离导出数据
        export_result = schema_processor.export_batch_schemas("separated")
        
        if not export_result["success"]:
            raise HTTPException(
                status_code=400,
                detail="没有可导出的数据"
            )
        
        separated_data = export_result["data"]
        
        if filename not in separated_data:
            raise HTTPException(
                status_code=404,
                detail=f"未找到文件: {filename}"
            )
        
        file_data = separated_data[filename]
        
        return StreamingResponse(
            io.BytesIO(file_data["json_ld"].encode('utf-8')),
            media_type="application/ld+json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"下载文件时发生错误: {str(e)}"
        )

@router.get("/schema/batch/summary", tags=["Schema Batch"])
async def get_batch_schema_summary():
    """
    获取批量处理摘要信息
    
    返回当前批量处理的状态、数据统计等信息
    """
    try:
        summary = schema_processor.get_batch_summary()
        return {
            "success": True,
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取批量处理摘要时发生错误: {str(e)}"
        )

@router.post("/schema/batch/reset", tags=["Schema Batch"])
async def reset_batch_schema_data():
    """
    重置批量处理数据
    
    清除所有已上传的CSV数据和生成的结构化数据
    """
    try:
        schema_processor.reset_batch_data()
        return {
            "success": True,
            "message": "批量处理数据已重置"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"重置批量处理数据时发生错误: {str(e)}"
        )

@router.get("/schema/batch/preview", tags=["Schema Batch"])
async def preview_batch_data(limit: int = 10):
    """
    预览批量上传的CSV数据
    
    返回前N条数据用于确认上传内容是否正确
    """
    try:
        if schema_processor.batch_data.empty:
            return {
                "success": False,
                "message": "没有可预览的数据，请先上传CSV文件"
            }
        
        # 获取预览数据
        preview_data = schema_processor.batch_data.head(limit)
        
        return {
            "success": True,
            "preview": preview_data.to_dict('records'),
            "total_rows": len(schema_processor.batch_data),
            "showing": len(preview_data)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"预览批量数据时发生错误: {str(e)}"
        )

# ================================
# 健康检查和通用路由
# ================================

@router.get("/health", tags=["System"])
async def health_check():
    """
    API健康检查端点
    """
    return {"status": "healthy", "service": "CSV & Sitemap & SEO & Keystore Processor API v1"}

@router.get("/", tags=["System"])
async def api_info():
    """
    API v1 信息端点
    """
    return {
        "api_version": "v1",
        "service": "CSV & Sitemap & SEO & Keystore Processor API",
        "status": "running",
        "endpoints": {
            "keywords": "/v1/keywords/",
            "keystore": "/v1/keystore/",  # 关键词库端点
            "backlinks": "/v1/backlinks/", 
            "cross_analysis": "/v1/backlinks/cross-analysis/",
            "orders": "/v1/orders/",
            "seo": "/v1/seo/",
            "seo_batch": "/v1/seo/batch-*",
            "sitemaps": "/v1/sitemaps/",
            "schema": "/v1/schema/",
            "schema_batch": "/v1/schema/batch/",
            "schema_dynamic_templates": "/v1/schema/batch/template/",
            "health": "/v1/health"
        },
        "new_features": {
            "keystore_management": "支持关键词库构建、组管理、族创建和重复关键词处理",
            "enhanced_export": "导出数据包含族信息并清理无用列",
            "seo_batch_analysis": "支持批量HTML文件SEO分析，自动调整超时时间",
            "seo_csv_export": "支持导出批量SEO分析结果为CSV格式（摘要和详细两种模式）",
            "dynamic_csv_support": "支持动态字段CSV格式，简化批量数据输入",
            "auto_format_detection": "自动检测CSV格式类型（动态字段 vs 传统JSON）",
            "enhanced_templates": "提供增强的CSV模板，包含字段描述和示例",
            "intelligent_field_mapping": "智能字段映射，支持多种列名变体"
        },
        "supported_csv_formats": {
            "keystore_format": {
                "description": "关键词库专用格式，支持组管理和族创建",
                "required_fields": ["Keywords", "group_name_map", "QPM", "DIFF"],
                "optional_fields": ["Group", "Force Group", "group_name", "Task Name", "Date and time"],
                "example": "Keywords,group_name_map,QPM,DIFF,Task Name",
                "features": ["自动去重", "组关系分析", "重复关键词检测", "族管理", "导出包含族信息"]
            },
            "dynamic_fields": {
                "description": "动态字段格式，每个字段使用独立列",
                "example": "url,schema_type,headline,author,datePublished,description",
                "advantages": ["易于编辑", "支持Excel", "不需要JSON知识"]
            },
            "data_json": {
                "description": "传统JSON格式，使用data_json列存储所有字段",
                "example": "url,schema_type,data_json",
                "advantages": ["向后兼容", "适合程序化生成", "支持复杂数据结构"]
            }
        },
        "keystore_features": {
            "file_upload": "支持多CSV文件上传，自动合并去重",
            "visualization": "ECharts可视化关键词组和族关系图",
            "duplicate_management": "识别、移动和删除重复关键词",
            "group_management": "重命名关键词组，查看组详情和统计",
            "cluster_management": "创建、编辑、删除关键词族",
            "export_capabilities": "导出完整关键词库数据为CSV格式，包含族信息"
        },
        "seo_batch_features": {
            "max_files": 50,
            "supported_formats": [".html", ".htm"],
            "timeout_calculation": "基础5分钟 + 每个文件1分钟，最大30分钟",
            "export_formats": ["summary", "detailed"],
            "concurrent_processing": "支持并发处理，限制3个文件同时分析"
        }
    }