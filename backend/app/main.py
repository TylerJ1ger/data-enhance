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
    # 修复静态文件路径
    static_dir = os.path.join(config["root_dir"], "static")
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
            # 如果没有静态文件，返回简单的开发信息
            return JSONResponse(content={
                "service": config["app_name"],
                "version": config["api_version"],
                "status": "running (development)",
                "environment": config["environment"],
                "message": "Frontend should be started separately on port 3000",
                "api_docs": "/api/docs",
                "api_versions": {
                    "legacy": "/api/",
                    "v1": "/api/v1/"
                }
            })
    
    # Catch-all route for SPA routing
    @app.get("/{path:path}", response_class=HTMLResponse)
    async def catch_all(request: Request, path: str):
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                html_content = f.read()
            return HTMLResponse(content=html_content)
        else:
            # 如果没有静态文件，返回简单的开发信息
            return JSONResponse(content={
                "service": config["app_name"],
                "version": config["api_version"],
                "status": "running (development)",
                "environment": config["environment"],
                "message": "Frontend should be started separately on port 3000",
                "api_docs": "/api/docs",
                "requested_path": path
            })

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