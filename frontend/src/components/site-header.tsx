// frontend/src/components/site-header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  FileTextIcon, 
  LinkIcon, 
  SearchIcon, 
  MapIcon, 
  HomeIcon, 
  BarChart3,
  Code2, // 新增：结构化数据生成器图标
  Menu
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const pathname = usePathname();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* 添加外层包装div以确保内容居中 */}
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          <div className="mr-4 md:flex hidden">
            <Link href="/" className="flex items-center space-x-2">
              <HomeIcon className="h-6 w-6 text-primary" />
              <span className="inline-block font-bold">数据分析工具</span>
            </Link>
          </div>
          
          {/* 移动端显示小屏幕标志 */}
          <div className="mr-4 md:hidden flex">
            <Link href="/" className="flex items-center space-x-2">
              <HomeIcon className="h-6 w-6 text-primary" />
              <span className="inline-block font-bold">数据分析工具</span>
            </Link>
          </div>
          
          {/* 桌面端导航 */}
          <nav className="hidden md:flex gap-6 flex-1">
            <NavItem href="/keyword" icon={<FileTextIcon className="mr-1 h-4 w-4" />} label="关键词分析" />
            <NavItem href="/backlink" icon={<LinkIcon className="mr-1 h-4 w-4" />} label="外链分析" />
            <NavItem href="/orders" icon={<BarChart3 className="mr-1 h-4 w-4" />} label="订单分析" />
            <NavItem href="/sitemap" icon={<MapIcon className="mr-1 h-4 w-4" />} label="Sitemap分析" />
            <NavItem href="/seo" icon={<SearchIcon className="mr-1 h-4 w-4" />} label="单页SEO分析" />
            <NavItem href="/schema" icon={<Code2 className="mr-1 h-4 w-4" />} label="结构化数据生成器" />
          </nav>
          
          {/* 移动端汉堡菜单 */}
          <div className="md:hidden flex ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">打开菜单</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center">
                    <HomeIcon className="mr-2 h-4 w-4" />
                    <span>首页</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/keyword" className="flex items-center">
                    <FileTextIcon className="mr-2 h-4 w-4" />
                    <span>关键词分析</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/backlink" className="flex items-center">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    <span>外链分析</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders" className="flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>订单分析</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/sitemap" className="flex items-center">
                    <MapIcon className="mr-2 h-4 w-4" />
                    <span>Sitemap分析</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/seo" className="flex items-center">
                    <SearchIcon className="mr-2 h-4 w-4" />
                    <span>单页SEO分析</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/schema" className="flex items-center">
                    <Code2 className="mr-2 h-4 w-4" />
                    <span>结构化数据生成器</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

// 导航项组件，用于桌面端导航链接
interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ href, icon, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center text-sm font-medium transition-colors hover:text-foreground",
        isActive 
          ? "text-foreground" 
          : "text-muted-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}