# Redis 设置指南 / Redis Setup Guide

## 概述 / Overview

关键词库功能现在使用 Redis 作为数据库来实现数据持久化和状态同步。本指南将帮助您设置和配置 Redis。

The Keystore functionality now uses Redis as a database for data persistence and state synchronization. This guide will help you set up and configure Redis.

## 快速开始 / Quick Start

### 1. 安装 Redis / Install Redis

**macOS (使用 Homebrew):**
```bash
brew install redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
```

**CentOS/RHEL:**
```bash
sudo yum install redis
# 或 / or
sudo dnf install redis
```

**Windows:**
- 下载 Redis for Windows 或使用 WSL
- Download Redis for Windows or use WSL

### 2. 启动 Redis / Start Redis

**使用提供的脚本 / Using provided script:**
```bash
./start-redis.sh
```

**手动启动 / Manual start:**
```bash
# macOS (使用 Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# 直接启动 / Direct start
redis-server
```

### 3. 验证 Redis 连接 / Verify Redis Connection

```bash
# 检查 Redis 是否运行
redis-cli ping
# 应该返回: PONG

# 检查后端健康状态
curl http://localhost:8000/api/v1/keystore/health
```

## 配置 / Configuration

### 环境变量 / Environment Variables

Redis 配置通过 `backend/.env` 文件管理：

Redis configuration is managed through the `backend/.env` file:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_SSL=false
REDIS_MAX_CONNECTIONS=10
REDIS_SOCKET_TIMEOUT=5
REDIS_SOCKET_CONNECT_TIMEOUT=5

# Keystore Redis Configuration
KEYSTORE_REDIS_KEY_PREFIX=keystore:
KEYSTORE_REDIS_KEY_EXPIRY=86400
```

### 配置说明 / Configuration Explanation

| 变量 / Variable | 默认值 / Default | 说明 / Description |
|----------------|------------------|-------------------|
| `REDIS_HOST` | localhost | Redis 服务器主机 / Redis server host |
| `REDIS_PORT` | 6379 | Redis 服务器端口 / Redis server port |
| `REDIS_DB` | 0 | Redis 数据库编号 / Redis database number |
| `REDIS_PASSWORD` | (空) | Redis 密码 / Redis password |
| `REDIS_SSL` | false | 是否使用 SSL / Whether to use SSL |
| `REDIS_MAX_CONNECTIONS` | 10 | 最大连接数 / Maximum connections |
| `REDIS_SOCKET_TIMEOUT` | 5 | 套接字超时(秒) / Socket timeout (seconds) |
| `REDIS_SOCKET_CONNECT_TIMEOUT` | 5 | 连接超时(秒) / Connection timeout (seconds) |
| `KEYSTORE_REDIS_KEY_PREFIX` | keystore: | 键前缀 / Key prefix |
| `KEYSTORE_REDIS_KEY_EXPIRY` | 86400 | 键过期时间(秒) / Key expiry time (seconds) |

## Redis 数据结构 / Redis Data Structure

### 键模式 / Key Patterns

```
keystore:keyword:{keyword_id}           # 关键词数据 / Keyword data
keystore:group:{group_name}:keywords    # 组中的关键词ID集合 / Keyword IDs in group
keystore:cluster:{cluster_name}         # 族中的组名集合 / Group names in cluster
keystore:keyword_groups:{keyword}       # 关键词所属组集合 / Groups containing keyword
keystore:keywords                       # 全部关键词ID集合 / All keyword IDs
keystore:groups                         # 全部组名集合 / All group names
keystore:clusters                       # 全部族名集合 / All cluster names
keystore:stats                          # 全局统计信息 / Global statistics
```

### 数据类型 / Data Types

- **Hash**: 关键词详细信息 / Keyword details
- **Set**: 组关系和集合 / Group relationships and collections
- **String**: 统计信息和配置 / Statistics and configuration

## 使用脚本 / Using Scripts

### start-redis.sh 脚本选项 / start-redis.sh Script Options

```bash
# 启动 Redis / Start Redis
./start-redis.sh

# 检查状态 / Check status
./start-redis.sh --status

# 停止 Redis / Stop Redis
./start-redis.sh --stop

# 显示帮助 / Show help
./start-redis.sh --help
```

## 故障排除 / Troubleshooting

### 常见问题 / Common Issues

#### 1. 连接被拒绝 / Connection Refused
```
Error 61 connecting to localhost:6379. Connection refused.
```

**解决方案 / Solution:**
- 确保 Redis 服务正在运行 / Ensure Redis service is running
- 检查端口是否正确 / Check if port is correct
- 运行 `./start-redis.sh` 启动 Redis

#### 2. 权限问题 / Permission Issues
```
Permission denied
```

**解决方案 / Solution:**
- 给脚本添加执行权限 / Add execute permission to script
```bash
chmod +x start-redis.sh
```

#### 3. Redis 未安装 / Redis Not Installed
```
redis-server: command not found
```

**解决方案 / Solution:**
- 安装 Redis (参见上面的安装说明)
- Install Redis (see installation instructions above)

### 检查 Redis 状态 / Check Redis Status

```bash
# 检查进程 / Check process
ps aux | grep redis

# 检查端口 / Check port
netstat -tlnp | grep 6379
# 或 / or
lsof -i :6379

# 连接测试 / Connection test
redis-cli ping
```

### 查看 Redis 日志 / View Redis Logs

```bash
# macOS (Homebrew)
tail -f /usr/local/var/log/redis.log

# Linux
sudo tail -f /var/log/redis/redis-server.log

# 或查看系统日志 / or view system logs
sudo journalctl -u redis -f
```

## 性能优化 / Performance Optimization

### 内存优化 / Memory Optimization

在 Redis 配置文件中设置内存限制:
Set memory limits in Redis configuration file:

```bash
# /etc/redis/redis.conf 或 /usr/local/etc/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### 持久化设置 / Persistence Settings

```bash
# RDB 快照
save 900 1
save 300 10
save 60 10000

# AOF 日志
appendonly yes
appendfsync everysec
```

## 生产环境建议 / Production Recommendations

1. **安全设置 / Security Settings:**
   - 设置密码 / Set password: `requirepass your_password`
   - 绑定特定IP / Bind to specific IP: `bind 127.0.0.1`
   - 禁用危险命令 / Disable dangerous commands

2. **监控 / Monitoring:**
   - 使用 Redis Sentinel 进行高可用 / Use Redis Sentinel for high availability
   - 设置监控和告警 / Set up monitoring and alerts
   - 定期备份数据 / Regular data backups

3. **性能调优 / Performance Tuning:**
   - 调整最大连接数 / Adjust max connections
   - 优化内存使用 / Optimize memory usage
   - 使用连接池 / Use connection pooling

## API 端点 / API Endpoints

### 健康检查 / Health Check
```bash
GET /api/v1/keystore/health
```

返回 Redis 和处理器的健康状态。
Returns health status of Redis and processor.

示例响应 / Example Response:
```json
{
  "success": true,
  "processor_status": "healthy",
  "redis_status": "healthy",
  "redis_response_time": 2.5
}
```

## 更多信息 / More Information

- [Redis 官方文档 / Redis Official Documentation](https://redis.io/documentation)
- [Redis 配置 / Redis Configuration](https://redis.io/topics/config)
- [Redis 安全 / Redis Security](https://redis.io/topics/security)
- [Redis 最佳实践 / Redis Best Practices](https://redis.io/topics/memory-optimization)