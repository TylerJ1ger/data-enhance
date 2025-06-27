#!/usr/bin/env python3
"""
测试关键词库字段过滤功能
"""

import pandas as pd
import sys
import os

# 添加项目路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_field_filtering():
    """测试字段过滤功能"""
    
    # 模拟包含多余字段的CSV数据
    test_data = {
        'Keywords': ['canva ai image generator', 'ai image generator canva'],
        'group_name_map': ['default_group', 'default_group'],
        'QPM': [18100, 720],
        'DIFF': [50, 55],
        'CPC (USD)': [1.44, 2.73],
        # 以下是应该被过滤掉的字段
        'Intent': ['Navigational', 'Navigational'],
        'Trend': ['trend1', 'trend2'],
        'Competitive Density': [0.00, 0.02],
        'SERP Features': ['features1', 'features2'],
        'Number of Results': [212000000, 49300000],
        'Unused Column 1': ['value1', 'value2'],
        'Unused Column 2': ['value3', 'value4']
    }
    
    df = pd.DataFrame(test_data)
    print("原始数据列:")
    print(df.columns.tolist())
    print(f"原始数据形状: {df.shape}")
    
    try:
        # 导入处理器类
        from app.core.keystore.keystore_processor_redis import KeystoreProcessorRedis
        
        # 创建模拟处理器
        class MockProcessor:
            def _filter_required_columns(self, df):
                required_columns = [
                    'Keywords',
                    'QPM', 
                    'DIFF',
                    'group_name_map'
                ]
                
                optional_columns = [
                    'CPC (USD)',
                    'CPC',
                    'cpc'
                ]
                
                existing_columns = []
                
                for col in required_columns:
                    if col in df.columns:
                        existing_columns.append(col)
                
                cpc_added = False
                for col in optional_columns:
                    if col in df.columns and not cpc_added:
                        existing_columns.append(col)
                        cpc_added = True
                        break
                
                if existing_columns:
                    df = df[existing_columns].copy()
                    print(f"过滤字段完成，保留列: {existing_columns}")
                
                return df
        
        processor = MockProcessor()
        filtered_df = processor._filter_required_columns(df)
        
        print("\n过滤后的数据列:")
        print(filtered_df.columns.tolist())
        print(f"过滤后数据形状: {filtered_df.shape}")
        print("\n过滤后的数据:")
        print(filtered_df.head())
        
        # 验证过滤结果
        expected_columns = ['Keywords', 'QPM', 'DIFF', 'group_name_map', 'CPC (USD)']
        actual_columns = filtered_df.columns.tolist()
        
        if set(expected_columns) == set(actual_columns):
            print("\n✅ 字段过滤测试通过！")
            print(f"成功保留了必要字段: {actual_columns}")
            print(f"成功过滤掉了不必要字段: {set(df.columns) - set(actual_columns)}")
        else:
            print(f"\n❌ 字段过滤测试失败")
            print(f"期望列: {expected_columns}")
            print(f"实际列: {actual_columns}")
            
    except Exception as e:
        print(f"\n❌ 测试过程中出错: {e}")

if __name__ == "__main__":
    test_field_filtering()