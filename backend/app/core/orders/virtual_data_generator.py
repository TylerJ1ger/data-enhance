# backend/app/core/orders/virtual_data_generator.py
"""
虚拟订单数据生成器 - 修复numpy类型序列化问题
"""

import random
import hashlib
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from decimal import Decimal


class VirtualOrderDataGenerator:
    """虚拟订单数据生成器"""
    
    def __init__(self):
        # 配置数据
        self.order_types = ["新单", "续费"]
        self.product_id = 10001
        self.license_ids = [1, 2, 3, 4, 5]
        self.license_prices = {
            1: 9.99,   # 月度订阅
            2: 19.99,  # 季度订阅
            3: 46.99,  # 年度订阅
            4: 4.99,   # 1000 credit
            5: 14.99   # 5000 credit
        }
        self.coupon_ids = [601, 602, 603]
        self.coupon_discounts = {
            601: 0.10,  # 10% 折扣
            602: 0.20,  # 20% 折扣
            603: 0.30   # 30% 折扣
        }
        self.cart_sources = ["spellai.art", "spellai.ai"]
        self.payment_platforms = ["paypal", "stripe"]
        self.currencies = ["usd", "cny", "eur"]
        self.payment_methods = ["paypal", "credit card"]
        self.ab_test_ids = ["abtest0001a", "abtest0002"]
        self.order_statuses = ["已付款", "已退款", "取消付款", "付款失败"]
        
        # 日期范围：2025年4月至2025年5月
        self.start_date = datetime(2025, 4, 1)
        self.end_date = datetime(2025, 5, 31, 23, 59, 59)
        
        # 用于生成重复用户的用户池
        self.user_pool = []
        self._random_seed_counter = 0
    
    def _generate_hash_id(self, length: int = 10) -> str:
        """生成指定长度的哈希值"""
        # 使用计数器确保更好的随机性
        self._random_seed_counter += 1
        random_string = f"{random.random()}{datetime.now().timestamp()}{self._random_seed_counter}"
        hash_object = hashlib.md5(random_string.encode())
        return hash_object.hexdigest()[:length]
    
    def _generate_user_pool(self, user_count: int) -> None:
        """生成用户池，用于创建重复用户"""
        self.user_pool = [self._generate_hash_id() for _ in range(user_count)]
    
    def _get_random_user_id(self) -> str:
        """从用户池中随机选择一个用户ID"""
        if not self.user_pool:
            # 如果用户池为空，生成一些用户
            self._generate_user_pool(50)
        return random.choice(self.user_pool)
    
    def _generate_random_datetime(self) -> datetime:
        """在指定范围内生成随机日期时间"""
        time_between = self.end_date - self.start_date
        days_between = time_between.days
        hours_between = time_between.total_seconds() / 3600
        
        random_hours = random.randrange(int(hours_between))
        random_datetime = self.start_date + timedelta(hours=random_hours)
        
        # 添加分钟和秒的随机性
        random_minutes = random.randrange(60)
        random_seconds = random.randrange(60)
        
        random_datetime = random_datetime.replace(
            minute=random_minutes,
            second=random_seconds,
            microsecond=0  # 移除微秒以保持数据清洁
        )
        
        return random_datetime
    
    def _generate_sku(self, license_id: int) -> str:
        """基于PID和LicenseID生成SKU"""
        return f"{self.product_id}{license_id:03d}"
    
    def _calculate_sales_amount(self, license_id: int, coupon_id: Optional[int], currency: str) -> float:
        """计算销售总额"""
        base_price = self.license_prices[license_id]
        
        # 应用优惠券折扣
        if coupon_id and coupon_id in self.coupon_discounts:
            discount = self.coupon_discounts[coupon_id]
            base_price = base_price * (1 - discount)
        
        # 根据币种调整价格（简单的汇率转换）
        currency_rates = {
            "usd": 1.0,
            "cny": 7.2,
            "eur": 0.85
        }
        
        final_price = base_price * currency_rates.get(currency, 1.0)
        return round(final_price, 2)
    
    def _get_weighted_order_type(self, user_orders_count: int) -> str:
        """根据用户历史订单数量决定订单类型权重"""
        if user_orders_count == 0:
            # 新用户更可能是新单
            return random.choices(self.order_types, weights=[0.9, 0.1])[0]
        else:
            # 老用户更可能是续费
            return random.choices(self.order_types, weights=[0.3, 0.7])[0]
    
    def _get_weighted_license_id(self, order_type: str) -> int:
        """根据订单类型决定License ID权重"""
        if order_type == "新单":
            # 新单更倾向于选择月度订阅或Credit包
            weights = [0.4, 0.15, 0.1, 0.2, 0.15]  # 对应License ID 1-5
        else:
            # 续费更倾向于选择长期订阅
            weights = [0.2, 0.3, 0.4, 0.05, 0.05]  # 对应License ID 1-5
        
        return random.choices(self.license_ids, weights=weights)[0]
    
    def _get_weighted_payment_method(self, payment_platform: str) -> str:
        """根据支付平台决定支付方式"""
        if payment_platform == "paypal":
            return "paypal"
        else:  # stripe
            return "credit card"
    
    def _get_weighted_order_status(self, payment_platform: str, has_coupon: bool) -> str:
        """根据支付平台和是否有优惠券决定订单状态权重"""
        base_success_rate = 0.85
        
        # PayPal通常成功率更高
        if payment_platform == "paypal":
            base_success_rate += 0.05
        
        # 有优惠券的订单成功率可能稍低（可能是欺诈）
        if has_coupon:
            base_success_rate -= 0.02
        
        # 确保概率在合理范围内
        base_success_rate = max(0.75, min(0.95, base_success_rate))
        
        fail_rate = (1 - base_success_rate) / 3  # 平均分配给三种失败状态
        
        weights = [base_success_rate, fail_rate, fail_rate, fail_rate]
        return random.choices(self.order_statuses, weights=weights)[0]
    
    def generate_single_order(self, user_orders_tracker: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        """生成单个订单数据"""
        if user_orders_tracker is None:
            user_orders_tracker = {}
        
        # 基本信息
        order_id = self._generate_hash_id()
        user_id = self._get_random_user_id()
        
        # 跟踪用户订单数量
        user_orders_count = user_orders_tracker.get(user_id, 0)
        order_type = self._get_weighted_order_type(user_orders_count)
        user_orders_tracker[user_id] = user_orders_count + 1
        
        order_date = self._generate_random_datetime()
        
        # 产品信息 - 根据订单类型选择License
        license_id = self._get_weighted_license_id(order_type)
        sku = self._generate_sku(license_id)
        
        # 优惠券（70%概率有优惠券，但新单概率更高）
        coupon_probability = 0.8 if order_type == "新单" else 0.6
        coupon_id = random.choice(self.coupon_ids) if random.random() < coupon_probability else None
        
        # 来源和支付信息
        cart_source = random.choice(self.cart_sources)
        payment_platform = random.choice(self.payment_platforms)
        currency = random.choice(self.currencies)
        payment_method = self._get_weighted_payment_method(payment_platform)
        
        # AB测试（50%概率参与）
        ab_test_id = random.choice(self.ab_test_ids) if random.random() < 0.5 else None
        
        # 销售总额
        sales_amount = self._calculate_sales_amount(license_id, coupon_id, currency)
        
        # 订单状态 - 根据多个因素决定
        order_status = self._get_weighted_order_status(payment_platform, coupon_id is not None)
        
        return {
            "订单号": order_id,
            "订单类型": order_type,
            "用户ID": user_id,
            "日期": order_date.strftime("%Y-%m-%d %H:%M:%S"),
            "产品（PID）": self.product_id,
            "LicenseID": license_id,
            "SKU": sku,
            "CouponID": coupon_id,
            "购物车来源": cart_source,
            "支付平台": payment_platform,
            "支付币种": currency,
            "支付方式": payment_method,
            "AB实验ID": ab_test_id,
            "销售总额": sales_amount,
            "订单状态": order_status
        }
    
    def generate_orders_batch(self, count: int) -> pd.DataFrame:
        """批量生成订单数据"""
        # 先生成用户池，确保有重复用户
        user_count = max(10, count // 5)  # 用户数约为订单数的1/5
        self._generate_user_pool(user_count)
        
        orders = []
        used_order_ids = set()
        user_orders_tracker = {}  # 跟踪每个用户的订单数量
        
        # 添加进度跟踪（可选）
        batch_size = 1000
        batches = (count + batch_size - 1) // batch_size
        
        for batch_idx in range(batches):
            batch_start = batch_idx * batch_size
            batch_end = min((batch_idx + 1) * batch_size, count)
            batch_count = batch_end - batch_start
            
            for i in range(batch_count):
                order = self.generate_single_order(user_orders_tracker)
                
                # 确保订单号唯一
                max_retries = 10
                retry_count = 0
                while order["订单号"] in used_order_ids and retry_count < max_retries:
                    order["订单号"] = self._generate_hash_id()
                    retry_count += 1
                
                if retry_count >= max_retries:
                    # 如果重试次数过多，强制生成一个带时间戳的ID
                    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                    order["订单号"] = self._generate_hash_id(6) + timestamp[-4:]
                
                used_order_ids.add(order["订单号"])
                orders.append(order)
        
        # 将订单按日期排序，更符合真实场景
        df = pd.DataFrame(orders)
        if not df.empty:
            df['日期_sort'] = pd.to_datetime(df['日期'])
            df = df.sort_values('日期_sort').drop('日期_sort', axis=1).reset_index(drop=True)
        
        return df
    
    def get_generation_stats(self, df: pd.DataFrame) -> Dict[str, Any]:
        """获取生成数据的统计信息 - 修复numpy类型序列化问题"""
        if df.empty:
            return {}
        
        # 基本统计 - 确保所有数值都转换为Python原生类型
        stats = {
            "total_orders": int(len(df)),
            "unique_users": int(df["用户ID"].nunique()),
            "date_range": {
                "start": df["日期"].min(),
                "end": df["日期"].max()
            },
            "order_types": {str(k): int(v) for k, v in df["订单类型"].value_counts().to_dict().items()},
            "license_distribution": {str(k): int(v) for k, v in df["LicenseID"].value_counts().to_dict().items()},
            "currency_distribution": {str(k): int(v) for k, v in df["支付币种"].value_counts().to_dict().items()},
            "status_distribution": {str(k): int(v) for k, v in df["订单状态"].value_counts().to_dict().items()},
        }
        
        # 计算各币种收入 - 确保转换为Python float类型
        total_revenue = {}
        avg_order_value = {}
        
        for currency in df["支付币种"].unique():
            currency_df = df[df["支付币种"] == currency]
            total_revenue[str(currency)] = float(currency_df["销售总额"].sum())
            avg_order_value[str(currency)] = float(currency_df["销售总额"].mean())
        
        stats["total_revenue"] = total_revenue
        stats["avg_order_value"] = avg_order_value
        
        # 添加其他有用的统计信息 - 确保类型转换
        stats["coupon_usage_rate"] = float((df["CouponID"].notna().sum() / len(df)) * 100)
        stats["ab_test_participation_rate"] = float((df["AB实验ID"].notna().sum() / len(df)) * 100)
        stats["success_rate"] = float((df["订单状态"] == "已付款").sum() / len(df) * 100)
        
        # 用户行为统计 - 确保类型转换
        user_order_counts = df["用户ID"].value_counts()
        stats["user_behavior"] = {
            "avg_orders_per_user": float(user_order_counts.mean()),
            "max_orders_per_user": int(user_order_counts.max()),
            "repeat_customers": int((user_order_counts > 1).sum()),
            "repeat_customer_rate": float((user_order_counts > 1).sum() / len(user_order_counts) * 100)
        }
        
        return stats
    
    def validate_generated_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """验证生成的数据质量"""
        validation_results = {
            "is_valid": True,
            "warnings": [],
            "errors": []
        }
        
        if df.empty:
            validation_results["errors"].append("生成的数据为空")
            validation_results["is_valid"] = False
            return validation_results
        
        # 检查订单号唯一性
        if df["订单号"].duplicated().any():
            validation_results["errors"].append("存在重复的订单号")
            validation_results["is_valid"] = False
        
        # 检查必需字段
        required_fields = ["订单号", "订单类型", "用户ID", "日期", "产品（PID）", "LicenseID", "SKU"]
        for field in required_fields:
            if df[field].isna().any():
                validation_results["errors"].append(f"字段 {field} 包含空值")
                validation_results["is_valid"] = False
        
        # 检查数据类型
        if not df["销售总额"].dtype in ['float64', 'int64']:
            validation_results["warnings"].append("销售总额字段数据类型可能不正确")
        
        # 检查日期范围
        date_series = pd.to_datetime(df["日期"])
        if date_series.min() < self.start_date or date_series.max() > self.end_date:
            validation_results["warnings"].append("部分日期超出预期范围")
        
        # 检查数据分布合理性
        success_rate = (df["订单状态"] == "已付款").sum() / len(df)
        if success_rate < 0.7 or success_rate > 0.95:
            validation_results["warnings"].append(f"订单成功率 {success_rate:.2%} 可能不太合理")
        
        return validation_results