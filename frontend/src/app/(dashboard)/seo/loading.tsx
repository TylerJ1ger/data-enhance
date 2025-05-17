//frontend-new/src/app/(dashboard)/seo/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function SeoLoading() {
  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">单页SEO分析</h1>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 主要内容区 - 使用骨架屏显示加载状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧过滤器面板 */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-2/3" />
                
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-16 rounded" />
                    <Skeleton className="h-16 rounded" />
                    <Skeleton className="h-16 rounded" />
                  </div>
                </div>
                
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
          
          {/* SEO信息卡片 */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Search className="text-muted-foreground mr-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-16 rounded" />
                    <Skeleton className="h-16 rounded" />
                    <Skeleton className="h-16 rounded" />
                  </div>
                </div>
                
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧内容区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* SEO分析结果骨架 */}
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-1/2" /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                  <Skeleton className="h-24 rounded" />
                  <Skeleton className="h-24 rounded" />
                  <Skeleton className="h-24 rounded" />
                </div>
                
                <Skeleton className="h-12 w-full" />
                
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 内容显示骨架 */}
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-2/3" /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}