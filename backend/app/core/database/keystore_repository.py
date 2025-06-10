import uuid
import logging
from typing import Dict, List, Set, Any, Optional, Tuple
from datetime import datetime
from collections import defaultdict

from .redis_manager import RedisManager, serialize_for_redis, deserialize_from_redis

logger = logging.getLogger(__name__)


class KeystoreRepository:
    """
    Redis-based repository for keystore data management
    
    New Optimized Data Structure Design:
    - keystore:kw:{uid} -> Hash (complete keyword data with uid as key)
    - keystore:groups -> Set (all group names)
    - keystore:clusters -> Set (all cluster names)
    - keystore:files -> Set (all imported file names)
    - keystore:group:{group_name} -> Set (keyword UIDs in group)
    - keystore:cluster:{cluster_name} -> Set (group names in cluster)
    - keystore:file:{filename} -> Set (keyword UIDs from file)
    """
    
    def __init__(self, redis_manager: RedisManager = None):
        self.redis_manager = redis_manager or RedisManager()
        self.redis = self.redis_manager.get_redis_client()
    
    def _make_key(self, key: str) -> str:
        """Create a prefixed key"""
        return self.redis_manager._make_key(key)
    
    # =====================================================
    # New UID-based Keyword Operations
    # =====================================================
    
    def create_keyword_with_uid(self, uid: str, keyword_data: Dict[str, Any], filename: str = "") -> bool:
        """
        Create a new keyword entry
        
        Args:
            keyword_data: Dict containing keyword, group_name_map, qpm, diff, etc.
            
        Returns:
            keyword_id: Generated UUID for the keyword
        """
        keyword_id = str(uuid.uuid4())
        keyword_text = keyword_data['Keywords']
        group_name = keyword_data['group_name_map']
        
        try:
            # Store keyword data
            keyword_key = self._make_key(f"keyword:{keyword_id}")
            keyword_data['id'] = keyword_id
            keyword_data['created_at'] = datetime.now().isoformat()
            
            # Use pipeline for atomic operations
            with self.redis.pipeline() as pipe:
                # Store keyword hash
                pipe.hset(keyword_key, mapping={
                    k: serialize_for_redis(v) for k, v in keyword_data.items()
                })
                
                # Add to global keywords set
                pipe.sadd(self._make_key("keywords"), keyword_id)
                
                # Add to group keywords set
                pipe.sadd(self._make_key(f"group:{group_name}:keywords"), keyword_id)
                
                # Add to keyword-groups mapping
                pipe.sadd(self._make_key(f"keyword_groups:{keyword_text}"), group_name)
                
                # Add group to groups set
                pipe.sadd(self._make_key("groups"), group_name)
                
                # Set expiry
                expiry = self.redis_manager.key_expiry
                pipe.expire(keyword_key, expiry)
                
                pipe.execute()
            
            logger.debug(f"Created keyword {keyword_id}: {keyword_text}")
            return keyword_id
            
        except Exception as e:
            logger.error(f"Failed to create keyword: {str(e)}")
            raise
    
    def get_keyword_by_uid(self, uid: str) -> Optional[Dict[str, Any]]:
        """Get keyword data by UID"""
        try:
            keyword_key = self._make_key(f"kw:{uid}")
            data = self.redis.hgetall(keyword_key)
            
            if not data:
                return None
                
            # Deserialize the data
            result = {}
            for k, v in data.items():
                if isinstance(k, bytes):
                    k = k.decode('utf-8')
                if isinstance(v, bytes):
                    v = v.decode('utf-8')
                try:
                    result[k] = deserialize_from_redis(v)
                except:
                    result[k] = v
                    
            return result
            
        except Exception as e:
            logger.error(f"Failed to get keyword by UID {uid}: {str(e)}")
            return None
    
    def update_keyword(self, keyword_id: str, updates: Dict[str, Any]) -> bool:
        """Update keyword data"""
        try:
            keyword_key = self._make_key(f"keyword:{keyword_id}")
            
            # Check if keyword exists
            if not self.redis.exists(keyword_key):
                return False
            
            # Prepare updates
            updates['updated_at'] = datetime.now().isoformat()
            serialized_updates = {k: serialize_for_redis(v) for k, v in updates.items()}
            
            # Update
            self.redis.hset(keyword_key, mapping=serialized_updates)
            
            logger.debug(f"Updated keyword {keyword_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update keyword {keyword_id}: {str(e)}")
            return False
    
    def delete_keyword(self, keyword_id: str) -> bool:
        """Delete a keyword completely"""
        try:
            # Get keyword data first
            keyword_data = self.get_keyword(keyword_id)
            if not keyword_data:
                return False
            
            keyword_text = keyword_data['Keywords']
            group_name = keyword_data['group_name_map']
            
            with self.redis.pipeline() as pipe:
                # Remove keyword hash
                pipe.delete(self._make_key(f"keyword:{keyword_id}"))
                
                # Remove from global keywords set
                pipe.srem(self._make_key("keywords"), keyword_id)
                
                # Remove from group keywords set
                pipe.srem(self._make_key(f"group:{group_name}:keywords"), keyword_id)
                
                # Remove from keyword-groups mapping
                pipe.srem(self._make_key(f"keyword_groups:{keyword_text}"), group_name)
                
                pipe.execute()
            
            logger.debug(f"Deleted keyword {keyword_id}: {keyword_text}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete keyword {keyword_id}: {str(e)}")
            return False
    
    def remove_keyword_from_group(self, keyword_text: str, group_name: str) -> bool:
        """Remove a keyword from a specific group"""
        try:
            # Find the keyword ID
            group_keywords = self.get_group_keywords(group_name)
            keyword_id = None
            
            for kid in group_keywords:
                kdata = self.get_keyword(kid)
                if kdata and kdata['Keywords'] == keyword_text:
                    keyword_id = kid
                    break
            
            if not keyword_id:
                logger.warning(f"Keyword '{keyword_text}' not found in group '{group_name}'")
                return False
            
            # Delete the keyword completely
            return self.delete_keyword(keyword_id)
            
        except Exception as e:
            logger.error(f"Failed to remove keyword '{keyword_text}' from group '{group_name}': {str(e)}")
            return False
    
    # =====================================================
    # Group Operations
    # =====================================================
    
    def get_group_keywords(self, group_name: str) -> Set[str]:
        """Get all keyword UIDs in a group"""
        try:
            key = self._make_key(f"group:{group_name}")
            members = self.redis.smembers(key)
            return {m.decode('utf-8') if isinstance(m, bytes) else m for m in members}
        except Exception as e:
            logger.error(f"Failed to get keywords for group {group_name}: {str(e)}")
            return set()
    
    def get_group_info(self, group_name: str) -> Dict[str, Any]:
        """Get group statistics and information"""
        import math
        
        try:
            # Get keyword IDs in group
            keyword_ids = self.get_group_keywords(group_name)
            
            if not keyword_ids:
                return {
                    'keyword_count': 0,
                    'total_qpm': 0.0,
                    'avg_qpm': 0.0,
                    'avg_diff': 0.0,
                    'max_qpm': 0.0,
                    'min_qpm': 0.0,
                    'keywords': []
                }
            
            # Calculate statistics
            keywords_data = []
            total_qpm = 0.0
            total_diff = 0.0
            qpm_values = []
            
            for uid in keyword_ids:
                keyword_data = self.get_keyword_by_uid(uid)
                if keyword_data:
                    keywords_data.append(keyword_data['Keywords'])
                    qpm = float(keyword_data.get('QPM', 0))
                    diff = float(keyword_data.get('DIFF', 0))
                    
                    # 处理无效的浮点数
                    if math.isnan(qpm) or math.isinf(qpm):
                        qpm = 0.0
                    if math.isnan(diff) or math.isinf(diff):
                        diff = 0.0
                    
                    total_qpm += qpm
                    total_diff += diff
                    qpm_values.append(qpm)
            
            count = len(keywords_data)
            
            # 确保所有计算结果都是有效的浮点数
            avg_qpm = total_qpm / count if count > 0 else 0.0
            avg_diff = total_diff / count if count > 0 else 0.0
            max_qpm = max(qpm_values) if qpm_values else 0.0
            min_qpm = min(qpm_values) if qpm_values else 0.0
            
            # 最后检查所有值
            if math.isnan(avg_qpm) or math.isinf(avg_qpm):
                avg_qpm = 0.0
            if math.isnan(avg_diff) or math.isinf(avg_diff):
                avg_diff = 0.0
            if math.isnan(max_qpm) or math.isinf(max_qpm):
                max_qpm = 0.0
            if math.isnan(min_qpm) or math.isinf(min_qpm):
                min_qpm = 0.0
            if math.isnan(total_qpm) or math.isinf(total_qpm):
                total_qpm = 0.0
            
            return {
                'keywords': keywords_data,
                'keyword_count': count,
                'total_qpm': total_qpm,
                'avg_qpm': avg_qpm,
                'avg_diff': avg_diff,
                'max_qpm': max_qpm,
                'min_qpm': min_qpm
            }
            
        except Exception as e:
            logger.error(f"Failed to get group info for {group_name}: {str(e)}")
            return {}
    
    def get_all_groups(self) -> Set[str]:
        """Get all group names"""
        try:
            key = self._make_key("groups")
            members = self.redis.smembers(key)
            return {m.decode('utf-8') if isinstance(m, bytes) else m for m in members}
        except Exception as e:
            logger.error(f"Failed to get all groups: {str(e)}")
            return set()
    
    def rename_group(self, old_name: str, new_name: str) -> bool:
        """Rename a group"""
        try:
            # Get all keywords in the group
            keyword_ids = self.get_group_keywords(old_name)
            
            if not keyword_ids:
                return False
            
            with self.redis.pipeline() as pipe:
                # Update each keyword's group mapping
                for keyword_id in keyword_ids:
                    keyword_data = self.get_keyword(keyword_id)
                    if keyword_data:
                        keyword_text = keyword_data['Keywords']
                        
                        # Update keyword data
                        pipe.hset(
                            self._make_key(f"keyword:{keyword_id}"),
                            "group_name_map",
                            serialize_for_redis(new_name)
                        )
                        
                        # Update keyword-groups mapping
                        pipe.srem(self._make_key(f"keyword_groups:{keyword_text}"), old_name)
                        pipe.sadd(self._make_key(f"keyword_groups:{keyword_text}"), new_name)
                
                # Rename group keywords set
                pipe.rename(
                    self._make_key(f"group:{old_name}:keywords"),
                    self._make_key(f"group:{new_name}:keywords")
                )
                
                # Update groups set
                pipe.srem(self._make_key("groups"), old_name)
                pipe.sadd(self._make_key("groups"), new_name)
                
                # Update clusters if group is in any cluster
                clusters = self.get_all_clusters()
                for cluster_name in clusters:
                    cluster_groups = self.get_cluster_groups(cluster_name)
                    if old_name in cluster_groups:
                        pipe.srem(self._make_key(f"cluster:{cluster_name}"), old_name)
                        pipe.sadd(self._make_key(f"cluster:{cluster_name}"), new_name)
                
                pipe.execute()
            
            logger.info(f"Renamed group '{old_name}' to '{new_name}'")
            return True
            
        except Exception as e:
            logger.error(f"Failed to rename group '{old_name}' to '{new_name}': {str(e)}")
            return False
    
    # =====================================================
    # Cluster Operations
    # =====================================================
    
    def create_cluster(self, cluster_name: str, group_names: List[str]) -> bool:
        """Create a new cluster"""
        try:
            with self.redis.pipeline() as pipe:
                # Add groups to cluster
                cluster_key = self._make_key(f"cluster:{cluster_name}")
                for group_name in group_names:
                    pipe.sadd(cluster_key, group_name)
                
                # Add cluster to clusters set
                pipe.sadd(self._make_key("clusters"), cluster_name)
                
                # Set expiry
                pipe.expire(cluster_key, self.redis_manager.key_expiry)
                
                pipe.execute()
            
            logger.info(f"Created cluster '{cluster_name}' with {len(group_names)} groups")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create cluster '{cluster_name}': {str(e)}")
            return False
    
    def get_cluster_groups(self, cluster_name: str) -> Set[str]:
        """Get all group names in a cluster"""
        try:
            key = self._make_key(f"cluster:{cluster_name}")
            members = self.redis.smembers(key)
            return {m.decode('utf-8') if isinstance(m, bytes) else m for m in members}
        except Exception as e:
            logger.error(f"Failed to get groups for cluster {cluster_name}: {str(e)}")
            return set()
    
    def get_all_clusters(self) -> Set[str]:
        """Get all cluster names"""
        try:
            key = self._make_key("clusters")
            members = self.redis.smembers(key)
            return {m.decode('utf-8') if isinstance(m, bytes) else m for m in members}
        except Exception as e:
            logger.error(f"Failed to get all clusters: {str(e)}")
            return set()
    
    def get_all_files(self) -> Set[str]:
        """Get all imported file names"""
        try:
            key = self._make_key("files")
            members = self.redis.smembers(key)
            return {m.decode('utf-8') if isinstance(m, bytes) else m for m in members}
        except Exception as e:
            logger.error(f"Failed to get all files: {str(e)}")
            return set()
    
    def get_file_keywords(self, filename: str) -> Set[str]:
        """Get all keyword UIDs from a specific file"""
        try:
            key = self._make_key(f"file:{filename}")
            members = self.redis.smembers(key)
            return {m.decode('utf-8') if isinstance(m, bytes) else m for m in members}
        except Exception as e:
            logger.error(f"Failed to get keywords for file {filename}: {str(e)}")
            return set()
    
    def update_cluster(self, cluster_name: str, group_names: List[str]) -> bool:
        """Update cluster group membership"""
        try:
            cluster_key = self._make_key(f"cluster:{cluster_name}")
            
            with self.redis.pipeline() as pipe:
                # Clear existing groups
                pipe.delete(cluster_key)
                
                # Add new groups
                for group_name in group_names:
                    pipe.sadd(cluster_key, group_name)
                
                # Set expiry
                pipe.expire(cluster_key, self.redis_manager.key_expiry)
                
                pipe.execute()
            
            logger.info(f"Updated cluster '{cluster_name}' with {len(group_names)} groups")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update cluster '{cluster_name}': {str(e)}")
            return False
    
    # =====================================================
    # Analysis Operations
    # =====================================================
    
    def get_duplicate_keywords(self) -> Dict[str, List[str]]:
        """Get keywords that appear in multiple groups"""
        try:
            duplicates = {}
            keyword_groups_map = {}  # keyword_text -> [group1, group2, ...]
            
            # 遍历所有关键词键，构建关键词到组的映射
            pattern = self._make_key("kw:*")
            keys = self.redis.keys(pattern)
            
            for key in keys:
                try:
                    # 获取关键词数据
                    data = self.redis.hgetall(key)
                    if data:
                        # 解码关键词文本和组名
                        keyword_text = data.get(b'Keywords', b'').decode('utf-8').strip('"').lower()
                        group_name = data.get(b'group_name_map', b'').decode('utf-8').strip('"')
                        
                        if keyword_text and group_name:
                            if keyword_text not in keyword_groups_map:
                                keyword_groups_map[keyword_text] = []
                            if group_name not in keyword_groups_map[keyword_text]:
                                keyword_groups_map[keyword_text].append(group_name)
                except Exception as e:
                    logger.warning(f"Failed to process key {key}: {str(e)}")
                    continue
            
            # 找出出现在多个组中的关键词
            for keyword_text, groups in keyword_groups_map.items():
                if len(groups) > 1:
                    duplicates[keyword_text] = groups
            
            return duplicates
            
        except Exception as e:
            logger.error(f"Failed to get duplicate keywords: {str(e)}")
            return {}
    
    def get_duplicate_keywords_analysis(self) -> Dict[str, Any]:
        """Get detailed analysis of duplicate keywords"""
        import math
        
        try:
            duplicates = self.get_duplicate_keywords()
            duplicate_details = []
            
            for keyword_text, groups in duplicates.items():
                keyword_data = []
                total_qpm = 0.0
                
                for group_name in groups:
                    # 在该组中查找匹配的关键词
                    group_uids = self.get_group_keywords(group_name)
                    
                    for uid in group_uids:
                        kdata = self.get_keyword_by_uid(uid)
                        if kdata:
                            stored_keyword = kdata.get('Keywords', '').lower()
                            if stored_keyword == keyword_text:
                                qpm = float(kdata.get('QPM', 0))
                                diff = float(kdata.get('DIFF', 0))
                                
                                # 处理无效的浮点数
                                if math.isnan(qpm) or math.isinf(qpm):
                                    qpm = 0.0
                                if math.isnan(diff) or math.isinf(diff):
                                    diff = 0.0
                                
                                keyword_data.append({
                                    "group": group_name,
                                    "qpm": qpm,
                                    "diff": diff,
                                    "uid": uid
                                })
                                total_qpm += qpm
                                break
                
                if keyword_data:
                    duplicate_details.append({
                        "keyword": keyword_text,
                        "groups": keyword_data,
                        "group_count": len(keyword_data),
                        "total_qpm": total_qpm
                    })
            
            # Sort by group count and QPM
            duplicate_details.sort(key=lambda x: (x['group_count'], x['total_qpm']), reverse=True)
            
            return {
                "total_duplicates": len(duplicate_details),
                "details": duplicate_details
            }
            
        except Exception as e:
            logger.error(f"Failed to get duplicate keywords analysis: {str(e)}")
            return {"total_duplicates": 0, "details": []}
    
    # =====================================================
    # Bulk Operations
    # =====================================================
    
    def bulk_create_keywords_with_uids(self, keywords_data: List[Dict[str, Any]], filename: str = "") -> List[str]:
        """Create multiple keywords in a batch using UIDs"""
        try:
            uids = []
            
            with self.redis.pipeline() as pipe:
                for keyword_data in keywords_data:
                    keyword_text = keyword_data['Keywords']
                    group_name = keyword_data['group_name_map']
                    cluster_name = keyword_data.get('cluster_name', '')
                    
                    # Generate deterministic UID
                    from app.core.keystore.keystore_processor_redis import KeystoreProcessorRedis
                    uid = KeystoreProcessorRedis.generate_keyword_uid(keyword_text, group_name, cluster_name)
                    
                    # Store keyword data
                    keyword_key = self._make_key(f"kw:{uid}")
                    keyword_data['uid'] = uid
                    keyword_data['created_at'] = datetime.now().isoformat()
                    if filename:
                        keyword_data['source_file'] = filename
                    
                    # Store keyword hash
                    pipe.hset(keyword_key, mapping={
                        k: serialize_for_redis(v) for k, v in keyword_data.items()
                    })
                    
                    # Add to global sets
                    pipe.sadd(self._make_key("groups"), group_name)
                    pipe.sadd(self._make_key(f"group:{group_name}"), uid)
                    
                    if cluster_name:
                        pipe.sadd(self._make_key("clusters"), cluster_name)
                        pipe.sadd(self._make_key(f"cluster:{cluster_name}"), group_name)
                    
                    if filename:
                        pipe.sadd(self._make_key("files"), filename)
                        pipe.sadd(self._make_key(f"file:{filename}"), uid)
                    
                    # Set expiry
                    pipe.expire(keyword_key, self.redis_manager.key_expiry)
                    
                    uids.append(uid)
                
                pipe.execute()
            
            logger.info(f"Bulk created {len(uids)} keywords")
            return uids
            
        except Exception as e:
            logger.error(f"Failed to bulk create keywords: {str(e)}")
            return []
    
    def clear_all_data(self) -> bool:
        """Clear all keystore data"""
        return self.redis_manager.clear_all_keystore_data()
    
    def get_global_stats(self) -> Dict[str, Any]:
        """Get global statistics"""
        import math
        
        try:
            total_groups = self.redis.scard(self._make_key("groups"))
            total_clusters = self.redis.scard(self._make_key("clusters"))
            
            # Calculate total keywords and QPM across all groups
            total_keywords = 0
            total_qpm = 0.0
            
            # Get all group names
            groups = self.redis.smembers(self._make_key("groups"))
            for group in groups:
                if isinstance(group, bytes):
                    group = group.decode('utf-8')
                
                # Get UIDs in this group
                group_uids = self.redis.smembers(self._make_key(f"group:{group}"))
                total_keywords += len(group_uids)
                
                for uid in group_uids:
                    if isinstance(uid, bytes):
                        uid = uid.decode('utf-8')
                    keyword_data = self.get_keyword_by_uid(uid)
                    if keyword_data:
                        qpm = float(keyword_data.get('QPM', 0))
                        # 处理无效的浮点数
                        if math.isnan(qpm) or math.isinf(qpm):
                            qpm = 0.0
                        total_qpm += qpm
            
            duplicates = self.get_duplicate_keywords()
            
            # 计算平均QPM
            avg_qpm_per_keyword = total_qpm / total_keywords if total_keywords > 0 else 0.0
            
            # 确保所有浮点数都是有效的
            if math.isnan(total_qpm) or math.isinf(total_qpm):
                total_qpm = 0.0
            if math.isnan(avg_qpm_per_keyword) or math.isinf(avg_qpm_per_keyword):
                avg_qpm_per_keyword = 0.0
            
            return {
                "total_keywords": total_keywords,
                "total_groups": total_groups,
                "total_clusters": total_clusters,
                "total_qpm": total_qpm,
                "duplicate_keywords": len(duplicates),
                "avg_qpm_per_keyword": avg_qpm_per_keyword,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get global stats: {str(e)}")
            return {}