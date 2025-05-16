//frontend-new/src/components/main-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileTextIcon, LinkIcon, SearchIcon, MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
}

const items: NavItem[] = [
  {
    title: "关键词分析",
    href: "/",
    icon: <FileTextIcon className="mr-1 h-4 w-4" />,
    description: "分析和优化关键词数据",
  },
  {
    title: "外链分析",
    href: "/backlink",
    icon: <LinkIcon className="mr-1 h-4 w-4" />,
    description: "分析站外链接和引用域名",
  },
  {
    title: "Sitemap分析",
    href: "/sitemap",
    icon: <MapIcon className="mr-1 h-4 w-4" />,
    description: "分析站点地图结构和URL",
  },
  {
    title: "单页SEO分析",
    href: "/seo",
    icon: <SearchIcon className="mr-1 h-4 w-4" />,
    description: "分析单个页面的SEO表现",
  },
];

interface MainNavProps {
  className?: string;
}

export function MainNav({ className }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-6 md:gap-8", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center text-sm font-medium transition-colors duration-200 hover:text-primary",
            pathname === item.href 
              ? "text-foreground font-semibold border-b-2 border-primary" 
              : "text-muted-foreground"
          )}
          title={item.description}
        >
          {item.icon}
          {item.title}
        </Link>
      ))}
    </nav>
  );
}