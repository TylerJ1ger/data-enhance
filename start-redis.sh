#!/bin/bash

# Redis 启动脚本 for macOS/Linux
# Start Redis Script for macOS/Linux

echo "=== Redis 启动脚本 ==="
echo "=== Redis Startup Script ==="
echo ""

# 检查Redis是否已安装
check_redis_installation() {
    if command -v redis-server &> /dev/null; then
        echo "✅ Redis 已安装 / Redis is installed"
        redis-server --version
        return 0
    else
        echo "❌ Redis 未安装 / Redis is not installed"
        echo ""
        echo "请安装Redis:"
        echo "macOS: brew install redis"
        echo "Ubuntu/Debian: sudo apt-get install redis-server"
        echo "CentOS/RHEL: sudo yum install redis"
        echo ""
        echo "Please install Redis:"
        echo "macOS: brew install redis"
        echo "Ubuntu/Debian: sudo apt-get install redis-server"
        echo "CentOS/RHEL: sudo yum install redis"
        return 1
    fi
}

# 检查Redis是否已经在运行
check_redis_running() {
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis 已在运行 / Redis is already running"
        echo "端口: 6379"
        echo "Port: 6379"
        return 0
    else
        echo "⚠️ Redis 未运行 / Redis is not running"
        return 1
    fi
}

# 启动Redis服务器
start_redis() {
    echo "🚀 启动Redis服务器... / Starting Redis server..."
    
    # 尝试使用brew services启动（macOS）
    if command -v brew &> /dev/null; then
        echo "使用 brew services 启动Redis..."
        if brew services start redis &> /dev/null; then
            echo "✅ Redis 已通过 brew services 启动"
            sleep 2
            return 0
        fi
    fi
    
    # 尝试直接启动Redis服务器
    echo "尝试直接启动Redis服务器..."
    if command -v redis-server &> /dev/null; then
        echo "启动Redis服务器（后台模式）..."
        nohup redis-server --daemonize yes --port 6379 --dir /tmp &> /dev/null &
        sleep 2
        return 0
    fi
    
    return 1
}

# 验证Redis连接
verify_redis_connection() {
    echo "🔍 验证Redis连接... / Verifying Redis connection..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if redis-cli ping &> /dev/null; then
            echo "✅ Redis 连接成功! / Redis connection successful!"
            echo "📋 Redis 信息 / Redis Info:"
            echo "   主机: localhost / Host: localhost"
            echo "   端口: 6379 / Port: 6379"
            echo "   数据库: 0 / Database: 0"
            echo ""
            echo "🌐 可以使用以下命令测试后端健康状态:"
            echo "curl http://localhost:8000/api/v1/keystore/health"
            echo ""
            echo "🌐 You can test backend health with:"
            echo "curl http://localhost:8000/api/v1/keystore/health"
            return 0
        fi
        
        echo "尝试 $attempt/$max_attempts: 等待Redis启动..."
        echo "Attempt $attempt/$max_attempts: Waiting for Redis to start..."
        sleep 1
        ((attempt++))
    done
    
    echo "❌ Redis 连接失败 / Redis connection failed"
    return 1
}

# 停止Redis（可选功能）
stop_redis() {
    if [ "$1" = "--stop" ]; then
        echo "🛑 停止Redis服务... / Stopping Redis service..."
        
        # 尝试使用brew services停止
        if command -v brew &> /dev/null; then
            brew services stop redis &> /dev/null
        fi
        
        # 尝试使用redis-cli shutdown
        redis-cli shutdown &> /dev/null
        
        # 杀死redis-server进程
        pkill redis-server &> /dev/null
        
        echo "✅ Redis 服务已停止 / Redis service stopped"
        exit 0
    fi
}

# 显示Redis状态
show_redis_status() {
    if [ "$1" = "--status" ]; then
        echo "📊 Redis 状态检查 / Redis Status Check"
        echo "=================================="
        
        if redis-cli ping &> /dev/null; then
            echo "状态: 运行中 / Status: Running"
            echo "内存使用: / Memory Usage:"
            redis-cli info memory | grep used_memory_human
            echo "连接数: / Connections:"
            redis-cli info clients | grep connected_clients
            echo "版本: / Version:"
            redis-cli info server | grep redis_version
        else
            echo "状态: 未运行 / Status: Not Running"
        fi
        
        exit 0
    fi
}

# 主函数
main() {
    # 处理命令行参数
    stop_redis "$1"
    show_redis_status "$1"
    
    echo "开始Redis启动流程... / Starting Redis startup process..."
    echo ""
    
    # 检查Redis安装
    if ! check_redis_installation; then
        exit 1
    fi
    
    echo ""
    
    # 检查Redis是否已在运行
    if check_redis_running; then
        verify_redis_connection
        exit 0
    fi
    
    echo ""
    
    # 启动Redis
    if start_redis; then
        echo ""
        verify_redis_connection
    else
        echo "❌ Redis 启动失败 / Failed to start Redis"
        echo ""
        echo "手动启动选项 / Manual start options:"
        echo "1. redis-server"
        echo "2. brew services start redis (macOS)"
        echo "3. sudo systemctl start redis (Linux)"
        exit 1
    fi
}

# 帮助信息
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Redis 启动脚本 / Redis Startup Script"
    echo ""
    echo "用法 / Usage:"
    echo "  ./start-redis.sh           # 启动Redis / Start Redis"
    echo "  ./start-redis.sh --stop    # 停止Redis / Stop Redis"
    echo "  ./start-redis.sh --status  # 查看状态 / Check status"
    echo "  ./start-redis.sh --help    # 显示帮助 / Show help"
    echo ""
    echo "环境变量 / Environment Variables:"
    echo "  REDIS_HOST=localhost       # Redis主机"
    echo "  REDIS_PORT=6379            # Redis端口"
    echo "  REDIS_DB=0                 # Redis数据库"
    exit 0
fi

# 运行主函数
main "$1"