import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn
from starlette.middleware.base import BaseHTTPMiddleware

from .config import config, is_development, is_production
# 导入legacy API路由（保持向后兼容）
from .api.legacy import router as legacy_api_router
# 导入新的v1 API路由
from .api.v1.router import router as v1_api_router

# 创建中间件来处理大文件上传
class LargeUploadMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 这里不检查内容长度，直接放行所有请求
        return await call_next(request)

# Create FastAPI app
app = FastAPI(
    title=config["app_name"],
    version=config["api_version"],
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# 添加中间件以支持大文件上传
app.add_middleware(LargeUploadMiddleware)

# 显式设置允许的源
origins = [
    "http://localhost:3000",     # 开发环境前端
    "http://localhost:8000",     # 开发环境后端
    "http://127.0.0.1:3000",     # 替代本地地址
    "http://127.0.0.1:8000",     # 替代本地地址
]

# 添加 CORS 中间件 - 明确指定允许的源
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # 明确指定允许的源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # 允许前端访问响应头信息，用于文件下载
)

# Include API routes
# 保留原有API路径以确保向后兼容
app.include_router(legacy_api_router, prefix="/api")
# 新增v1版本API
app.include_router(v1_api_router, prefix="/api/v1")

# Serve static files in development mode
if is_development():
    # Mount static directory - 路径调整，因为main.py现在在app/目录下
    static_dir = os.path.join(config["root_dir"], "backend", "app", "static")
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    # Create a route for serving the frontend in development mode
    @app.get("/", response_class=HTMLResponse)
    async def read_root(request: Request):
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                html_content = f.read()
            return HTMLResponse(content=html_content)
        else:
            # 如果没有静态文件，返回默认的开发页面
            return HTMLResponse(content=get_default_dev_page())
    
    # Catch-all route for SPA routing
    @app.get("/{path:path}", response_class=HTMLResponse)
    async def catch_all(request: Request, path: str):
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                html_content = f.read()
            return HTMLResponse(content=html_content)
        else:
            # 如果没有静态文件，返回默认的开发页面
            return HTMLResponse(content=get_default_dev_page())

# Override root route in production mode
if is_production():
    @app.get("/")
    async def read_root():
        return {
            "service": config["app_name"],
            "version": config["api_version"],
            "status": "running",
            "environment": config["environment"],
            "api_docs": "/api/docs",
            "api_versions": {
                "legacy": "/api/",
                "v1": "/api/v1/"
            }
        }

def get_default_dev_page() -> str:
    """返回默认的开发页面HTML"""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSV & SEO Processor Tool - Development Mode</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        h2 {
            color: #555;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        code {
            background-color: #f8f9fa;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
            border: 1px solid #e9ecef;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        a:hover {
            text-decoration: underline;
        }
        .version-badge {
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            margin-left: 10px;
        }
        .legacy-badge {
            background: #ffc107;
            color: #212529;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            margin-left: 10px;
        }
        .api-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .feature-card {
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .feature-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 CSV & SEO Processor Tool</h1>
        <p style="text-align: center; font-size: 1.2em; color: #666;">
            Development Mode - Backend API Server
        </p>
        
        <div class="feature-grid">
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3>Keywords Analysis</h3>
                <p>CSV关键词数据分析</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🔗</div>
                <h3>Backlinks Analysis</h3>
                <p>外链数据分析</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🔍</div>
                <h3>SEO Checker</h3>
                <p>SEO问题检测</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🗺️</div>
                <h3>Sitemap Analysis</h3>
                <p>站点地图分析</p>
            </div>
        </div>

        <h2>📚 API Documentation</h2>
        <div class="api-section">
            <p><strong>Interactive API Documentation:</strong></p>
            <ul>
                <li><a href="/api/docs" target="_blank">📖 Swagger UI - Complete API Documentation</a></li>
                <li><a href="/api/redoc" target="_blank">📋 ReDoc - Alternative Documentation</a></li>
            </ul>
        </div>

        <h2>🔌 API Endpoints</h2>
        
        <div class="api-section">
            <h3>Legacy API <span class="legacy-badge">Deprecated</span></h3>
            <p>Original API endpoints (maintained for backward compatibility):</p>
            <ul>
                <li><code>POST /api/upload</code> - Upload CSV/XLSX files</li>
                <li><code>POST /api/filter</code> - Apply filters to data</li>
                <li><code>GET /api/brand-overlap</code> - Get brand keyword overlap</li>
                <li><code>GET /api/export</code> - Export filtered data as CSV</li>
                <li><code>GET /api/health</code> - API health check</li>
            </ul>
        </div>

        <div class="api-section">
            <h3>API v1 <span class="version-badge">Recommended</span></h3>
            <p>New structured API endpoints:</p>
            
            <h4>Keywords Analysis:</h4>
            <ul>
                <li><code>POST /api/v1/keywords/upload</code> - Upload keyword data</li>
                <li><code>POST /api/v1/keywords/filter</code> - Filter keyword data</li>
                <li><code>GET /api/v1/keywords/export</code> - Export keyword results</li>
            </ul>

            <h4>Backlinks Analysis:</h4>
            <ul>
                <li><code>POST /api/v1/backlinks/upload</code> - Upload backlink data</li>
                <li><code>POST /api/v1/backlinks/filter</code> - Filter backlink data</li>
                <li><code>POST /api/v1/backlinks/cross-analysis/upload-first</code> - Cross analysis first step</li>
            </ul>

            <h4>SEO Analysis:</h4>
            <ul>
                <li><code>POST /api/v1/seo/upload</code> - Upload HTML for SEO analysis</li>
                <li><code>GET /api/v1/seo/categories</code> - Get SEO check categories</li>
            </ul>

            <h4>Sitemap Analysis:</h4>
            <ul>
                <li><code>POST /api/v1/sitemaps/upload</code> - Upload sitemap files</li>
                <li><code>GET /api/v1/sitemaps/visualization</code> - Get visualization data</li>
                <li><code>POST /api/v1/sitemaps/filter</code> - Filter sitemap URLs</li>
            </ul>
        </div>

        <h2>🛠️ Development Information</h2>
        <div class="api-section">
            <p><strong>Status:</strong> Development Mode Active</p>
            <p><strong>Frontend:</strong> Should be started separately on port 3000</p>
            <p><strong>API Base URL:</strong> <code>http://localhost:8000</code></p>
            <p><strong>CORS:</strong> Enabled for localhost development</p>
        </div>

        <h2>🚀 Getting Started</h2>
        <div class="api-section">
            <ol>
                <li>Start the frontend development server: <code>cd frontend && npm run dev</code></li>
                <li>Access the application at: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></li>
                <li>Use the API documentation above to understand available endpoints</li>
                <li>For new developments, prefer the <strong>v1 API endpoints</strong></li>
            </ol>
        </div>
    </div>
</body>
</html>
    """

# Add a simple static HTML file for development mode if it doesn't exist
if is_development():
    static_dir = os.path.join(config["root_dir"], "backend", "app", "static")
    os.makedirs(static_dir, exist_ok=True)
    
    index_path = os.path.join(static_dir, "index.html")
    if not os.path.exists(index_path):
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(get_default_dev_page())

def run_server():
    """运行服务器的入口函数"""
    # Run the FastAPI app with uvicorn - 更改配置支持大文件上传
    uvicorn.run(
        "app.main:app",  # 更新模块路径
        host=config["host"],
        port=config["port"],
        reload=is_development(),
        # 修改默认配置，支持大文件上传
        timeout_keep_alive=300,  # 增加保持连接的超时时间，单位为秒
    )

if __name__ == "__main__":
    run_server()