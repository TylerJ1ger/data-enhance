"""
订单数据处理器 - 支持自定义日期范围和完整功能
backend/app/core/orders/orders_processor.py
"""

import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from .virtual_data_generator import VirtualOrderDataGenerator


class OrdersProcessor:
    """订单数据处理器"""
    
    def __init__(self):
        """初始化订单处理器"""
        self.data = pd.DataFrame()
        self.filtered_data = pd.DataFrame()
        self.generator = VirtualOrderDataGenerator()
        self._last_generation_params = {}
    
    def _ensure_json_serializable(self, data: Any) -> Any:
        """确保数据是JSON可序列化的，处理numpy类型"""
        import numpy as np
        
        if isinstance(data, dict):
            return {k: self._ensure_json_serializable(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._ensure_json_serializable(item) for item in data]
        elif isinstance(data, (np.integer, np.int64, np.int32)):
            return int(data)
        elif isinstance(data, (np.floating, np.float64, np.float32)):
            return float(data)
        elif isinstance(data, np.ndarray):
            return data.tolist()
        elif pd.isna(data):
            return None
        else:
            return data
    
    def _parse_date_range(self, date_range_dict: Dict[str, str]) -> Tuple[datetime, datetime]:
        """
        解析日期范围字典为datetime对象
        
        Args:
            date_range_dict: 包含start_date和end_date的字典
            
        Returns:
            (start_date, end_date) datetime元组
        """
        try:
            start_date_str = date_range_dict.get("start_date")
            end_date_str = date_range_dict.get("end_date")
            
            if not start_date_str or not end_date_str:
                raise ValueError("缺少开始日期或结束日期")
            
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
            
            return start_date, end_date
        except ValueError as e:
            raise ValueError(f"日期格式错误: {str(e)}")
    
    def generate_virtual_data(
        self, 
        count: int, 
        date_range: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        生成虚拟订单数据 - 支持自定义日期范围
        
        Args:
            count: 要生成的订单数量
            date_range: 可选的日期范围字典 {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
            
        Returns:
            生成结果字典
        """
        try:
            # 验证输入参数
            if count <= 0:
                return {
                    "success": False,
                    "message": "数据条数必须大于0"
                }
            
            if count > 10000:
                return {
                    "success": False,
                    "message": "数据条数不能超过10000"
                }
            
            # 处理日期范围
            start_date = None
            end_date = None
            
            if date_range:
                try:
                    start_date, end_date = self._parse_date_range(date_range)
                    
                    # 验证日期范围
                    validation = self.generator.validate_date_range(start_date, end_date)
                    if not validation["valid"]:
                        return {
                            "success": False,
                            "message": f"日期范围验证失败: {'; '.join(validation['errors'])}"
                        }
                except ValueError as e:
                    return {
                        "success": False,
                        "message": str(e)
                    }
            
            # 生成数据
            self.data = self.generator.generate_orders_batch(
                count=count,
                start_date=start_date,
                end_date=end_date
            )
            self.filtered_data = self.data.copy()
            
            # 保存生成参数
            self._last_generation_params = {
                "count": count,
                "date_range": date_range
            }
            
            # 获取统计信息
            stats = self.generator.get_generation_stats(self.data)
            
            # 确保所有数据都是JSON可序列化的
            serializable_stats = self._ensure_json_serializable(stats)
            
            # 构建成功消息
            message = f"成功生成 {len(self.data)} 条虚拟订单数据"
            if date_range:
                message += f"，时间范围：{date_range['start_date']} 至 {date_range['end_date']}"
            
            return {
                "success": True,
                "generated_count": len(self.data),
                "stats": serializable_stats,
                "message": message
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "生成虚拟订单数据失败"
            }
    
    def apply_filters(
        self,
        date_range: Optional[Tuple[str, str]] = None,
        order_types: Optional[List[str]] = None,
        license_ids: Optional[List[int]] = None,
        currencies: Optional[List[str]] = None,
        payment_platforms: Optional[List[str]] = None,
        order_statuses: Optional[List[str]] = None,
        sales_amount_range: Optional[Tuple[float, float]] = None,
        has_coupon: Optional[bool] = None,
        ab_test_filter: Optional[str] = None  # "with", "without", None
    ) -> Dict[str, Any]:
        """应用筛选条件"""
        try:
            if self.data.empty:
                return {
                    "success": False,
                    "message": "没有数据可以筛选，请先生成虚拟数据"
                }
            
            filtered_df = self.data.copy()
            
            # 日期范围筛选
            if date_range:
                start_date, end_date = date_range
                try:
                    filtered_df = filtered_df[
                        (pd.to_datetime(filtered_df["日期"]) >= pd.to_datetime(start_date)) &
                        (pd.to_datetime(filtered_df["日期"]) <= pd.to_datetime(end_date))
                    ]
                except Exception as e:
                    return {
                        "success": False,
                        "message": f"日期范围筛选失败: {str(e)}"
                    }
            
            # 订单类型筛选
            if order_types:
                filtered_df = filtered_df[filtered_df["订单类型"].isin(order_types)]
            
            # License ID筛选
            if license_ids:
                filtered_df = filtered_df[filtered_df["LicenseID"].isin(license_ids)]
            
            # 币种筛选
            if currencies:
                filtered_df = filtered_df[filtered_df["支付币种"].isin(currencies)]
            
            # 支付平台筛选
            if payment_platforms:
                filtered_df = filtered_df[filtered_df["支付平台"].isin(payment_platforms)]
            
            # 订单状态筛选
            if order_statuses:
                filtered_df = filtered_df[filtered_df["订单状态"].isin(order_statuses)]
            
            # 销售总额范围筛选
            if sales_amount_range:
                min_amount, max_amount = sales_amount_range
                filtered_df = filtered_df[
                    (filtered_df["销售总额"] >= min_amount) &
                    (filtered_df["销售总额"] <= max_amount)
                ]
            
            # 优惠券筛选
            if has_coupon is not None:
                if has_coupon:
                    filtered_df = filtered_df[filtered_df["CouponID"].notna()]
                else:
                    filtered_df = filtered_df[filtered_df["CouponID"].isna()]
            
            # AB测试筛选
            if ab_test_filter == "with":
                filtered_df = filtered_df[filtered_df["AB实验ID"].notna()]
            elif ab_test_filter == "without":
                filtered_df = filtered_df[filtered_df["AB实验ID"].isna()]
            
            self.filtered_data = filtered_df
            
            # 计算筛选后的统计信息
            filtered_stats = self.generator.get_generation_stats(self.filtered_data)
            
            # 确保所有数据都是JSON可序列化的
            serializable_stats = self._ensure_json_serializable(filtered_stats)
            
            return {
                "success": True,
                "filtered_count": len(self.filtered_data),
                "filtered_stats": serializable_stats,
                "message": f"筛选完成，共 {len(self.filtered_data)} 条记录"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "应用筛选条件失败"
            }
    
    def get_chart_data(self) -> Dict[str, Any]:
        """获取图表数据 - 优化版本，添加数据验证和错误处理"""
        
        # 🔧 新增：检查数据是否就绪
        if self.filtered_data.empty:
            # 如果筛选数据为空，但原始数据不为空，重新设置筛选数据
            if not self.data.empty:
                self.filtered_data = self.data.copy()
            else:
                return {
                    "charts": {},
                    "error": "没有可用的数据生成图表",
                    "debug_info": {
                        "original_data_empty": self.data.empty,
                        "filtered_data_empty": self.filtered_data.empty
                    }
                }
        
        try:
            df = self.filtered_data.copy()
            
            # 🔧 新增：数据完整性验证
            required_columns = ["订单类型", "日期", "LicenseID", "支付币种", "支付平台", "订单状态", "销售总额"]
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return {
                    "charts": {},
                    "error": f"数据缺少必要字段: {', '.join(missing_columns)}",
                    "debug_info": {
                        "available_columns": list(df.columns),
                        "missing_columns": missing_columns
                    }
                }
            
            # 验证数据不为空
            if len(df) == 0:
                return {
                    "charts": {},
                    "error": "筛选后的数据为空，无法生成图表",
                    "debug_info": {
                        "original_data_count": len(self.data),
                        "filtered_data_count": len(df)
                    }
                }
            
            # 🔧 优化：添加数据类型验证和转换
            try:
                # 确保日期列是datetime类型
                if "日期" in df.columns:
                    df["日期"] = pd.to_datetime(df["日期"])
                
                # 确保数值列是正确的类型
                if "销售总额" in df.columns:
                    df["销售总额"] = pd.to_numeric(df["销售总额"], errors='coerce')
                
                if "LicenseID" in df.columns:
                    df["LicenseID"] = pd.to_numeric(df["LicenseID"], errors='coerce')
                
            except Exception as type_error:
                return {
                    "charts": {},
                    "error": f"数据类型转换失败: {str(type_error)}",
                    "debug_info": {
                        "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()}
                    }
                }
            
            # 1. 订单类型分布（饼图）
            order_type_data = {str(k): int(v) for k, v in df["订单类型"].value_counts().to_dict().items()}
            
            # 2. 每日订单量趋势（折线图）
            df["日期_date"] = df["日期"].dt.date
            daily_orders = df.groupby("日期_date").size().reset_index(name="订单数量")
            daily_orders["日期"] = daily_orders["日期_date"].astype(str)
            # 确保数据类型转换
            daily_orders_data = []
            for _, row in daily_orders.iterrows():
                daily_orders_data.append({
                    "日期": str(row["日期"]),
                    "订单数量": int(row["订单数量"])
                })
            
            # 3. License类型销售分布（柱状图）
            license_stats = df.groupby("LicenseID").agg({
                "订单号": "count",
                "销售总额": "sum"
            }).reset_index()
            license_stats.columns = ["LicenseID", "订单数量", "销售总额"]
            # 确保数据类型转换
            license_stats_data = []
            for _, row in license_stats.iterrows():
                license_stats_data.append({
                    "LicenseID": int(row["LicenseID"]),
                    "订单数量": int(row["订单数量"]),
                    "销售总额": float(row["销售总额"])
                })
            
            # 4. 币种收入分布（饼图）
            currency_revenue = {str(k): float(v) for k, v in df.groupby("支付币种")["销售总额"].sum().to_dict().items()}
            
            # 5. 支付平台分布（柱状图）
            platform_stats = df.groupby("支付平台").agg({
                "订单号": "count",
                "销售总额": "sum"
            }).reset_index()
            platform_stats.columns = ["支付平台", "订单数量", "销售总额"]
            # 确保数据类型转换
            platform_stats_data = []
            for _, row in platform_stats.iterrows():
                platform_stats_data.append({
                    "支付平台": str(row["支付平台"]),
                    "订单数量": int(row["订单数量"]),
                    "销售总额": float(row["销售总额"])
                })
            
            # 6. 订单状态分布（饼图）
            status_distribution = {str(k): int(v) for k, v in df["订单状态"].value_counts().to_dict().items()}
            
            # 7. 优惠券使用情况（柱状图）
            coupon_usage_data = [
                {"category": "有优惠券", "count": int(len(df[df["CouponID"].notna()]))},
                {"category": "无优惠券", "count": int(len(df[df["CouponID"].isna()]))}
            ]
            
            # 8. AB测试参与情况
            ab_test_participation = {
                "参与AB测试": int(len(df[df["AB实验ID"].notna()])),
                "未参与AB测试": int(len(df[df["AB实验ID"].isna()]))
            }
            
            # 🔧 新增：构建图表数据结构
            chart_data = {
                "charts": {
                    "order_type_distribution": {
                        "type": "pie",
                        "title": "订单类型分布",
                        "data": order_type_data
                    },
                    "daily_orders_trend": {
                        "type": "line",
                        "title": "每日订单量趋势",
                        "data": daily_orders_data
                    },
                    "license_sales_distribution": {
                        "type": "bar",
                        "title": "License类型销售分布",
                        "data": license_stats_data
                    },
                    "currency_revenue_distribution": {
                        "type": "pie",
                        "title": "币种收入分布",
                        "data": currency_revenue
                    },
                    "payment_platform_stats": {
                        "type": "bar",
                        "title": "支付平台统计",
                        "data": platform_stats_data
                    },
                    "order_status_distribution": {
                        "type": "pie",
                        "title": "订单状态分布",
                        "data": status_distribution
                    },
                    "coupon_usage": {
                        "type": "bar",
                        "title": "优惠券使用情况",
                        "data": coupon_usage_data
                    },
                    "ab_test_participation": {
                        "type": "pie",
                        "title": "AB测试参与情况",
                        "data": ab_test_participation
                    }
                },
                "metadata": {
                    "data_rows": len(df),
                    "generated_at": datetime.now().isoformat(),
                    "charts_count": 8,
                    "data_source": "filtered" if len(df) != len(self.data) else "original"
                }
            }
            
            # 🔧 新增：验证所有图表都有数据
            empty_charts = []
            for chart_name, chart_config in chart_data["charts"].items():
                chart_data_content = chart_config.get("data")
                if not chart_data_content or (
                    isinstance(chart_data_content, (list, dict)) and len(chart_data_content) == 0
                ):
                    empty_charts.append(chart_name)
            
            if empty_charts:
                chart_data["warning"] = f"以下图表没有数据: {', '.join(empty_charts)}"
            
            # 🔧 新增：添加数据质量信息
            chart_data["data_quality"] = {
                "has_all_required_fields": len(missing_columns) == 0,
                "data_completeness": {
                    "total_records": len(df),
                    "null_counts": {col: int(df[col].isna().sum()) for col in required_columns if col in df.columns}
                },
                "value_ranges": {
                    "sales_amount": {
                        "min": float(df["销售总额"].min()) if "销售总额" in df.columns else None,
                        "max": float(df["销售总额"].max()) if "销售总额" in df.columns else None,
                        "mean": float(df["销售总额"].mean()) if "销售总额" in df.columns else None
                    }
                }
            }
            
            return chart_data
            
        except Exception as e:
            return {
                "charts": {},
                "error": f"生成图表数据时发生错误: {str(e)}",
                "debug_info": {
                    "data_shape": list(self.filtered_data.shape) if not self.filtered_data.empty else "empty",
                    "columns": list(self.filtered_data.columns) if not self.filtered_data.empty else [],
                    "error_type": type(e).__name__,
                    "error_details": str(e)
                }
            }
    
    def export_filtered_data(self) -> bytes:
        """导出筛选后的数据为CSV"""
        if self.filtered_data.empty:
            return b"No data to export"
        
        try:
            # 使用UTF-8编码并添加BOM以确保Excel正确显示中文
            csv_bytes = self.filtered_data.to_csv(index=False, encoding='utf-8-sig').encode('utf-8')
            return csv_bytes
        except Exception as e:
            error_msg = f"导出失败: {str(e)}"
            return error_msg.encode('utf-8')
    
    def get_filter_ranges(self) -> Dict[str, Any]:
        """获取筛选范围"""
        if self.data.empty:
            return {
                "date_range": {
                    "min": "2025-04-01",
                    "max": "2025-05-31"
                },
                "sales_amount_range": {
                    "min": 0,
                    "max": 100
                },
                "available_options": {
                    "order_types": ["新单", "续费"],
                    "license_ids": [1, 2, 3, 4, 5],
                    "currencies": ["usd", "cny", "eur"],
                    "payment_platforms": ["paypal", "stripe"],
                    "order_statuses": ["已付款", "已退款", "取消付款", "付款失败"]
                }
            }
        
        try:
            # 确保所有数据都转换为Python原生类型
            unique_order_types = [str(x) for x in self.data["订单类型"].unique().tolist()]
            unique_license_ids = [int(x) for x in self.data["LicenseID"].unique().tolist()]
            unique_currencies = [str(x) for x in self.data["支付币种"].unique().tolist()]
            unique_payment_platforms = [str(x) for x in self.data["支付平台"].unique().tolist()]
            unique_order_statuses = [str(x) for x in self.data["订单状态"].unique().tolist()]
            
            return {
                "date_range": {
                    "min": str(self.data["日期"].min()),
                    "max": str(self.data["日期"].max())
                },
                "sales_amount_range": {
                    "min": float(self.data["销售总额"].min()),
                    "max": float(self.data["销售总额"].max())
                },
                "available_options": {
                    "order_types": sorted(unique_order_types),
                    "license_ids": sorted(unique_license_ids),
                    "currencies": sorted(unique_currencies),
                    "payment_platforms": sorted(unique_payment_platforms),
                    "order_statuses": sorted(unique_order_statuses)
                }
            }
        except Exception as e:
            return {
                "error": str(e),
                "date_range": {"min": "", "max": ""},
                "sales_amount_range": {"min": 0, "max": 100},
                "available_options": {
                    "order_types": [],
                    "license_ids": [],
                    "currencies": [],
                    "payment_platforms": [],
                    "order_statuses": []
                }
            }
    
    def get_data_summary(self) -> Dict[str, Any]:
        """获取数据摘要"""
        return {
            "total_orders": int(len(self.data)) if not self.data.empty else 0,
            "filtered_orders": int(len(self.filtered_data)) if not self.filtered_data.empty else 0,
            "has_data": not self.data.empty,
            "last_generation_params": self._last_generation_params
        }
    
    def reset_data(self) -> None:
        """重置所有数据"""
        self.data = pd.DataFrame()
        self.filtered_data = pd.DataFrame()
        self._last_generation_params = {}
    
    def get_detailed_statistics(self) -> Dict[str, Any]:
        """获取详细统计信息（可选的额外功能）"""
        if self.filtered_data.empty:
            return {}
        
        try:
            df = self.filtered_data
            
            # 基础统计
            basic_stats = {
                "total_orders": int(len(df)),
                "unique_users": int(df["用户ID"].nunique()),
                "date_range": {
                    "start": str(df["日期"].min()),
                    "end": str(df["日期"].max())
                }
            }
            
            # 收入统计
            revenue_stats = {}
            for currency in df["支付币种"].unique():
                currency_df = df[df["支付币种"] == currency]
                revenue_stats[str(currency)] = {
                    "total_revenue": float(currency_df["销售总额"].sum()),
                    "avg_order_value": float(currency_df["销售总额"].mean()),
                    "order_count": int(len(currency_df)),
                    "max_order": float(currency_df["销售总额"].max()),
                    "min_order": float(currency_df["销售总额"].min())
                }
            
            # License统计
            license_stats = {}
            for license_id in df["LicenseID"].unique():
                license_df = df[df["LicenseID"] == license_id]
                license_stats[int(license_id)] = {
                    "order_count": int(len(license_df)),
                    "total_revenue": float(license_df["销售总额"].sum()),
                    "avg_revenue": float(license_df["销售总额"].mean())
                }
            
            # 时间分析
            df_time = df.copy()
            df_time["日期_datetime"] = pd.to_datetime(df_time["日期"])
            df_time["hour"] = df_time["日期_datetime"].dt.hour
            df_time["weekday"] = df_time["日期_datetime"].dt.dayofweek
            
            time_stats = {
                "hourly_distribution": {str(k): int(v) for k, v in df_time["hour"].value_counts().sort_index().to_dict().items()},
                "weekday_distribution": {str(k): int(v) for k, v in df_time["weekday"].value_counts().sort_index().to_dict().items()},
                "peak_hour": int(df_time["hour"].mode().iloc[0]) if not df_time["hour"].mode().empty else 0,
                "peak_weekday": int(df_time["weekday"].mode().iloc[0]) if not df_time["weekday"].mode().empty else 0
            }
            
            # 优惠券效果分析
            coupon_stats = {
                "coupon_usage_rate": float(len(df[df["CouponID"].notna()]) / len(df) * 100),
                "avg_discount_amount": 0.0,
                "coupon_revenue_impact": 0.0
            }
            
            # AB测试分析
            ab_test_stats = {
                "participation_rate": float(len(df[df["AB实验ID"].notna()]) / len(df) * 100),
                "ab_test_groups": {str(k): int(v) for k, v in df["AB实验ID"].value_counts().to_dict().items()}
            }
            
            return {
                "basic": basic_stats,
                "revenue": revenue_stats,
                "license": license_stats,
                "time": time_stats,
                "coupon": coupon_stats,
                "ab_test": ab_test_stats
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def validate_data_integrity(self) -> Dict[str, Any]:
        """验证数据完整性（可选的质量检查功能）"""
        if self.data.empty:
            return {"is_valid": True, "issues": []}
        
        issues = []
        
        try:
            # 检查必需字段
            required_fields = [
                "订单号", "订单类型", "用户ID", "日期", "产品（PID）", 
                "LicenseID", "SKU", "购物车来源", "支付平台", "支付币种", 
                "支付方式", "销售总额", "订单状态"
            ]
            
            for field in required_fields:
                if field not in self.data.columns:
                    issues.append(f"缺少必需字段: {field}")
                elif self.data[field].isna().any():
                    null_count = int(self.data[field].isna().sum())
                    issues.append(f"字段 {field} 有 {null_count} 个空值")
            
            # 检查订单号唯一性
            if "订单号" in self.data.columns:
                duplicate_orders = int(self.data["订单号"].duplicated().sum())
                if duplicate_orders > 0:
                    issues.append(f"发现 {duplicate_orders} 个重复订单号")
            
            # 检查日期格式
            if "日期" in self.data.columns:
                try:
                    pd.to_datetime(self.data["日期"])
                except:
                    issues.append("日期格式不正确")
            
            # 检查销售总额
            if "销售总额" in self.data.columns:
                negative_amounts = int((self.data["销售总额"] < 0).sum())
                if negative_amounts > 0:
                    issues.append(f"发现 {negative_amounts} 个负的销售总额")
            
            # 检查SKU格式
            if "SKU" in self.data.columns and "产品（PID）" in self.data.columns and "LicenseID" in self.data.columns:
                invalid_sku = 0
                for _, row in self.data.iterrows():
                    expected_sku = f"{row['产品（PID）']}{row['LicenseID']:03d}"
                    if str(row["SKU"]) != expected_sku:
                        invalid_sku += 1
                
                if invalid_sku > 0:
                    issues.append(f"发现 {invalid_sku} 个无效的SKU格式")
            
            return {
                "is_valid": len(issues) == 0,
                "issues": issues,
                "total_records": int(len(self.data)),
                "validation_time": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "is_valid": False,
                "issues": [f"验证过程中发生错误: {str(e)}"],
                "total_records": int(len(self.data)),
                "validation_time": datetime.now().isoformat()
            }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """获取性能指标（新增功能）"""
        try:
            import psutil
            import os
            
            # 内存使用情况
            process = psutil.Process(os.getpid())
            memory_info = process.memory_info()
            
            # 数据大小估算
            data_size = 0
            filtered_data_size = 0
            
            if not self.data.empty:
                data_size = self.data.memory_usage(deep=True).sum()
            
            if not self.filtered_data.empty:
                filtered_data_size = self.filtered_data.memory_usage(deep=True).sum()
            
            return {
                "memory": {
                    "rss": int(memory_info.rss),  # 物理内存使用
                    "vms": int(memory_info.vms),  # 虚拟内存使用
                    "data_memory": int(data_size),  # 数据占用内存
                    "filtered_data_memory": int(filtered_data_size)  # 筛选后数据占用内存
                },
                "data": {
                    "total_rows": int(len(self.data)) if not self.data.empty else 0,
                    "filtered_rows": int(len(self.filtered_data)) if not self.filtered_data.empty else 0,
                    "columns": len(self.data.columns) if not self.data.empty else 0,
                    "data_types": {col: str(dtype) for col, dtype in self.data.dtypes.items()} if not self.data.empty else {}
                },
                "generation_params": self._last_generation_params
            }
        except ImportError:
            return {
                "error": "psutil not available",
                "data": {
                    "total_rows": int(len(self.data)) if not self.data.empty else 0,
                    "filtered_rows": int(len(self.filtered_data)) if not self.filtered_data.empty else 0,
                    "columns": len(self.data.columns) if not self.data.empty else 0
                }
            }
        except Exception as e:
            return {"error": str(e)}
    
    def export_data_sample(self, sample_size: int = 100) -> Dict[str, Any]:
        """导出数据样本用于预览（新增功能）"""
        try:
            if self.filtered_data.empty:
                return {
                    "success": False,
                    "message": "没有数据可以导出样本"
                }
            
            # 获取样本数据
            sample_df = self.filtered_data.head(sample_size)
            
            # 转换为字典格式
            sample_data = []
            for _, row in sample_df.iterrows():
                row_dict = {}
                for col in sample_df.columns:
                    value = row[col]
                    # 确保值是JSON可序列化的
                    if pd.isna(value):
                        row_dict[col] = None
                    else:
                        row_dict[col] = self._ensure_json_serializable(value)
                sample_data.append(row_dict)
            
            return {
                "success": True,
                "sample_size": len(sample_data),
                "total_size": len(self.filtered_data),
                "columns": list(sample_df.columns),
                "data": sample_data
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "导出数据样本失败"
            }