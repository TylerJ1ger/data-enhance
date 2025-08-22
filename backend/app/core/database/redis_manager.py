import json
import logging
from typing import Dict, List, Set, Any, Optional, Union
from datetime import datetime, timedelta
import redis
import aioredis
from redis.connection import ConnectionPool
from redis.retry import Retry
from redis.backoff import ExponentialBackoff

from app.config import KEYSTORE_REDIS_CONFIG

logger = logging.getLogger(__name__)


class RedisManager:
    """Redis connection and data management for keystore operations"""
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize Redis manager with configuration
        
        Args:
            config: Redis configuration dict, defaults to KEYSTORE_REDIS_CONFIG
        """
        self.config = config or KEYSTORE_REDIS_CONFIG
        self.key_prefix = self.config.get('key_prefix', 'keystore:')
        self.key_expiry = self.config.get('key_expiry', 86400)  # 24 hours
        
        # Initialize connection pools
        self._pool = None
        self._async_pool = None
        self._redis = None
        self._async_redis = None
        
        # Statistics
        self._connection_count = 0
        self._last_health_check = None
        
    def _create_connection_pool(self) -> ConnectionPool:
        """Create Redis connection pool"""
        retry_policy = Retry(
            ExponentialBackoff(),
            retries=3
        ) if self.config.get('retry_on_timeout', True) else None
        
        pool_kwargs = {
            'host': self.config['host'],
            'port': self.config['port'],
            'db': self.config['db'],
            'max_connections': self.config.get('max_connections', 20),
            'retry': retry_policy,
            'health_check_interval': self.config.get('health_check_interval', 30)
        }
        
        if self.config.get('password'):
            pool_kwargs['password'] = self.config['password']
            
        return ConnectionPool(**pool_kwargs)
    
    def get_redis_client(self) -> redis.Redis:
        """Get synchronous Redis client"""
        if not self._redis:
            if not self._pool:
                self._pool = self._create_connection_pool()
            self._redis = redis.Redis(connection_pool=self._pool)
            self._connection_count += 1
            logger.info(f"Created Redis client (total connections: {self._connection_count})")
        
        return self._redis
    
    async def get_async_redis_client(self) -> aioredis.Redis:
        """Get asynchronous Redis client"""
        if not self._async_redis:
            redis_url = f"redis://{self.config['host']}:{self.config['port']}/{self.config['db']}"
            if self.config.get('password'):
                redis_url = f"redis://:{self.config['password']}@{self.config['host']}:{self.config['port']}/{self.config['db']}"
            
            self._async_redis = aioredis.from_url(
                redis_url,
                max_connections=self.config.get('max_connections', 20),
                retry_on_timeout=self.config.get('retry_on_timeout', True)
            )
            logger.info("Created async Redis client")
        
        return self._async_redis
    
    def _make_key(self, key: str) -> str:
        """Create a prefixed key"""
        return f"{self.key_prefix}{key}"
    
    def health_check(self) -> Dict[str, Any]:
        """Check Redis connection health"""
        try:
            redis_client = self.get_redis_client()
            start_time = datetime.now()
            
            # Test basic operations
            test_key = self._make_key("health_check")
            redis_client.set(test_key, "test", ex=10)
            value = redis_client.get(test_key)
            redis_client.delete(test_key)
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            self._last_health_check = datetime.now()
            
            return {
                "status": "healthy",
                "response_time_ms": response_time * 1000,
                "last_check": self._last_health_check.isoformat(),
                "connection_count": self._connection_count,
                "config": {
                    "host": self.config['host'],
                    "port": self.config['port'],
                    "db": self.config['db']
                }
            }
            
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }
    
    async def async_health_check(self) -> Dict[str, Any]:
        """Async version of health check"""
        try:
            redis_client = await self.get_async_redis_client()
            start_time = datetime.now()
            
            # Test basic operations
            test_key = self._make_key("health_check")
            await redis_client.set(test_key, "test", ex=10)
            value = await redis_client.get(test_key)
            await redis_client.delete(test_key)
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            self._last_health_check = datetime.now()
            
            return {
                "status": "healthy",
                "response_time_ms": response_time * 1000,
                "last_check": self._last_health_check.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Async Redis health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }
    
    def clear_all_keystore_data(self) -> bool:
        """Clear all keystore data from Redis"""
        try:
            redis_client = self.get_redis_client()
            
            # Get all keys with our prefix
            pattern = f"{self.key_prefix}*"
            keys = redis_client.keys(pattern)
            
            if keys:
                redis_client.delete(*keys)
                logger.info(f"Cleared {len(keys)} keystore keys from Redis")
            else:
                logger.info("No keystore keys found to clear")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear keystore data: {str(e)}")
            return False
    
    def close(self):
        """Close Redis connections"""
        try:
            if self._redis:
                self._redis.close()
                self._redis = None
                
            if self._pool:
                self._pool.disconnect()
                self._pool = None
                
            logger.info("Redis connections closed")
            
        except Exception as e:
            logger.error(f"Error closing Redis connections: {str(e)}")
    
    async def async_close(self):
        """Close async Redis connections"""
        try:
            if self._async_redis:
                await self._async_redis.close()
                self._async_redis = None
                
            logger.info("Async Redis connections closed")
            
        except Exception as e:
            logger.error(f"Error closing async Redis connections: {str(e)}")
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.async_close()


# Global Redis manager instance
redis_manager = RedisManager()


def get_redis_manager() -> RedisManager:
    """Get the global Redis manager instance"""
    return redis_manager


# Utility functions for JSON serialization
def serialize_for_redis(data: Any) -> str:
    """Serialize data for Redis storage"""
    def json_serializer(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif hasattr(obj, 'tolist'):  # numpy arrays
            return obj.tolist()
        elif hasattr(obj, 'item'):  # numpy scalars
            return obj.item()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    return json.dumps(data, default=json_serializer, ensure_ascii=False)


def deserialize_from_redis(data: str) -> Any:
    """Deserialize data from Redis storage"""
    if not data:
        return None
    return json.loads(data)