#!/usr/bin/env python3
"""
Redis关键词搜索工具
"""
import sys
import os
sys.path.append('/Users/tyler/Documents/Tyler的工作区/04.软件列表/02.utility/data-enhance/backend')

from app.core.database import KeystoreRepository

def search_keyword(keyword_text):
    """搜索关键词在Redis中的键"""
    repo = KeystoreRepository()
    
    # 获取所有关键词键
    pattern = repo._make_key("kw:*")
    keys = repo.redis.keys(pattern)
    
    print(f"正在搜索关键词: '{keyword_text}'")
    print(f"总共有 {len(keys)} 个关键词键")
    
    found_keys = []
    
    for key in keys:
        try:
            # 获取关键词数据
            data = repo.redis.hgetall(key)
            if data:
                # 解码Keywords字段
                stored_keyword = data.get(b'Keywords', b'').decode('utf-8').strip('"')
                if keyword_text.lower() in stored_keyword.lower():
                    found_keys.append({
                        'redis_key': key.decode('utf-8'),
                        'keyword': stored_keyword,
                        'group': data.get(b'group_name_map', b'').decode('utf-8').strip('"')
                    })
        except Exception as e:
            print(f"处理键 {key} 时出错: {e}")
    
    return found_keys

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python search_redis_keyword.py '关键词'")
        sys.exit(1)
    
    keyword = sys.argv[1]
    results = search_keyword(keyword)
    
    if results:
        print(f"\n找到 {len(results)} 个匹配的关键词:")
        for i, result in enumerate(results, 1):
            print(f"{i}. Redis键: {result['redis_key']}")
            print(f"   关键词: {result['keyword']}")
            print(f"   组: {result['group']}")
            print()
    else:
        print(f"\n未找到包含 '{keyword}' 的关键词")