"""
NLTK英文停用词测试脚本
用于验证NLTK英文停用词的访问和新实现的NLTKStopWordsEnglish类
"""
import os
import sys
import logging
import traceback

# 设置详细日志
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('nltk-stopwords-test')

print("=== NLTK英文停用词测试 ===")

# 检查NLTK是否安装
try:
    import nltk
    print(f"✓ NLTK库已安装，版本: {nltk.__version__}")
except ImportError:
    print("✗ NLTK库未安装")
    print("  请使用 pip install nltk 安装")
    sys.exit(1)

# 检查NLTK数据目录
nltk_data_path = nltk.data.path
print(f"\nNLTK数据目录:")
for path in nltk_data_path:
    if os.path.exists(path):
        print(f"✓ {path} (存在)")
    else:
        print(f"✗ {path} (不存在)")

# 检查stopwords数据包是否下载
try:
    nltk.data.find('corpora/stopwords')
    print("\n✓ stopwords语料库已下载")
except LookupError:
    print("\n✗ stopwords语料库未下载")
    print("  正在下载stopwords语料库...")
    nltk.download('stopwords')
    try:
        nltk.data.find('corpora/stopwords')
        print("✓ stopwords语料库下载成功")
    except LookupError:
        print("✗ stopwords语料库下载失败")
        sys.exit(1)

# 检查英文停用词文件
try:
    from nltk.corpus import stopwords
    languages = stopwords.fileids()
    print(f"\n可用的停用词语言: {', '.join(languages)}")
    
    if 'english' in languages:
        english_stopwords = stopwords.words('english')
        print(f"\n✓ 英文停用词可用，共 {len(english_stopwords)} 个")
        print(f"  示例: {', '.join(english_stopwords[:10])}...")
    else:
        print("\n✗ 英文停用词不可用")
except Exception as e:
    print(f"\n✗ 访问停用词时出错: {e}")
    print(traceback.format_exc())

# 测试自定义NLTKStopWordsEnglish类
print("\n=== 测试NLTKStopWordsEnglish类 ===")

try:
    # 动态导入，为了避免依赖错误
    code = '''
from goose3.text import StopWords

class NLTKStopWordsEnglish:
    """基于NLTK英文停用词的自定义类"""
    
    def __init__(self):
        # 初始化停用词集合
        self.STOP_WORDS = set()
        
        # 尝试导入NLTK停用词
        try:
            import nltk
            from nltk.corpus import stopwords
            
            # 确保停用词已下载
            try:
                nltk.data.find('corpora/stopwords')
                print("NLTK停用词数据已找到")
            except LookupError:
                print("下载NLTK英文停用词...")
                nltk.download('stopwords', quiet=True)
            
            # 获取NLTK英文停用词
            self.STOP_WORDS = set(stopwords.words('english'))
            print(f"已加载 {len(self.STOP_WORDS)} 个NLTK英文停用词")
            
        except (ImportError, LookupError) as e:
            # 导入失败时使用基本英文停用词列表
            print(f"无法加载NLTK停用词: {str(e)}，使用预定义的停用词列表")
            self.STOP_WORDS = self._get_default_stopwords()
        
        # 添加额外的内容相关停用词
        self._add_extra_stopwords()
    
    def _get_default_stopwords(self):
        """获取默认的英文停用词列表"""
        return set([
            'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
            'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
            'between', 'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down',
            'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
            'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i',
            'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'me', 'more', 'most', 'my',
            'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
            'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
            'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
            'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
            'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
            'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself',
            'yourselves'
        ])
    
    def _add_extra_stopwords(self):
        """添加额外的内容相关停用词"""
        extra_stopwords = {
            'article', 'content', 'page', 'website', 'blog', 'post', 'author', 'date',
            'published', 'updated', 'comments', 'copyright', 'rights', 'reserved',
            'read', 'more', 'share', 'like', 'follow', 'subscribe', 'menu', 'search'
        }
        self.STOP_WORDS.update(extra_stopwords)
    
    # 这个方法是必要的，因为Goose3的StopWords类需要它
    def get_stopword_count(self, content):
        """获取内容中停用词的数量"""
        if not content:
            return 0
        
        count = 0
        # 统计内容中停用词的数量
        for word in content.split():
            if word.lower() in self.STOP_WORDS:
                count += 1
        
        return count
    
    # 这个方法是必要的，因为Goose3的StopWords类会调用它
    def remove_punctuation(self, content):
        """移除内容中的标点符号"""
        if not content:
            return ''
        
        import re
        # 使用正则表达式删除标点符号
        return re.sub(r'[^\w\s]', '', content)

# 测试我们的类
try:
    # 确保goose3已安装
    import goose3
    from goose3.text import StopWords
    
    # 测试NLTKStopWordsEnglish类
    nltk_stopwords = NLTKStopWordsEnglish()
    stopword_count = nltk_stopwords.STOP_WORDS
    print(f"NLTK英文停用词数量: {len(stopword_count)}")
    
    # 创建一个适配goose3的StopWords类
    class GooseStopWordsEnglish(StopWords):
        def __init__(self):
            super(GooseStopWordsEnglish, self).__init__()
            # 使用我们的NLTK停用词
            self.STOP_WORDS = nltk_stopwords.STOP_WORDS
    
    # 测试我们的适配类
    goose_stopwords = GooseStopWordsEnglish()
    
    # 测试计数方法
    test_text = "This is a test text with some common English words that are typically stop words"
    count = goose_stopwords.get_stopword_count(test_text)
    print(f"测试文本中的停用词数量: {count}")
    
    print("✓ NLTKStopWordsEnglish和GooseStopWordsEnglish类测试成功!")
    
except ImportError as e:
    print(f"✗ goose3库不可用: {e}")
    print("  请使用 pip install goose3 安装")
except Exception as e:
    print(f"✗ 测试类时出错: {e}")
    print(traceback.format_exc())
'''
    
    # 执行代码
    try:
        import goose3
        print("✓ goose3库已安装")
        exec(code)
    except ImportError:
        print("✗ goose3库未安装，无法执行完整测试")
        print("  请使用 pip install goose3 安装")
except Exception as e:
    print(f"✗ 执行测试代码时出错: {e}")
    print(traceback.format_exc())

print("\n=== 测试完成 ===")
