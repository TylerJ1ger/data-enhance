import React, { ReactNode } from 'react';
import { FiFileText, FiFilter, FiBarChart2, FiDownload } from 'react-icons/fi';
import Head from 'next/head';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = 'CSV Processor Tool' 
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="CSV Processing Tool" />
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
                    CSV Processor Tool
                  </span>
                </div>
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
              &copy; {new Date().getFullYear()} CSV Processor Tool
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Layout;