// frontend-new/src/app/page.tsx
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Globe, Search, BarChart2, Database } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const tools = [
    {
      title: "关键词分析",
      description: "分析CSV或XLSX文件中的关键词数据，提供筛选、可视化和品牌重叠分析。",
      icon: <FileText className="h-10 w-10 text-primary" />,
      href: "/keyword",
      color: "bg-blue-50"
    },
    {
      title: "外链分析",
      description: "分析外部链接数据，识别引荐域名、URL分布和品牌重叠分析。",
      icon: <BarChart2 className="h-10 w-10 text-primary" />,
      href: "/backlink",
      color: "bg-green-50"
    },
    {
      title: "虚拟订单分析",
      description: "生成虚拟订单数据进行业务分析，支持多维度筛选和图表可视化展示。",
      icon: <Database className="h-10 w-10 text-primary" />,
      href: "/orders",
      color: "bg-rose-50"
    },
    {
      title: "SEO分析",
      description: "上传HTML文件进行单页SEO分析，包括标题、元描述、内容、图片、链接等方面。",
      icon: <Search className="h-10 w-10 text-primary" />,
      href: "/seo",
      color: "bg-purple-50"
    },
    {
      title: "Sitemap分析",
      description: "可视化网站结构，分析URL分布，识别网站架构问题。",
      icon: <Globe className="h-10 w-10 text-primary" />,
      href: "/sitemap",
      color: "bg-amber-50"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">数据分析工具</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          针对SEMRush导出数据衍生的一站式解决方案，帮助您交叉/合并分析导出后的关键词、外链、SEO和网站结构数据，同时支持虚拟订单数据生成与分析
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool, i) => (
          <Card key={i} className={`overflow-hidden border-none ${tool.color}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{tool.title}</CardTitle>
                {tool.icon}
              </div>
              <CardDescription className="text-base">{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={tool.href} passHref>
                <Button className="w-full">进入分析</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}