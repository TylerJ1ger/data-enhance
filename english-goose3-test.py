"""
修改后的 Goose3 测试脚本 - 使用英语配置
"""
import sys
import traceback
from pathlib import Path
import logging

# 设置详细日志
logging.basicConfig(level=logging.DEBUG)

# 构建测试 HTML 文件路径
test_html_path = Path(__file__).parent / "goose3_test_english.html"

# 创建一个具有丰富结构的英文测试 HTML 文件
with open(test_html_path, "w", encoding="utf-8") as f:
    f.write("""
<!DOCTYPE html>
<html>
<head>
    <title>Goose3 Complete Test Page</title>
    <meta charset="utf-8">
    <meta name="description" content="This is a page for testing Goose3 content extraction abilities">
</head>
<body>
    <header>
        <nav>
            <ul>
                <li><a href="#">Home</a></li>
                <li><a href="#">About</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <article>
            <h1>Test Article Title</h1>
            <div class="meta">
                <span>Published: 2025-05-18</span>
                <span>Author: Test User</span>
            </div>
            
            <div class="content">
                <p>This is the first paragraph for testing Goose3 content extraction. This content should be correctly identified as the main content of the article.</p>
                
                <p>This is the second paragraph with more text content. Goose3 should be able to extract these paragraphs and maintain their integrity. This is a relatively long paragraph containing enough text to ensure Goose3 can correctly identify paragraph boundaries.</p>
                
                <h2>Subtitle Test</h2>
                
                <p>This is the paragraph content under the subtitle, testing whether Goose3 can preserve the document structure information.</p>
                
                <ul>
                    <li>List item 1</li>
                    <li>List item 2</li>
                    <li>List item 3</li>
                </ul>
            </div>
        </article>
    </main>
    
    <aside>
        <h3>Related Articles</h3>
        <ul>
            <li><a href="#">Recommended Article 1</a></li>
            <li><a href="#">Recommended Article 2</a></li>
        </ul>
    </aside>
    
    <footer>
        <p>Footer Content © 2025 Test Website</p>
    </footer>
</body>
</html>
    """)

print(f"测试 HTML 文件已创建：{test_html_path}")

# 测试基础 Goose3 提取
try:
    print("\n=== 测试基础 Goose3 提取 ===")
    from goose3 import Goose
    
    with open(test_html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    
    print("1. 默认配置测试")
    g = Goose()
    article = g.extract(raw_html=html_content)
    g.close()
    
    print(f"标题: {article.title}")
    print(f"描述: {article.meta_description}")
    print(f"内容: {'<empty>' if not article.cleaned_text else article.cleaned_text[:150] + '...' if len(article.cleaned_text) > 150 else article.cleaned_text}")
    print(f"内容长度: {len(article.cleaned_text) if article.cleaned_text else 0} 字符")
    
    print("\n2. 英语优化配置测试")
    # 检查可用的停用词类
    available_stopwords = []
    try:
        from goose3.text import StopWords
        available_stopwords.append("StopWords (基类)")
    except ImportError:
        pass
    
    try:
        from goose3.text import StopWordsEnglish
        available_stopwords.append("StopWordsEnglish")
    except ImportError:
        pass
    
    try:
        from goose3.text import StopWordsChinese
        available_stopwords.append("StopWordsChinese")
    except ImportError:
        pass
    
    print(f"可用的停用词类: {', '.join(available_stopwords)}")
    
    # 使用适当的停用词类
    try:
        from goose3.text import StopWordsEnglish
        stopwords_class = StopWordsEnglish
    except ImportError:
        # 回退到基类
        from goose3.text import StopWords
        stopwords_class = StopWords
    
    g = Goose({
        'browser_user_agent': 'Mozilla/5.0',
        'parser_class': 'soup',
        'enable_image_fetching': False,
        'use_meta_language': False,
        'target_language': 'en',  # 英语
        'stopwords_class': stopwords_class,
    })
    article = g.extract(raw_html=html_content)
    g.close()
    
    print(f"标题: {article.title}")
    print(f"描述: {article.meta_description}")
    print(f"内容: {'<empty>' if not article.cleaned_text else article.cleaned_text[:150] + '...' if len(article.cleaned_text) > 150 else article.cleaned_text}")
    print(f"内容长度: {len(article.cleaned_text) if article.cleaned_text else 0} 字符")
    
except Exception as e:
    print(f"✗ 基础测试失败: {e}")
    print(traceback.format_exc())

# 测试增强的内容提取方法
try:
    print("\n=== 测试增强内容提取方法 ===")
    from goose3 import Goose
    from bs4 import BeautifulSoup
    
    with open(test_html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    
    # 1. 使用 BeautifulSoup 预处理
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 2. 为内容区域添加标记
    article_content = soup.find(['article', '.content'])
    if not article_content:
        # 尝试查找最可能的内容区域
        for elem in soup.find_all(['div', 'section']):
            if len(elem.find_all('p')) > 2:
                # 添加 article 标记以帮助 Goose3 识别
                elem['data-goose-article'] = 'true'
                break
    
    # 3. 重新生成 HTML
    enhanced_html = str(soup)
    
    # 4. 使用优化的 Goose3 配置
    try:
        from goose3.text import StopWordsEnglish
        stopwords_class = StopWordsEnglish
    except ImportError:
        # 回退到基类
        from goose3.text import StopWords
        stopwords_class = StopWords
    
    g = Goose({
        'browser_user_agent': 'Mozilla/5.0',
        'parser_class': 'soup',
        'enable_image_fetching': False,
        'use_meta_language': False,
        'target_language': 'en',  # 英语
        'stopwords_class': stopwords_class,
    })
    
    # 5. 提取内容
    article = g.extract(raw_html=enhanced_html)
    
    # 6. 组合内容
    content_parts = []
    if article.title:
        content_parts.append(article.title)
    if article.meta_description:
        content_parts.append(article.meta_description)
    if article.cleaned_text:
        content_parts.append(article.cleaned_text)
    
    # 7. 如果内容仍为空，从 DOM 直接提取文本
    if not content_parts and soup.body:
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            p_text = p.get_text(strip=True)
            if p_text and len(p_text) > 20:
                content_parts.append(p_text)
    
    # 8. 组合所有部分
    final_content = "\n\n".join(content_parts)
    
    # 9. 清理资源
    g.close()
    
    print(f"增强处理后内容长度: {len(final_content)} 字符")
    print(f"内容预览: {final_content[:200] + '...' if len(final_content) > 200 else final_content}")
    
except Exception as e:
    print(f"✗ 增强测试失败: {e}")
    print(traceback.format_exc())

print("\n测试完成")
