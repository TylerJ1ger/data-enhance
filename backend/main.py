import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import config, is_development, is_production
from app.routes.api import router as api_router

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
app.include_router(api_router, prefix="/api")

# Serve static files in development mode
if is_development():
    # Mount static directory
    static_dir = os.path.join(config["root_dir"], "static")
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    # Create a route for serving the frontend in development mode
    @app.get("/", response_class=HTMLResponse)
    async def read_root(request: Request):
        with open(os.path.join(static_dir, "index.html"), "r") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    
    # Catch-all route for SPA routing
    @app.get("/{path:path}", response_class=HTMLResponse)
    async def catch_all(request: Request, path: str):
        with open(os.path.join(static_dir, "index.html"), "r") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)

# Override root route in production mode
if is_production():
    @app.get("/")
    async def read_root():
        return {
            "service": config["app_name"],
            "version": config["api_version"],
            "status": "running",
            "environment": config["environment"],
            "api_docs": "/api/docs"
        }

# Add a simple static HTML file for development mode
if is_development():
    static_dir = os.path.join(config["root_dir"], "static")
    os.makedirs(static_dir, exist_ok=True)
    
    with open(os.path.join(static_dir, "index.html"), "w") as f:
        f.write("""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSV Processor Tool - Development Mode</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
        }
        code {
            background-color: #f0f0f0;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }
        ul {
            padding-left: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>CSV Processor Tool - Development Mode</h1>
        <p>This is a placeholder page for development mode. The actual frontend is built with React/NextJS and should be started separately.</p>
        
        <h2>API Endpoints</h2>
        <ul>
            <li><a href="/api/docs" target="_blank">API Documentation</a></li>
            <li><code>POST /api/upload</code> - Upload CSV/XLSX files</li>
            <li><code>POST /api/filter</code> - Apply filters to data</li>
            <li><code>GET /api/brand-overlap</code> - Get brand keyword overlap</li>
            <li><code>GET /api/export</code> - Export filtered data as CSV</li>
            <li><code>GET /api/filter-ranges</code> - Get filter range values</li>
            <li><code>GET /api/health</code> - API health check</li>
        </ul>
    </div>
</body>
</html>
        """)

if __name__ == "__main__":
    # Run the FastAPI app with uvicorn - 更改配置支持大文件上传
    uvicorn.run(
        "main:app",
        host=config["host"],
        port=config["port"],
        reload=is_development(),
        # 修改默认配置，支持大文件上传
        timeout_keep_alive=300,  # 增加保持连接的超时时间，单位为秒
    )