// 修改 Layout.tsx
import React, { ReactNode } from 'react';
import { FiFileText, FiFilter, FiBarChart2, FiDownload, FiMap, FiSearch, FiLink } from 'react-icons/fi';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = 'CSV Processor Tool' 
}) => {
  const router = useRouter();
  
  // 添加路由判断，确定当前页面
  const isHome = router.pathname === '/';
  const isSitemap = router.pathname === '/sitemap';
  const isSeo = router.pathname === '/seo';
  const isBacklink = router.pathname === '/backlink'; // 新增
  
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="CSV & Sitemap Processing Tool" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <FiFileText className="h-8 w-8 text-primary-600" />
                  <span className="ml-2 text-xl font-bold text-gray-800">
                    数据分析工具
                  </span>
                </div>
                
                {/* 导航链接 - 修改后的Link组件用法 */}
                <nav className="ml-8 flex space-x-4">
                  <Link 
                    href="/" 
                    className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium ${
                      isHome
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <FiBarChart2 className="mr-1 h-4 w-4" />
                    关键词分析
                  </Link>
                  
                  {/* 添加外链分析导航 */}
                  <Link 
                    href="/backlink" 
                    className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium ${
                      isBacklink
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <FiLink className="mr-1 h-4 w-4" />
                    外链分析
                  </Link>
                  
                  <Link 
                    href="/sitemap" 
                    className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium ${
                      isSitemap
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <FiMap className="mr-1 h-4 w-4" />
                    Sitemap分析
                  </Link>
                  
                  <Link 
                    href="/seo" 
                    className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium ${
                      isSeo
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <FiSearch className="mr-1 h-4 w-4" />
                    单页SEO分析
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-grow bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4 text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} CSV & Sitemap Processor Tool
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Layout;