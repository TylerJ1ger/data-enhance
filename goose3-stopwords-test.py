"""
测试 Goose3 库可用的停用词类
"""
import importlib
import traceback

print("=== Goose3 停用词类测试 ===")

# 检查 goose3 是否可用
try:
    import goose3
    print(f"✓ Goose3 库已安装，版本: {getattr(goose3, '__version__', '未知')}")
except ImportError:
    print("✗ Goose3 库未安装")
    exit(1)

# 检查 goose3.text 模块中的类
print("\n可用的停用词类:")

stopwords_classes = [
    "StopWords",
    "StopWordsArabic",
    "StopWordsChinese",
    "StopWordsDutch",
    "StopWordsEnglish",
    "StopWordsFinnish", 
    "StopWordsFrench",
    "StopWordsGerman",
    "StopWordsHindi",
    "StopWordsHungarian",
    "StopWordsIndonesian",
    "StopWordsItalian",
    "StopWordsJapanese",
    "StopWordsKorean",
    "StopWordsNorwegian",
    "StopWordsPersian",
    "StopWordsPolish",
    "StopWordsPortuguese",
    "StopWordsRussian",
    "StopWordsSpanish",
    "StopWordsSwedish",
    "StopWordsThai",
    "StopWordsTurkish",
    "StopWordsZh"  # 这个可能不存在
]

for class_name in stopwords_classes:
    try:
        # 动态导入类
        module = importlib.import_module("goose3.text")
        cls = getattr(module, class_name)
        print(f"✓ {class_name} - 可用")
    except (ImportError, AttributeError) as e:
        print(f"✗ {class_name} - 不可用 ({e})")
    except Exception as e:
        print(f"? {class_name} - 错误 ({e})")

print("\n=== 测试完成 ===")
